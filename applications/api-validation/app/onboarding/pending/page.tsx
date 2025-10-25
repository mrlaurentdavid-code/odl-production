'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function OnboardingPendingPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Profil en attente de validation
          </h1>
          <p className="text-gray-600 mb-6">
            Votre profil a bien été enregistré et est actuellement en cours de validation par notre équipe.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Vous recevrez un email dès que votre compte sera activé.
          </p>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-6">
            <p className="text-xs text-blue-800">
              Ce processus prend généralement moins de 24 heures.
            </p>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
