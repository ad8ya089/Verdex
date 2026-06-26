import { callGemini } from '@/lib/gemini'
import type { PipelineContext, PipelineStage, Recommendation, RiskCategory } from '@/lib/types'

/**
 * Stage 2: hybrid risk scoring.
 *
 * Base score is deterministic and auditable. Gemini only contributes a bounded
 * delta in the range -15..15 so it can nuance, not override, the formula.
 */
export class RiskScorerStage implements PipelineStage {
  readonly name = 'RiskScorer'
  readonly timeoutMs = 20_000

  private readonly signals: [RegExp, number][] = [
    [/unemployed|no\s+income|zero\s+income/i, +18],
    [/default(?:ed)?|bankruptcy|bankrupt/i, +20],
    [/late\s+payment|missed\s+payment|overdue/i, +12],
    [/credit\s+score[:\s]+[1-5]\d{2}/i, +15],
    [/debt[:\s]+(?:rs\.?|inr)?\s*[\d,]{6,}/i, +10],
    [/credit\s+score[:\s]+[7-9]\d{2}/i, -15],
    [/salaried|permanent\s+employee/i, -8],
    [/(?:years?\s+of\s+)?(?:experience|employment|current\s+job)[:\s]+[5-9]\d*/i, -6],
    [/no\s+(?:existing\s+)?debt|debt.{0,10}(?:zero|nil|0)/i, -10],
    [/savings[:\s]+(?:rs\.?|inr)?\s*[\d,]{6,}/i, -8],
    [/self.?employed|freelance/i, +5],
    [/loan\s+amount(?:\s+requested)?[:\s]+(?:rs\.?|inr)?\s*[\d,]{7,}/i, +8],
  ]

  private computeBase(text: string): number {
    let score = 50
    for (const [pattern, impact] of this.signals) {
      if (pattern.test(text)) score += impact
    }
    return Math.max(0, Math.min(100, score))
  }

  private async computeDelta(text: string, baseScore: number): Promise<number> {
    const prompt = `
A deterministic scoring system assigned a base risk score of ${baseScore}/100 to this loan application.
Return ONLY a single integer between -15 and 15. Use soft qualitative signals the formula may have missed, such as application quality, income to loan consistency, and employment stability. No explanation.

Application:
${text.slice(0, 1500)}
    `.trim()

    try {
      const raw = await callGemini(prompt, undefined, 15_000)
      const delta = parseInt(raw.match(/-?\d+/)?.[0] ?? '0', 10)
      return Math.max(-15, Math.min(15, Number.isNaN(delta) ? 0 : delta))
    } catch {
      return 0
    }
  }

  private classify(score: number): { riskCategory: RiskCategory; recommendation: Recommendation } {
    if (score <= 35) return { riskCategory: 'Low', recommendation: 'Approve' }
    if (score <= 65) return { riskCategory: 'Medium', recommendation: 'Review' }
    return { riskCategory: 'High', recommendation: 'Decline' }
  }

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    const baseScore = this.computeBase(ctx.rawText)
    const llmDelta = await this.computeDelta(ctx.rawText, baseScore)
    const finalRiskScore = Math.max(0, Math.min(100, baseScore + llmDelta))
    const { riskCategory, recommendation } = this.classify(finalRiskScore)

    return {
      ...ctx,
      baseScore,
      llmDelta,
      finalRiskScore,
      riskCategory,
      recommendation,
    }
  }
}
