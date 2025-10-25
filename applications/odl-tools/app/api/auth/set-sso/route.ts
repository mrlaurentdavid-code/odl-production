import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

/**
 * Route API pour créer le cookie SSO après login
 * POST /api/auth/set-sso
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (!user || userError) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Récupérer la session pour avoir l'access_token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (!session?.access_token || sessionError) {
      return NextResponse.json(
        { error: 'Pas de session active' },
        { status: 401 }
      )
    }

    // Créer le cookie SSO
    const cookieStore = await cookies()
    const domain = process.env.NODE_ENV === 'production'
      ? '.odl-tools.ch'
      : 'localhost'

    cookieStore.set('odl-sso-token', session.access_token, {
      httpOnly: false, // DOIT être false pour que JavaScript puisse le lire
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: domain,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 jours
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('Erreur création cookie SSO:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
