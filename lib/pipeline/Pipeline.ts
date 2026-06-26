import { supabaseAdmin } from '@/lib/supabase'
import type { ApplicationStatus, PipelineContext, PipelineStage, SSEEvent } from '@/lib/types'

export interface ParallelGroup {
  parallel: true
  stages: PipelineStage[]
}

export type PipelineStep = PipelineStage | ParallelGroup

const statusByStage: Record<string, ApplicationStatus> = {
  DocumentParser: 'parsing',
  RiskScorer: 'scoring',
  BiasAnalyzer: 'analyzing_bias',
  Explainer: 'explaining',
}

/**
 * Chain of Responsibility pipeline. Each stage receives and returns context.
 * Parallel groups use Promise.allSettled so independent work can complete even
 * when a sibling stage fails.
 */
export class Pipeline {
  constructor(
    private steps: PipelineStep[],
    private applicationId: string,
    private emit: (event: SSEEvent) => void = () => {}
  ) {}

  private async logStage(
    stageName: string,
    status: 'started' | 'complete' | 'failed',
    durationMs?: number,
    error?: string
  ) {
    await supabaseAdmin.from('pipeline_stage_logs').insert({
      application_id: this.applicationId,
      stage_name: stageName,
      status,
      duration_ms: durationMs ?? null,
      error: error ?? null,
    })
  }

  private async setStatus(status: ApplicationStatus, errorMessage?: string) {
    await supabaseAdmin
      .from('applications')
      .update({ status, ...(errorMessage ? { error_message: errorMessage } : {}) })
      .eq('id', this.applicationId)
  }

  private async runStage(stage: PipelineStage, ctx: PipelineContext): Promise<PipelineContext> {
    const start = Date.now()
    const nextStatus = statusByStage[stage.name]
    if (nextStatus) await this.setStatus(nextStatus)

    this.emit({ type: 'stage_started', stageName: stage.name })
    await this.logStage(stage.name, 'started')

    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${stage.name} timed out after ${stage.timeoutMs}ms`)),
        stage.timeoutMs
      )
    })

    try {
      const newCtx = await Promise.race([stage.execute(ctx), timeout])
      const durationMs = Date.now() - start
      this.emit({ type: 'stage_complete', stageName: stage.name, durationMs })
      await this.logStage(stage.name, 'complete', durationMs)
      return newCtx
    } catch (err) {
      const durationMs = Date.now() - start
      const msg = err instanceof Error ? err.message : 'Unknown error'
      this.emit({ type: 'stage_failed', stageName: stage.name, durationMs, error: msg })
      await this.logStage(stage.name, 'failed', durationMs, msg)
      throw err
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  async run(initial: PipelineContext): Promise<PipelineContext> {
    let ctx = initial

    for (const step of this.steps) {
      if ('parallel' in step && step.parallel) {
        const settled = await Promise.allSettled(
          step.stages.map((stage) => this.runStage(stage, ctx))
        )

        for (const result of settled) {
          if (result.status === 'fulfilled') {
            ctx = { ...ctx, ...result.value }
          } else {
            console.error('Parallel stage rejected:', result.reason)
          }
        }
      } else {
        const stage = step as PipelineStage
        try {
          ctx = await this.runStage(stage, ctx)
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error'
          await this.setStatus('failed', msg)
          this.emit({ type: 'pipeline_failed', error: msg })
          throw err
        }
      }
    }

    return ctx
  }
}
