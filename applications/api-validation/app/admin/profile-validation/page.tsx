import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import ProfileValidationClient from './ProfileValidationClient';

export default async function ProfileValidationPage() {
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

  // Check if user is super admin
  const { data: profileData } = await supabase
    .rpc('get_profile_bypass_rls', { p_user_id: user.id });

  const profile = profileData?.[0];

  if (!profile?.is_super_admin) {
    redirect('/dashboard');
  }

  // Get pending profiles
  const { data: pendingProfiles, error } = await supabase
    .rpc('get_pending_profiles');

  if (error) {
    console.error('Error loading pending profiles:', error);
  }

  return <ProfileValidationClient profiles={pendingProfiles || []} />;
}
