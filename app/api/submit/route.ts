import { NextRequest, NextResponse } from 'next/server'
import { PDFParse } from 'pdf-parse'
import { sha256 } from '@/lib/hash'
import { supabaseAdmin } from '@/lib/supabase'
import type { LoanApplicationForm, SubmitResponse } from '@/lib/types'

export const runtime = 'nodejs'

async function extractPdfText(file: File): Promise<{ rawText: string; buffer: Buffer }> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const parser = new PDFParse({ data: new Uint8Array(buffer) })

  try {
    const result = await parser.getText()
    return { rawText: result.text?.trim() ?? '', buffer }
  } finally {
    await parser.destroy()
  }
}

function formToText(form: LoanApplicationForm): string {
  return `
Loan Application
Applicant Name: ${form.name}
Age: ${form.age}
Annual Income: INR ${form.annualIncome}
Employment Type: ${form.employmentType}
Loan Amount: INR ${form.loanAmount}
Loan Purpose: ${form.loanPurpose}
Credit Score: ${form.creditScore}
Existing Monthly Debts: INR ${form.existingDebts}
Years at Current Job: ${form.employmentYears}
  `.trim()
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const formJson = formData.get('form')

    let rawText = ''
    let inputType: 'pdf' | 'form' = 'form'
    let fileUrl: string | null = null

    if (file instanceof File && file.type === 'application/pdf') {
      inputType = 'pdf'
      const extracted = await extractPdfText(file)
      rawText = extracted.rawText

      if (rawText.length < 50) {
        return NextResponse.json(
          { error: 'Could not extract text from this PDF. Try the manual form instead.' },
          { status: 400 }
        )
      }

      const safeName = file.name.replace(/[^\w.-]+/g, '-')
      const filename = `${Date.now()}-${safeName}`
      const { data: upload, error: uploadError } = await supabaseAdmin.storage
        .from('loan-documents')
        .upload(filename, extracted.buffer, { contentType: 'application/pdf' })

      if (uploadError) {
        console.warn('Supabase storage upload failed:', uploadError.message)
      }
      fileUrl = upload?.path ?? null
    } else if (typeof formJson === 'string' && formJson.trim()) {
      const form = JSON.parse(formJson) as LoanApplicationForm
      rawText = formToText(form)
    } else {
      return NextResponse.json({ error: 'No file or form data.' }, { status: 400 })
    }

    const inputHash = sha256(rawText)
    const { data: cached } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('input_hash', inputHash)
      .eq('status', 'complete')
      .maybeSingle()

    if (cached) {
      return NextResponse.json({
        applicationId: cached.id,
        cached: true,
      } satisfies SubmitResponse)
    }

    const { data: app, error } = await supabaseAdmin
      .from('applications')
      .insert({
        input_hash: inputHash,
        input_type: inputType,
        raw_text: rawText,
        file_url: fileUrl,
        status: 'queued',
      })
      .select('id')
      .single()

    if (error || !app) {
      throw new Error(`DB insert failed: ${error?.message ?? 'missing application row'}`)
    }

    return NextResponse.json({
      applicationId: app.id,
      cached: false,
    } satisfies SubmitResponse)
  } catch (err) {
    console.error('[/api/submit]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Submission failed.' },
      { status: 500 }
    )
  }
}
