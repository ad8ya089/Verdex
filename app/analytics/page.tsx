"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Users, FileText, AlertTriangle, BarChart2 } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import type { HistoryRow } from "@/lib/types"

const riskColors = {
  Low: "#10B981",
  Medium: "#F59E0B",
  High: "#EF4444",
}

function monthLabel(date: Date) {
  return date.toLocaleString("en-IN", { month: "short" })
}

export default function AnalyticsPage() {
  const [analyses, setAnalyses] = useState<HistoryRow[]>([])

  useEffect(() => {
    fetch("/api/history")
      .then((response) => (response.ok ? response.json() : []))
      .then(setAnalyses)
      .catch(() => setAnalyses([]))
  }, [])

  const completed = useMemo(
    () =>
      analyses
        .map((analysis) => ({ analysis, result: analysis.analysis_results[0] }))
        .filter((item) => item.result),
    [analyses]
  )

  const hasAnalyses = completed.length > 0

  const stats = useMemo(() => {
    if (!hasAnalyses) {
      return {
        totalAnalyses: "0",
        approvalRate: "0%",
        avgRiskScore: "0",
        biasIncidents: "0",
      }
    }

    const approved = completed.filter((item) => item.result.recommendation === "Approve").length
    const avgRiskScore =
      completed.reduce((sum, item) => sum + item.result.risk_score, 0) / completed.length
    const biasIncidents = completed.filter((item) => item.result.bias_factors.overall > 40).length

    return {
      totalAnalyses: completed.length.toString(),
      approvalRate: `${Math.round((approved / completed.length) * 100)}%`,
      avgRiskScore: avgRiskScore.toFixed(0),
      biasIncidents: biasIncidents.toString(),
    }
  }, [completed, hasAnalyses])

  const riskDistribution = useMemo(() => {
    const counts = { Low: 0, Medium: 0, High: 0 }
    completed.forEach((item) => {
      counts[item.result.risk_category] += 1
    })

    return [
      { name: "Low Risk", value: counts.Low, color: riskColors.Low },
      { name: "Medium Risk", value: counts.Medium, color: riskColors.Medium },
      { name: "High Risk", value: counts.High, color: riskColors.High },
    ]
  }, [completed])

  const monthlyAnalyses = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, offset) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - offset))
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        month: monthLabel(date),
        analyses: 0,
        approved: 0,
        denied: 0,
      }
    })

    completed.forEach((item) => {
      const date = new Date(item.analysis.created_at)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      const bucket = months.find((month) => month.key === key)
      if (!bucket) return

      bucket.analyses += 1
      if (item.result.recommendation === "Approve") bucket.approved += 1
      if (item.result.recommendation === "Decline") bucket.denied += 1
    })

    return months
  }, [completed])

  const biasMetrics = useMemo(() => {
    if (!hasAnalyses) {
      return [
        { factor: "Gender", score: 0 },
        { factor: "Location", score: 0 },
        { factor: "Income", score: 0 },
        { factor: "Age", score: 0 },
      ]
    }

    const totals = completed.reduce(
      (acc, item) => {
        acc.gender += item.result.bias_factors.gender
        acc.location += item.result.bias_factors.location
        acc.income += item.result.bias_factors.income
        acc.age += item.result.bias_factors.age
        return acc
      },
      { gender: 0, location: 0, income: 0, age: 0 }
    )

    return [
      { factor: "Gender", score: Math.round(totals.gender / completed.length) },
      { factor: "Location", score: Math.round(totals.location / completed.length) },
      { factor: "Income", score: Math.round(totals.income / completed.length) },
      { factor: "Age", score: Math.round(totals.age / completed.length) },
    ]
  }, [completed, hasAnalyses])

  const performanceMetrics = useMemo(
    () => [
      { metric: "Total Analyses", value: stats.totalAnalyses, icon: FileText },
      { metric: "Approval Rate", value: stats.approvalRate, icon: TrendingUp },
      { metric: "Avg Risk Score", value: stats.avgRiskScore, icon: AlertTriangle },
      { metric: "Bias Incidents", value: stats.biasIncidents, icon: Users },
    ],
    [stats]
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600">Comprehensive insights into loan evaluation performance</p>
            </div>
          </div>
        </div>

        {!hasAnalyses && (
          <Card className="p-12 text-center mb-8 shadow-sm hover:shadow-md transition-shadow">
            <BarChart2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Run your first analysis to see stats here</h3>
            <p className="text-gray-500 mb-6">Analytics metrics update after each completed loan review.</p>
            <Button asChild variant="outline">
              <Link href="/">Analyze a Loan</Link>
            </Button>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {performanceMetrics.map((metric) => {
            const Icon = metric.icon
            return (
              <Card key={metric.metric} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{metric.metric}</p>
                      <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                    </div>
                    <Icon className="h-8 w-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Risk Distribution</CardTitle>
              <CardDescription>Distribution of loan applications by risk category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {riskDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Monthly Analysis Trend</CardTitle>
              <CardDescription>Number of loan analyses over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyAnalyses}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="analyses" stroke="#3B82F6" strokeWidth={2} />
                  <Line type="monotone" dataKey="approved" stroke="#10B981" strokeWidth={2} />
                  <Line type="monotone" dataKey="denied" stroke="#EF4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Bias Detection Metrics</CardTitle>
              <CardDescription>Average bias scores across demographic factors</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={biasMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="factor" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="score" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Monthly Approvals vs Declines</CardTitle>
              <CardDescription>Comparison of approved and declined applications</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyAnalyses}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="approved" fill="#10B981" />
                  <Bar dataKey="denied" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
