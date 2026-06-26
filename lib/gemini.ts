import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

/**
 * Call Gemini 1.5 Flash with an optional system instruction and timeout.
 * The timeout prevents pipeline stages from hanging indefinitely.
 */
export async function callGemini(
  prompt: string,
  systemInstruction?: string,
  timeoutMs = 30000
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    ...(systemInstruction ? { systemInstruction } : {}),
  })

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Gemini timed out after ${timeoutMs}ms`)),
      timeoutMs
    )
  )

  const call = model.generateContent(prompt).then((result) => result.response.text())
  const raw = await Promise.race([call, timeout])

  return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
}
