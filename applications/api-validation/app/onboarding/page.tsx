import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import OnboardingForm from './OnboardingForm';

export default async function OnboardingPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get current profile
  const { data: profileData } = await supabase
    .rpc('get_profile_bypass_rls', { p_user_id: user.id });

  const profile = profileData?.[0];

  // If onboarding is already completed, redirect to dashboard
  if (profile?.onboarding_completed) {
    redirect('/dashboard');
  }

  return <OnboardingForm userEmail={user.email || ''} />;
}
