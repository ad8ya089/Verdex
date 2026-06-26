import { callGemini } from '@/lib/gemini'
import type { PipelineContext, PipelineStage } from '@/lib/types'

/**
 * Stage 4: grounded explanation using the scores already computed upstream.
 */
export class ExplainerStage implements PipelineStage {
  readonly name = 'Explainer'
  readonly timeoutMs = 25_000

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    const prompt = `
You are a loan analyst writing a summary for an applicant.

Scores already computed. Treat them as ground truth:
Risk Score: ${ctx.finalRiskScore}/100 (${ctx.riskCategory})
Recommendation: ${ctx.recommendation}
Bias signals: gender=${ctx.biasFactors?.gender}% location=${ctx.biasFactors?.location}% income=${ctx.biasFactors?.income}% age=${ctx.biasFactors?.age}%

From the application text:
1. Extract the applicant's full name. If not clearly present, return "Unknown Applicant".
2. List exactly 3 key factors that most influenced the risk score. Use actual numbers from the text where present.
3. Write a 2-3 sentence plain-language explanation of the recommendation.

Return ONLY raw JSON:
{
  "applicantName": "<string>",
  "keyFactors": ["<factor 1>", "<factor 2>", "<factor 3>"],
  "explanation": "<2-3 sentences>"
}

Application:
${ctx.rawText.slice(0, 2500)}
    `.trim()

    const raw = await callGemini(prompt, undefined, 23_000)
    const parsed = JSON.parse(raw) as {
      applicantName?: string
      keyFactors?: unknown
      explanation?: unknown
    }

    if (!Array.isArray(parsed.keyFactors) || parsed.keyFactors.length !== 3) {
      throw new Error('ExplainerStage: keyFactors must be exactly 3 strings')
    }
    if (parsed.keyFactors.some((item) => typeof item !== 'string')) {
      throw new Error('ExplainerStage: keyFactors must be strings')
    }
    if (typeof parsed.explanation !== 'string' || parsed.explanation.length < 20) {
      throw new Error('ExplainerStage: explanation missing or too short')
    }

    return {
      ...ctx,
      extractedName: parsed.applicantName ?? ctx.extractedName ?? 'Unknown Applicant',
      keyFactors: parsed.keyFactors,
      explanation: parsed.explanation,
    }
  }
}
