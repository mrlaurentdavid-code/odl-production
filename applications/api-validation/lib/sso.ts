/**
 * SSO Utilities - Single Sign-On pour ODL Tools
 *
 * Gère la création et validation des cookies SSO partagés
 * entre app.odl-tools.ch, tar.odl-tools.ch et ndf.odl-tools.ch
 */

import { cookies } from 'next/headers'

export const SSO_COOKIE_NAME = 'odl-sso-token'
export const SSO_COOKIE_DOMAIN = process.env.NODE_ENV === 'production'
  ? '.odl-tools.ch'  // En production: partage entre tous les sous-domaines
  : 'localhost'       // En local: partage entre localhost:XXXX

/**
 * Créer un cookie SSO après login réussi
 */
export async function setSSOCookie(accessToken: string) {
  const cookieStore = await cookies()

  cookieStore.set(SSO_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: SSO_COOKIE_DOMAIN,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 jours
  })
}

/**
 * Récupérer le token SSO du cookie
 */
export async function getSSOCookie(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(SSO_COOKIE_NAME)?.value
}

/**
 * Supprimer le cookie SSO (logout)
 */
export async function deleteSSOCookie() {
  const cookieStore = await cookies()

  cookieStore.delete(SSO_COOKIE_NAME)
}

/**
 * Vérifier si un token SSO est valide
 */
export async function validateSSOToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
      }
    )

    return response.ok
  } catch (error) {
    console.error('Erreur validation SSO:', error)
    return false
  }
}
