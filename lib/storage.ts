export interface AnalysisResult {
  id: string
  timestamp: number
  applicantName: string
  riskScore: number
  riskCategory: 'Low' | 'Medium' | 'High'
  recommendation: 'Approve' | 'Review' | 'Decline'
  keyFactors: string[]
  explanation: string
  confidence?: 'High' | 'Medium' | 'Low'
  biasFactors: {
    gender: number
    location: number
    income: number
    age: number
    overall: number
  }
}

const STORAGE_PREFIX = 'verdex_analysis_'

export function saveAnalysis(data: Omit<AnalysisResult, 'id' | 'timestamp'>): string {
  const id = Date.now().toString()
  const record: AnalysisResult = { ...data, id, timestamp: Date.now() }
  localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(record))
  return id
}

export function getAnalysis(id: string): AnalysisResult | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${id}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getAllAnalyses(): AnalysisResult[] {
  const results: AnalysisResult[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_PREFIX)) {
      try {
        const raw = localStorage.getItem(key)
        if (raw) results.push(JSON.parse(raw))
      } catch {
        // Skip corrupted entries.
      }
    }
  }
  return results.sort((a, b) => b.timestamp - a.timestamp)
}

export function clearAllAnalyses(): void {
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(STORAGE_PREFIX)) keysToRemove.push(key)
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key))
}
