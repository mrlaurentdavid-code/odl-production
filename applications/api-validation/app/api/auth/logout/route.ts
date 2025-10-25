import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  const supabase = await createServerSupabaseClient()

  await supabase.auth.signOut()

  // Clear cookies
  const cookieStore = await cookies()
  cookieStore.getAll().forEach(cookie => {
    cookieStore.delete(cookie.name)
  })

  return NextResponse.json({ success: true })
}
