# Verdex - AI-Powered Loan Analysis

Upload a loan application PDF or fill a quick form. Verdex uses Google Gemini to generate a risk score, recommendation, bias assessment, and plain-language explanation - instantly.

## Features
- PDF upload or manual application form
- AI risk scoring (0-100) with Low / Medium / High classification
- Bias detection across gender, location, income, and age dimensions
- Explainable AI - plain-language explanation of every decision
- Chat with Vera, the AI assistant, to understand your results
- Analysis history stored locally in your browser
- Download analysis reports as .txt files

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **UI:** Tailwind CSS + shadcn/ui
- **AI:** Google Gemini 1.5 Flash
- **Charts:** Recharts
- **Deploy:** Vercel

## Getting Started

1. Clone the repo
2. Install dependencies: `npm install`
3. Get a free Gemini API key at https://aistudio.google.com/app/apikey
4. Create `.env.local`:
   ```
   GEMINI_API_KEY=your_key_here
   ```
5. Run: `npm run dev`
6. Open http://localhost:3000

## Deploy
One-click deploy to Vercel. Add `GEMINI_API_KEY` as an environment variable in the Vercel dashboard.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
