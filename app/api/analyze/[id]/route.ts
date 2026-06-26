import { NextRequest } from 'next/server'
import { createAnalysisPipeline } from '@/lib/pipeline'
import { supabaseAdmin } from '@/lib/supabase'
import type { AnalysisResult, Application, PipelineContext, SSEEvent } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const { data: app, error } = await supabaseAdmin
    .from('applications')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !app) {
    return new Response('Application not found', { status: 404 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        const { data: existing } = await supabaseAdmin
          .from('analysis_results')
          .select('*')
          .eq('application_id', id)
          .maybeSingle()

        if (existing) {
          emit({
            type: 'pipeline_complete',
            result: existing as AnalysisResult,
            applicationId: id,
          })
          return
        }

        const application = app as Application
        const initial: PipelineContext = {
          applicationId: id,
          rawText: application.raw_text,
          inputType: application.input_type,
        }

        const pipeline = createAnalysisPipeline(id, emit)
        const ctx = await pipeline.run(initial)

        if (
          ctx.baseScore === undefined ||
          ctx.llmDelta === undefined ||
          ctx.finalRiskScore === undefined ||
          !ctx.riskCategory ||
          !ctx.recommendation ||
          !ctx.biasFactors ||
          !ctx.keyFactors ||
          !ctx.explanation
        ) {
          throw new Error('Pipeline finished with missing fields on context')
        }

        const { data: result, error: saveErr } = await supabaseAdmin
          .from('analysis_results')
          .insert({
            application_id: id,
            risk_score: ctx.finalRiskScore,
            risk_category: ctx.riskCategory,
            recommendation: ctx.recommendation,
            confidence: ctx.confidence ?? 'Medium',
            base_score: ctx.baseScore,
            llm_delta: ctx.llmDelta,
            key_factors: ctx.keyFactors,
            explanation: ctx.explanation,
            bias_factors: ctx.biasFactors,
          })
          .select()
          .single()

        if (saveErr || !result) {
          throw new Error(`Failed to save result: ${saveErr?.message ?? 'missing result row'}`)
        }

        await supabaseAdmin
          .from('applications')
          .update({
            status: 'complete',
            applicant_name: ctx.extractedName ?? 'Unknown Applicant',
          })
          .eq('id', id)

        emit({
          type: 'pipeline_complete',
          result: result as AnalysisResult,
          applicationId: id,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error('[pipeline]', msg)
        await supabaseAdmin
          .from('applications')
          .update({ status: 'failed', error_message: msg })
          .eq('id', id)
        emit({ type: 'pipeline_failed', error: msg, applicationId: id })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
