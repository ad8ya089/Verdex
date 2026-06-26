import { Pipeline } from './Pipeline'
import { BiasAnalyzerStage } from './stages/BiasAnalyzerStage'
import { DocumentParserStage } from './stages/DocumentParserStage'
import { ExplainerStage } from './stages/ExplainerStage'
import { RiskScorerStage } from './stages/RiskScorerStage'
import type { SSEEvent } from '@/lib/types'

export function createAnalysisPipeline(
  applicationId: string,
  emit: (event: SSEEvent) => void
): Pipeline {
  return new Pipeline(
    [
      new DocumentParserStage(),
      { parallel: true, stages: [new RiskScorerStage(), new BiasAnalyzerStage()] },
      new ExplainerStage(),
    ],
    applicationId,
    emit
  )
}

export { Pipeline }
