import { type NextRequest, NextResponse } from 'next/server'
import pdfParse from 'pdf-parse'
import { callGemini } from '@/lib/gemini'

export const runtime = 'nodejs'

function sanitizeResponse(text: string): string {
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const text = formData.get('text')

    let extractedText = ''

    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const pdfData = await pdfParse(buffer)
      extractedText = pdfData.text?.trim() ?? ''

      if (extractedText.length < 50) {
        return NextResponse.json(
          {
            error:
              'Could not extract text from PDF. Try a different file or use the manual form.',
          },
          { status: 400 }
        )
      }
    } else if (typeof text === 'string' && text.trim()) {
      extractedText = text.trim()
    } else {
      return NextResponse.json(
        { error: 'Please upload a PDF or provide manual application text.' },
        { status: 400 }
      )
    }

    const prompt = `You are a senior credit risk analyst. Analyze the following loan application text and return ONLY a valid JSON object with no markdown formatting, no code blocks, no explanation - just raw JSON.

The JSON must have exactly this structure:
{
  "riskScore": <integer 0-100, where 0=no risk and 100=maximum risk>,
  "riskCategory": <"Low" if riskScore <= 35, "Medium" if 36-65, "High" if > 65>,
  "recommendation": <"Approve" if Low, "Review" if Medium, "Decline" if High>,
  "keyFactors": [<string>, <string>, <string>],
  "explanation": <string, 2-3 sentences explaining the decision in plain language>,
  "confidence": <"High" | "Medium" | "Low", based on how much usable text was in the application - High if > 300 words, Medium if 100-300, Low if < 100 words>,
  "biasFactors": {
    "gender": <integer 0-100, estimated gender bias risk in the data>,
    "location": <integer 0-100, estimated location/geographic bias risk>,
    "income": <integer 0-100, estimated income-level bias risk>,
    "age": <integer 0-100, estimated age bias risk>,
    "overall": <integer, average of the four above>
  },
  "applicantName": <string, extract from text or use "Unknown Applicant">
}

Loan Application Text:
${extractedText}`

    let rawText = await callGemini(prompt)
    rawText = sanitizeResponse(rawText)

    try {
      const analysisResult = JSON.parse(rawText)
      return NextResponse.json({ success: true, data: analysisResult })
    } catch (parseError) {
      console.error('Gemini JSON parse error:', parseError)
      console.error('Raw Gemini response:', rawText)
      return NextResponse.json(
        { error: 'Analysis returned unexpected format. Please try again.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    )
  }
}
