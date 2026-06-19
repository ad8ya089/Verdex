"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Users, MapPin, DollarSign, Calendar, ShieldOff } from "lucide-react"
import { getAllAnalyses, type AnalysisResult } from "@/lib/storage"

export default function BiasDashboard() {
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([])

  useEffect(() => {
    setAnalyses(getAllAnalyses())
  }, [])

  const biasMetrics = useMemo(() => {
    const latest = analyses[0]
    if (!latest) {
      return { overall: 0, gender: 0, location: 0, income: 0, age: 0 }
    }
    return {
      overall: latest.biasFactors.overall,
      gender: latest.biasFactors.gender,
      location: latest.biasFactors.location,
      income: latest.biasFactors.income,
      age: latest.biasFactors.age,
    }
  }, [analyses])

  const recentAnalyses = useMemo(
    () =>
      analyses.slice(0, 5).map((analysis) => ({
        id: analysis.id,
        applicantName: analysis.applicantName,
        overallBias: analysis.biasFactors.overall,
        riskCategory: analysis.riskCategory,
      })),
    [analyses]
  )

  const getBiasLevel = (score: number) => {
    if (score <= 20) return { level: "Low", color: "text-green-600", variant: "default" as const }
    if (score <= 40) return { level: "Medium", color: "text-yellow-600", variant: "secondary" as const }
    return { level: "High", color: "text-red-600", variant: "destructive" as const }
  }

  if (analyses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Bias Detection Dashboard</h1>
            <p className="text-gray-600">Monitor and analyze potential bias in loan evaluations</p>
          </div>
          <Card className="p-12 text-center shadow-sm hover:shadow-md transition-shadow">
            <ShieldOff className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bias data yet. Run an analysis first.</h3>
            <p className="text-gray-500 mb-6">
              No analyses yet. Upload a loan application on the homepage to see bias metrics here.
            </p>
            <Button asChild variant="outline">
              <Link href="/">Analyze a Loan</Link>
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Bias Detection Dashboard</h1>
          <p className="text-gray-600">Monitor and analyze potential bias in loan evaluations</p>
        </div>

        <Card className="mb-8 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Overall Bias Assessment
            </CardTitle>
            <CardDescription>Current bias risk level across all demographic factors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-6">
              <div className="text-center">
                <div className={`text-6xl font-bold mb-2 ${getBiasLevel(biasMetrics.overall).color}`}>
                  {biasMetrics.overall}%
                </div>
                <Badge variant={getBiasLevel(biasMetrics.overall).variant} className="text-lg px-4 py-2">
                  {getBiasLevel(biasMetrics.overall).level} Bias Risk
                </Badge>
              </div>
            </div>
            <Progress value={biasMetrics.overall} className="h-3" />
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-blue-600" />
                Gender Bias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold">{biasMetrics.gender}%</span>
                <Badge variant={getBiasLevel(biasMetrics.gender).variant}>{getBiasLevel(biasMetrics.gender).level}</Badge>
              </div>
              <Progress value={biasMetrics.gender} className="h-2" />
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-green-600" />
                Location Bias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold">{biasMetrics.location}%</span>
                <Badge variant={getBiasLevel(biasMetrics.location).variant}>
                  {getBiasLevel(biasMetrics.location).level}
                </Badge>
              </div>
              <Progress value={biasMetrics.location} className="h-2" />
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-yellow-600" />
                Income Bias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold">{biasMetrics.income}%</span>
                <Badge variant={getBiasLevel(biasMetrics.income).variant}>{getBiasLevel(biasMetrics.income).level}</Badge>
              </div>
              <Progress value={biasMetrics.income} className="h-2" />
            </CardContent>
          </Card>

          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
                Age Bias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold">{biasMetrics.age}%</span>
                <Badge variant={getBiasLevel(biasMetrics.age).variant}>{getBiasLevel(biasMetrics.age).level}</Badge>
              </div>
              <Progress value={biasMetrics.age} className="h-2" />
            </CardContent>
          </Card>

          <Card className="flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">System Status</h3>
              <Badge variant="default">Bias Monitoring Active</Badge>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Recent Bias Analyses</CardTitle>
            <CardDescription>Latest loan applications and their bias risk assessments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAnalyses.map((analysis) => (
                <div key={analysis.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{analysis.applicantName}</h4>
                    <p className="text-sm text-gray-600">Analysis #{analysis.id}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${getBiasLevel(analysis.overallBias).color}`}>
                        {analysis.overallBias}%
                      </div>
                      <p className="text-xs text-gray-600">Bias Score</p>
                    </div>
                    <Badge variant={getBiasLevel(analysis.overallBias).variant}>{analysis.riskCategory}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
