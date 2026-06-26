"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { HistoryRow, Recommendation, RiskCategory } from "@/lib/types"

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<HistoryRow[]>([])
  const router = useRouter()

  useEffect(() => {
    fetch("/api/history")
      .then((response) => (response.ok ? response.json() : []))
      .then(setAnalyses)
      .catch(() => setAnalyses([]))
  }, [])

  const getRiskBadgeClass = (risk: RiskCategory) => {
    if (risk === "Low") return "bg-green-100 text-green-700 border-green-200"
    if (risk === "Medium") return "bg-yellow-100 text-yellow-700 border-yellow-200"
    return "bg-red-100 text-red-700 border-red-200"
  }

  const getRecommendationClass = (value: Recommendation) => {
    if (value === "Approve") return "text-green-700"
    if (value === "Review") return "text-yellow-700"
    return "text-red-700"
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Analysis History</h1>
            <p className="text-gray-600">Completed loan applications stored in Supabase</p>
          </div>
        </div>

        {analyses.length === 0 ? (
          <Card className="p-12 text-center shadow-sm hover:shadow-md transition-shadow">
            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No analyses yet</h3>
            <p className="text-gray-500 mb-6">Analyses you run will appear here</p>
            <Button asChild variant="outline">
              <Link href="/">Analyze a Loan</Link>
            </Button>
          </Card>
        ) : (
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead>Bias Risk</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyses.map((analysis) => {
                  const result = analysis.analysis_results[0]
                  if (!result) return null

                  return (
                    <TableRow key={analysis.id}>
                      <TableCell>{new Date(analysis.created_at).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell>{analysis.applicant_name ?? "Unknown Applicant"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getRiskBadgeClass(result.risk_category)}>
                          {result.risk_score} ({result.risk_category})
                        </Badge>
                      </TableCell>
                      <TableCell className={getRecommendationClass(result.recommendation)}>
                        {result.recommendation}
                      </TableCell>
                      <TableCell>{result.bias_factors.overall}%</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => router.push(`/analysis/${analysis.id}`)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  )
}
