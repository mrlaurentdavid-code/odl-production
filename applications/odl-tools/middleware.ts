import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: "",
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect dashboard and admin routes
  if (!user && (request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/onboarding"))) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("returnUrl", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check if user needs to complete onboarding (only for authenticated users)
  if (user && !request.nextUrl.pathname.startsWith("/onboarding") && !request.nextUrl.pathname.startsWith("/login") && !request.nextUrl.pathname.startsWith("/blocked")) {
    const { data: profileData } = await supabase
      .rpc("get_profile_bypass_rls", { p_user_id: user.id })

    const profile = profileData?.[0]

    // If user is blocked/inactive, redirect to blocked page
    if (profile && profile.is_active === false) {
      console.log("🚫 Redirecting to blocked - user is inactive")
      return NextResponse.redirect(new URL("/blocked", request.url))
    }

    // If onboarding is not completed, redirect to onboarding page
    if (profile && !profile.onboarding_completed) {
      console.log("🔄 Redirecting to onboarding - profile incomplete")
      return NextResponse.redirect(new URL("/onboarding", request.url))
    }

    // If profile is pending validation, redirect to pending page
    if (profile && profile.profile_status === 'pending_validation' && !request.nextUrl.pathname.startsWith("/onboarding/pending")) {
      console.log("⏳ Redirecting to pending - profile awaiting validation")
      return NextResponse.redirect(new URL("/onboarding/pending", request.url))
    }

    // If profile is rejected, redirect to a rejection page
    if (profile && profile.profile_status === 'rejected' && !request.nextUrl.pathname.startsWith("/onboarding/rejected")) {
      console.log("❌ Redirecting to rejected - profile was rejected")
      return NextResponse.redirect(new URL("/onboarding/rejected", request.url))
    }
  }

  // Check admin role for /admin routes
  if (user && request.nextUrl.pathname.startsWith("/admin")) {
    // Utiliser la fonction SECURITY DEFINER pour contourner les policies RLS récursives
    const { data: profileData, error } = await supabase
      .rpc("get_profile_bypass_rls", { p_user_id: user.id })

    const profile = profileData?.[0]

    // DEBUG: Logs pour comprendre le problème
    console.log("🔍 Admin access check:", {
      path: request.nextUrl.pathname,
      userId: user.id,
      userEmail: user.email,
      profile: profile,
      error: error
    })

    // Pour /admin/access-management, seuls les super admins peuvent accéder
    if (request.nextUrl.pathname.startsWith("/admin/access-management")) {
      if (!profile?.is_super_admin) {
        console.log("❌ Access denied to /admin/access-management - not super admin")
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
      console.log("✅ Access granted to /admin/access-management - super admin confirmed")
    } else {
      // Pour les autres routes /admin, seuls les super admins peuvent accéder
      if (!profile?.is_super_admin) {
        console.log("❌ Access denied to /admin - not super admin")
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
      console.log("✅ Access granted to /admin - super admin confirmed")
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
