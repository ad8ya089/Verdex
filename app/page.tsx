'use client'

import type React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Shield, MessageCircle, BarChart3, Upload, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function HomePage() {
  const router = useRouter()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [income, setIncome] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  const [loanAmount, setLoanAmount] = useState('')
  const [loanPurpose, setLoanPurpose] = useState('')
  const [creditScore, setCreditScore] = useState('')
  const [existingDebts, setExistingDebts] = useState('0')
  const [employmentYears, setEmploymentYears] = useState('')

  const validateAndSetFile = (file?: File) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a valid PDF file.')
      return
    }
    setSelectedFile(file)
  }

  const submitApplication = async (formData: FormData) => {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json() as { applicationId?: string; cached?: boolean; error?: string }
      if (!response.ok) {
        throw new Error(result.error || 'Submission failed.')
      }

      if (!result.applicationId) {
        throw new Error('Submission did not return an application ID.')
      }

      if (result.cached) {
        toast.success('Returning cached result for this application.')
      } else {
        toast.success('Application submitted. Starting analysis.')
      }

      router.push(`/analysis/${result.applicationId}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit application.'
      toast.error(message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handlePdfSubmit = async () => {
    if (!selectedFile || isAnalyzing) return
    const formData = new FormData()
    formData.append('file', selectedFile)
    await submitApplication(formData)
  }

  const handleManualSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isAnalyzing) return

    if (!name.trim() || !age || !income || !employmentType || !loanAmount || !loanPurpose || !creditScore) {
      toast.error('Please fill all required fields before analysis.')
      return
    }

    const summaryText = `
Loan Application Details:
Applicant Name: ${name}
Age: ${age}
Annual Income: ₹${income}
Employment Type: ${employmentType}
Loan Amount Requested: ₹${loanAmount}
Loan Purpose: ${loanPurpose}
Credit Score: ${creditScore}
Existing Monthly Debts: ₹${existingDebts || '0'}
Years at Current Employment: ${employmentYears || '0'}
    `.trim()

    const formData = new FormData()
    formData.append(
      'form',
      JSON.stringify({
        name,
        age,
        annualIncome: income,
        employmentType,
        loanAmount,
        loanPurpose,
        creditScore,
        existingDebts: existingDebts || '0',
        employmentYears: employmentYears || '0',
      })
    )
    await submitApplication(formData)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-4 inline-flex rounded-full bg-blue-100 px-4 py-1 text-sm font-medium text-blue-700 animate-pulse">
            Powered by Google Gemini
          </p>
          <h1 className="mb-4 text-4xl font-bold text-gray-900">Verdex</h1>
          <p className="mx-auto max-w-3xl text-xl text-gray-600">
            Loan Analysis. Clear, Transparent, Fair.
          </p>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="text-center shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="pt-6">
              <Brain className="mx-auto mb-4 h-12 w-12 text-blue-600" />
              <h3 className="mb-2 text-lg font-semibold">Risk Scoring</h3>
              <p className="text-sm text-gray-600">AI-powered risk assessment with transparent reasoning.</p>
            </CardContent>
          </Card>

          <Card className="text-center shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="pt-6">
              <Shield className="mx-auto mb-4 h-12 w-12 text-green-600" />
              <h3 className="mb-2 text-lg font-semibold">Bias Detection</h3>
              <p className="text-sm text-gray-600">Detects potential fairness issues across key demographic factors.</p>
            </CardContent>
          </Card>

          <Card className="text-center shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="pt-6">
              <BarChart3 className="mx-auto mb-4 h-12 w-12 text-orange-600" />
              <h3 className="mb-2 text-lg font-semibold">Visual Analytics</h3>
              <p className="text-sm text-gray-600">Track trends, bias metrics, and performance over time.</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle>Analyze Loan Application</CardTitle>
            <CardDescription>Choose a PDF upload or fill in the manual application form.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upload" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload PDF</TabsTrigger>
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <label
                  htmlFor="pdf-upload"
                  onDragOver={(event) => {
                    event.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault()
                    setIsDragging(false)
                    validateAndSetFile(event.dataTransfer.files?.[0])
                  }}
                  className={`block cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
                  }`}
                >
                  <input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(event) => validateAndSetFile(event.target.files?.[0])}
                  />
                  <Upload className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                  <p className="text-base font-medium text-gray-700">
                    Drag and drop your PDF here, or click to browse
                  </p>
                  <p className="mt-1 text-sm text-gray-500">Only PDF files are supported.</p>
                </label>

                {selectedFile && (
                  <div className="flex items-center justify-between rounded-md border bg-white px-4 py-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span>{selectedFile.name}</span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                      × Remove
                    </Button>
                  </div>
                )}

                <Button onClick={handlePdfSubmit} disabled={!selectedFile || isAnalyzing} className="w-full">
                  {isAnalyzing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verdex is reviewing your application...
                    </span>
                  ) : (
                    'Analyze Application'
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="manual">
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Applicant Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        min={18}
                        max={80}
                        value={age}
                        onChange={(event) => setAge(event.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="income">Annual Income (₹)</Label>
                      <Input
                        id="income"
                        type="number"
                        min={0}
                        value={income}
                        onChange={(event) => setIncome(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Employment Type</Label>
                      <Select value={employmentType} onValueChange={setEmploymentType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employment type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Salaried">Salaried</SelectItem>
                          <SelectItem value="Self-Employed">Self-Employed</SelectItem>
                          <SelectItem value="Business Owner">Business Owner</SelectItem>
                          <SelectItem value="Freelancer">Freelancer</SelectItem>
                          <SelectItem value="Unemployed">Unemployed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="loan-amount">Loan Amount Requested</Label>
                      <Input
                        id="loan-amount"
                        type="number"
                        min={0}
                        value={loanAmount}
                        onChange={(event) => setLoanAmount(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Loan Purpose</Label>
                      <Select value={loanPurpose} onValueChange={setLoanPurpose}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select purpose" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Home Purchase">Home Purchase</SelectItem>
                          <SelectItem value="Education">Education</SelectItem>
                          <SelectItem value="Business Loan">Business Loan</SelectItem>
                          <SelectItem value="Vehicle">Vehicle</SelectItem>
                          <SelectItem value="Medical Emergency">Medical Emergency</SelectItem>
                          <SelectItem value="Personal">Personal</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="credit-score">Credit Score</Label>
                      <Input
                        id="credit-score"
                        type="number"
                        min={300}
                        max={900}
                        placeholder="300-900"
                        value={creditScore}
                        onChange={(event) => setCreditScore(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="existing-debts">Existing Monthly Debts</Label>
                      <Input
                        id="existing-debts"
                        type="number"
                        min={0}
                        value={existingDebts}
                        onChange={(event) => setExistingDebts(event.target.value)}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="employment-years">Years at Current Employment</Label>
                      <Input
                        id="employment-years"
                        type="number"
                        min={0}
                        value={employmentYears}
                        onChange={(event) => setEmploymentYears(event.target.value)}
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={isAnalyzing} className="w-full">
                    {isAnalyzing ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verdex is reviewing your application...
                      </span>
                    ) : (
                      'Analyze Application'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
            <CardDescription>Navigate to key Verdex features.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => router.push('/chatbot')} className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Chat with Vera
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/bias-dashboard')}
                className="flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Bias Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/analytics')}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
