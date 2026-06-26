'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageCircle,
  Users,
  MapPin,
  DollarSign,
  TrendingUp,
  Download,
  Share2,
  HelpCircle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { AnalysisResult, Confidence, Recommendation, RiskCategory, SSEEvent } from '@/lib/types'

type StageStatus = 'pending' | 'running' | 'complete' | 'failed'

interface StageState {
  name: string
  label: string
  status: StageStatus
  durationMs?: number
}

const initialStages: StageState[] = [
  { name: 'DocumentParser', label: 'Parsing Document', status: 'pending' },
  { name: 'RiskScorer', label: 'Scoring Risk', status: 'pending' },
  { name: 'BiasAnalyzer', label: 'Analyzing Bias', status: 'pending' },
  { name: 'Explainer', label: 'Generating Explanation', status: 'pending' },
]

export default function AnalysisPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [pageStatus, setPageStatus] = useState<'loading' | 'complete' | 'failed'>('loading')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stages, setStages] = useState<StageState[]>(initialStages)

  const updateStage = (name: string, updates: Partial<StageState>) => {
    setStages((prev) => prev.map((stage) => (stage.name === name ? { ...stage, ...updates } : stage)))
  }

  useEffect(() => {
    if (!id) return

    let cancelled = false
    let eventSource: EventSource | null = null

    const load = async () => {
      try {
        const existing = await fetch(`/api/results/${id}`, { cache: 'no-store' })
        if (cancelled) return

        if (existing.ok) {
          const data = await existing.json()
          setResult(data)
          setStages((prev) => prev.map((stage) => ({ ...stage, status: 'complete' })))
          setPageStatus('complete')
          return
        }

        eventSource = new EventSource(`/api/analyze/${id}`)
        eventSource.onmessage = (message) => {
          if (cancelled) return

          const event = JSON.parse(message.data) as SSEEvent

          if (event.type === 'stage_started' && event.stageName) {
            updateStage(event.stageName, { status: 'running' })
          }
          if (event.type === 'stage_complete' && event.stageName) {
            updateStage(event.stageName, { status: 'complete', durationMs: event.durationMs })
          }
          if (event.type === 'stage_failed' && event.stageName) {
            updateStage(event.stageName, { status: 'failed', durationMs: event.durationMs })
          }
          if (event.type === 'pipeline_complete' && event.result) {
            setResult(event.result)
            setPageStatus('complete')
            eventSource?.close()
          }
          if (event.type === 'pipeline_failed') {
            setError(event.error ?? 'Pipeline failed')
            setPageStatus('failed')
            eventSource?.close()
          }
        }

        eventSource.onerror = () => {
          if (cancelled) return
          setError('Lost connection to server.')
          setPageStatus('failed')
          eventSource?.close()
        }
      } catch {
        if (!cancelled) {
          setError('Could not load analysis.')
          setPageStatus('failed')
        }
      }
    }

    load()

    return () => {
      cancelled = true
      eventSource?.close()
    }
  }, [id])

  const getRiskColor = (score: number) => {
    if (score <= 35) return 'text-green-600'
    if (score <= 65) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRiskIcon = (category: RiskCategory) => {
    if (category === 'Low') return <CheckCircle className="h-5 w-5 text-green-600" />
    if (category === 'Medium') return <AlertTriangle className="h-5 w-5 text-yellow-600" />
    return <XCircle className="h-5 w-5 text-red-600" />
  }

  const getRecommendationClass = (recommendation: Recommendation) => {
    if (recommendation === 'Approve') return 'bg-green-50 text-green-700 border-green-200'
    if (recommendation === 'Review') return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    return 'bg-red-50 text-red-700 border-red-200'
  }

  const getConfidenceBadge = (confidence?: Confidence) => {
    switch (confidence) {
      case 'High':
        return <Badge className="bg-green-100 text-green-700 border-green-200">High Confidence</Badge>
      case 'Medium':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Medium Confidence</Badge>
      case 'Low':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Low Confidence - limited data</Badge>
      default:
        return null
    }
  }

  if (pageStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Analyzing Application</h2>
          <p className="mb-8 text-sm text-gray-500">Vera is running the 4-stage AI pipeline...</p>

          <div className="space-y-4">
            {stages.map((stage, index) => (
              <div key={stage.name} className="flex items-center gap-4">
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    stage.status === 'complete'
                      ? 'bg-green-100 text-green-600'
                      : stage.status === 'running'
                        ? 'bg-blue-100 text-blue-600'
                        : stage.status === 'failed'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {stage.status === 'complete' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : stage.status === 'failed' ? (
                    <XCircle className="h-4 w-4" />
                  ) : stage.status === 'running' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    index + 1
                  )}
                </div>

                <div className="flex-1">
                  <p className={`text-sm font-medium ${stage.status === 'pending' ? 'text-gray-400' : 'text-gray-900'}`}>
                    {stage.label}
                  </p>
                  {stage.durationMs !== undefined && (
                    <p className="text-xs text-gray-400">{stage.durationMs}ms</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (pageStatus === 'failed' || !result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md p-8 text-center shadow-sm transition-shadow hover:shadow-md">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold text-gray-900">Analysis unavailable</h2>
          <p className="mb-6 text-sm text-gray-600">{error ?? 'This analysis could not be loaded.'}</p>
          <Button asChild>
            <Link href="/">Go to Homepage</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const applicantName = result.applications?.applicant_name ?? 'Unknown Applicant'

  const downloadReport = () => {
    const content = `
VERDEX - LOAN ANALYSIS REPORT
==============================
Date: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}
Applicant: ${applicantName}

RISK ASSESSMENT
---------------
Risk Score: ${result.risk_score}/100 (${result.risk_category} Risk)
Recommendation: ${result.recommendation}
Confidence: ${result.confidence}
Deterministic Base: ${result.base_score}/100
AI Adjustment: ${result.llm_delta}

KEY FACTORS
-----------
${result.key_factors.map((factor) => `- ${factor}`).join('\n')}

EXPLANATION
-----------
${result.explanation}

BIAS ASSESSMENT
---------------
Gender Bias Risk:   ${result.bias_factors.gender}%
Location Bias Risk: ${result.bias_factors.location}%
Income Bias Risk:   ${result.bias_factors.income}%
Age Bias Risk:      ${result.bias_factors.age}%
Overall Bias Risk:  ${result.bias_factors.overall}%

==============================
Generated by Verdex
    `.trim()

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `verdex-report-${id}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const shareAnalysis = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    } catch {
      toast.error('Unable to copy link right now.')
    }
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Loan Analysis Results</h1>
              <p className="text-sm text-gray-600">Analysis ID: {id}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={downloadReport}>
                <Download className="h-4 w-4" />
                Download Report
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" className="gap-2" onClick={shareAnalysis}>
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy analysis link</TooltipContent>
              </Tooltip>
              <Button className="gap-2" onClick={() => router.push(`/chatbot?id=${id}`)}>
                <MessageCircle className="h-4 w-4" />
                Chat with Vera
              </Button>
            </div>
          </div>

          <Separator className="mb-6" />

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="bias">Bias Analysis</TabsTrigger>
              <TabsTrigger value="factors">Key Factors</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                <Card className="shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getRiskIcon(result.risk_category)}
                      Risk Score
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <HelpCircle className="h-4 w-4 text-gray-500" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Risk Score Guide</DialogTitle>
                          </DialogHeader>
                          <pre className="whitespace-pre-wrap text-sm text-gray-700">
{`Risk Score Guide
0-35   Low Risk     -> Strong application. Likely to be approved.
36-65  Medium Risk  -> Mixed signals. Manual review recommended.
66-100 High Risk    -> Significant concerns. High chance of decline.

Bias Score Guide
0-20   Low     -> Minimal demographic influence detected
21-40  Medium  -> Some factors may need review
41-100 High    -> Potential bias detected. Human review advised

Verdex scores are AI-generated estimates, not official credit decisions.`}
                          </pre>
                        </DialogContent>
                      </Dialog>
                    </CardTitle>
                    <CardDescription>Applicant: {applicantName}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 md:grid-cols-3">
                    <div className="text-center">
                      <p className={`text-6xl font-black ${getRiskColor(result.risk_score)}`}>
                        {result.risk_score}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">out of 100</p>
                      <Progress value={result.risk_score} className="mt-3" />
                    </div>
                    <div className="space-y-3 text-center">
                      <Badge className="px-4 py-2 text-base">{result.risk_category} Risk</Badge>
                      <p className="text-sm text-gray-600">Risk Category</p>
                      {getConfidenceBadge(result.confidence)}
                    </div>
                    <div className="space-y-3 text-center">
                      <Badge
                        variant="outline"
                        className={`border px-4 py-2 text-base ${getRecommendationClass(result.recommendation)}`}
                      >
                        {result.recommendation}
                      </Badge>
                      <p className="text-sm text-gray-600">Recommendation</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-500">Score Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Deterministic Base</span>
                      <span className="font-mono font-bold text-gray-900">{result.base_score}/100</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">AI Adjustment</span>
                      <span
                        className={`font-mono font-bold ${
                          result.llm_delta > 0
                            ? 'text-red-500'
                            : result.llm_delta < 0
                              ? 'text-green-600'
                              : 'text-gray-400'
                        }`}
                      >
                        {result.llm_delta > 0 ? '+' : ''}
                        {result.llm_delta}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="font-medium text-gray-900">Final Score</span>
                      <span className="font-mono text-xl font-black text-gray-900">{result.risk_score}/100</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle>Verdex Explanation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-gray-700">{result.explanation}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bias" className="space-y-6">
              <Card className="shadow-sm transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle>Bias Analysis</CardTitle>
                  <CardDescription>Bias risk across major demographic dimensions.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-blue-600" />
                      <div className="w-full">
                        <div className="mb-1 flex justify-between text-sm">
                          <span>Gender</span>
                          <span>{result.bias_factors.gender}%</span>
                        </div>
                        <Progress value={result.bias_factors.gender} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <div className="w-full">
                        <div className="mb-1 flex justify-between text-sm">
                          <span>Location</span>
                          <span>{result.bias_factors.location}%</span>
                        </div>
                        <Progress value={result.bias_factors.location} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-4 w-4 text-yellow-600" />
                      <div className="w-full">
                        <div className="mb-1 flex justify-between text-sm">
                          <span>Income</span>
                          <span>{result.bias_factors.income}%</span>
                        </div>
                        <Progress value={result.bias_factors.income} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      <div className="w-full">
                        <div className="mb-1 flex justify-between text-sm">
                          <span>Age</span>
                          <span>{result.bias_factors.age}%</span>
                        </div>
                        <Progress value={result.bias_factors.age} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-5xl font-black text-blue-700">{result.bias_factors.overall}%</p>
                      <p className="mt-2 text-sm text-gray-600">Overall Bias Risk</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="factors">
              <Card className="shadow-sm transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle>Key Factors</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {result.key_factors.map((factor, index) => (
                      <li key={`${factor}-${index}`} className="flex items-start gap-2 text-gray-700">
                        <CheckCircle className="mt-0.5 h-4 w-4 text-green-600" />
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  )
}
