import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Route API pour supprimer le cookie SSO lors du logout
 * POST /api/auth/clear-sso
 */
export async function POST() {
  try {
    const cookieStore = await cookies()

    cookieStore.delete('odl-sso-token')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur suppression cookie SSO:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
