import type { Confidence, PipelineContext, PipelineStage } from '@/lib/types'

/**
 * Stage 1: pure document characterization before any AI call runs.
 */
export class DocumentParserStage implements PipelineStage {
  readonly name = 'DocumentParser'
  readonly timeoutMs = 5_000

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    const text = ctx.rawText.trim()
    const wordCount = text.split(/\s+/).filter(Boolean).length

    const confidence: Confidence =
      wordCount > 300 ? 'High' : wordCount >= 100 ? 'Medium' : 'Low'

    const isUsable = wordCount >= 20
    if (!isUsable) {
      throw new Error('Application text is too short for meaningful analysis.')
    }

    const nameMatch = text.slice(0, 300).match(
      /(?:applicant\s*name|name)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
    )

    return {
      ...ctx,
      wordCount,
      confidence,
      isUsable,
      extractedName: nameMatch?.[1]?.trim(),
    }
  }
}
