import { type NextRequest, NextResponse } from 'next/server'
import { callGemini } from '@/lib/gemini'

const systemInstruction =
  'You are Vera, a friendly and knowledgeable loan analysis assistant built into the Verdex platform. You help users understand their loan analysis results, explain risk scores, clarify bias detection findings, and answer general questions about the loan evaluation process. Be concise (2-4 sentences unless more detail is genuinely needed), empathetic, and avoid financial jargon. Never give personalized financial advice. If asked something completely unrelated to loans or finance, politely redirect the conversation.'

export async function POST(request: NextRequest) {
  try {
    const { message, context } = (await request.json()) as {
      message?: string
      context?: string
    }

    if (!message?.trim()) {
      return NextResponse.json({ response: 'Please ask a question to continue.' }, { status: 400 })
    }

    const fullPrompt = context
      ? `[Current Analysis Context: ${context}]\n\nUser question: ${message}`
      : message

    const response = await callGemini(fullPrompt, systemInstruction)

    return NextResponse.json({ response })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { response: 'Vera is unavailable right now. Please try again.' },
      { status: 500 }
    )
  }
}
