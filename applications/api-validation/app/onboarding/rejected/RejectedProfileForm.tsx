'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import OnboardingForm from '../OnboardingForm';

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  department: string | null;
  job_title: string | null;
  location: string | null;
  phone: string | null;
  rejection_reason: string | null;
}

export default function RejectedProfileForm({ profile }: { profile: Profile }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Rejection reason banner */}
        <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-6">
          <div className="flex gap-3">
            <div className="text-3xl">❌</div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-red-900 mb-2">
                Votre profil a été refusé
              </h2>
              <p className="text-sm text-red-700 mb-3">
                <strong>Raison:</strong> {profile.rejection_reason || "Informations incorrectes"}
              </p>
              <p className="text-sm text-red-800">
                Veuillez corriger les informations ci-dessous et resoumettre votre profil.
              </p>
            </div>
          </div>
        </div>

        {/* Onboarding form with pre-filled data */}
        <OnboardingForm userEmail={profile.email} />
      </div>
    </div>
  );
}
