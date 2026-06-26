export type ApplicationStatus =
  | 'queued'
  | 'parsing'
  | 'scoring'
  | 'analyzing_bias'
  | 'explaining'
  | 'complete'
  | 'failed'

export type RiskCategory = 'Low' | 'Medium' | 'High'
export type Recommendation = 'Approve' | 'Review' | 'Decline'
export type Confidence = 'High' | 'Medium' | 'Low'
export type InputType = 'pdf' | 'form'

export interface BiasFactors {
  gender: number
  location: number
  income: number
  age: number
  overall: number
}

export interface Application {
  id: string
  input_hash: string
  applicant_name: string | null
  input_type: InputType
  raw_text: string
  file_url: string | null
  status: ApplicationStatus
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface AnalysisResult {
  id: string
  application_id: string
  risk_score: number
  risk_category: RiskCategory
  recommendation: Recommendation
  confidence: Confidence
  base_score: number
  llm_delta: number
  key_factors: string[]
  explanation: string
  bias_factors: BiasFactors
  created_at: string
  applications?: {
    id: string
    applicant_name: string | null
    input_type: InputType
    status: ApplicationStatus
    created_at: string
  }
}

export interface PipelineStageLog {
  id: string
  application_id: string
  stage_name: string
  status: 'started' | 'complete' | 'failed'
  duration_ms: number | null
  error: string | null
  created_at: string
}

export interface PipelineContext {
  applicationId: string
  rawText: string
  inputType: InputType

  wordCount?: number
  extractedName?: string
  confidence?: Confidence
  isUsable?: boolean

  baseScore?: number
  llmDelta?: number
  finalRiskScore?: number
  riskCategory?: RiskCategory
  recommendation?: Recommendation

  biasFactors?: BiasFactors

  keyFactors?: string[]
  explanation?: string
}

export interface PipelineStage {
  readonly name: string
  readonly timeoutMs: number
  execute(context: PipelineContext): Promise<PipelineContext>
}

export type SSEEventType =
  | 'stage_started'
  | 'stage_complete'
  | 'stage_failed'
  | 'pipeline_complete'
  | 'pipeline_failed'

export interface SSEEvent {
  type: SSEEventType
  stageName?: string
  durationMs?: number
  error?: string
  result?: AnalysisResult
  applicationId?: string
}

export interface SubmitResponse {
  applicationId: string
  cached: boolean
}

export interface LoanApplicationForm {
  name: string
  age: string
  annualIncome: string
  employmentType: 'Salaried' | 'Self-Employed' | 'Business Owner' | 'Freelancer' | 'Unemployed'
  loanAmount: string
  loanPurpose: 'Home Purchase' | 'Education' | 'Business Loan' | 'Vehicle' | 'Medical Emergency' | 'Personal' | 'Other'
  creditScore: string
  existingDebts: string
  employmentYears: string
}

export interface HistoryResult {
  risk_score: number
  risk_category: RiskCategory
  recommendation: Recommendation
  bias_factors: BiasFactors
}

export interface HistoryRow {
  id: string
  applicant_name: string | null
  input_type: InputType
  status: ApplicationStatus
  created_at: string
  analysis_results: HistoryResult[]
}
