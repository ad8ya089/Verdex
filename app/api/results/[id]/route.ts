import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const { data, error } = await supabaseAdmin
    .from('analysis_results')
    .select('*, applications(id, applicant_name, input_type, status, created_at)')
    .eq('application_id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Result not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
