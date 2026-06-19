import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import Navbar from '@/components/navbar'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Verdex - AI Loan Analysis',
  description:
    'Upload loan application documents for AI-powered risk scoring, bias detection, and transparent decision explanations.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Navbar />
          <main>
            {children}
            <footer className="mt-16 border-t border-gray-200 py-8 text-center text-sm text-gray-400">
              Verdex - AI Loan Analysis · Built with Next.js &amp; Gemini
            </footer>
          </main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
