import { type NextRequest, NextResponse } from 'next/server'
import { callGemini } from '@/lib/gemini'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

const systemInstruction =
  'You are Vera, Verdex loan analysis assistant. Be concise (2-4 sentences), empathetic, jargon-free. Never give personal financial advice. Redirect off-topic questions politely.'

export async function POST(request: NextRequest) {
  try {
    const { message, applicationId } = (await request.json()) as {
      message?: string
      applicationId?: string
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    let context = ''
    if (applicationId) {
      const { data } = await supabaseAdmin
        .from('analysis_results')
        .select('risk_score, risk_category, recommendation, key_factors, explanation, bias_factors')
        .eq('application_id', applicationId)
        .single()

      if (data) {
        const keyFactors = Array.isArray(data.key_factors) ? data.key_factors.join('; ') : ''
        const bias = data.bias_factors as { overall?: number } | null
        context = `Current analysis: Risk ${data.risk_score}/100 (${data.risk_category}), Recommendation: ${data.recommendation}, Key factors: ${keyFactors}, Overall bias risk: ${bias?.overall ?? 0}%.`
      }
    }

    const fullPrompt = context
      ? `${context}\n\nUser: ${message}`
      : message

    const response = await callGemini(fullPrompt, systemInstruction)

    return NextResponse.json({ response })
  } catch (error) {
    console.error('[/api/chat]', error)
    return NextResponse.json(
      { response: 'Vera is unavailable. Please try again.' },
      { status: 500 }
    )
  }
}
