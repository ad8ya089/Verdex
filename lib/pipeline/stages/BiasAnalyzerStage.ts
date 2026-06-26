import { callGemini } from '@/lib/gemini'
import type { BiasFactors, PipelineContext, PipelineStage } from '@/lib/types'

/**
 * Stage 3: independent fairness audit. This runs in parallel with RiskScorer.
 */
export class BiasAnalyzerStage implements PipelineStage {
  readonly name = 'BiasAnalyzer'
  readonly timeoutMs = 20_000

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    const prompt = `
You are a fairness auditor. Analyze this loan application text for demographic bias signals.
Return ONLY raw JSON with integer scores from 0 to 100:
{ "gender": <int>, "location": <int>, "income": <int>, "age": <int> }

Application:
${ctx.rawText.slice(0, 2000)}
    `.trim()

    try {
      const raw = await callGemini(prompt, undefined, 18_000)
      const parsed = JSON.parse(raw) as Partial<Omit<BiasFactors, 'overall'>>
      const fields = ['gender', 'location', 'income', 'age'] as const
      const normalized: Omit<BiasFactors, 'overall'> = {
        gender: 0,
        location: 0,
        income: 0,
        age: 0,
      }

      for (const field of fields) {
        const value = parsed[field]
        if (typeof value !== 'number' || value < 0 || value > 100) {
          throw new Error(`BiasAnalyzer: invalid field ${field}`)
        }
        normalized[field] = Math.round(value)
      }

      const overall = Math.round(
        (normalized.gender + normalized.location + normalized.income + normalized.age) / 4
      )

      return { ...ctx, biasFactors: { ...normalized, overall } }
    } catch {
      return {
        ...ctx,
        biasFactors: { gender: 0, location: 0, income: 0, age: 0, overall: 0 },
      }
    }
  }
}
