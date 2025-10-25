'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { BackToDashboard } from '@/components/ui/BackToDashboard';
import Link from 'next/link';

interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  department: string | null;
  job_title: string | null;
  location: string | null;
  phone: string | null;
  birth_date: string | null;
  created_at: string;
}

interface ValidationFormData {
  employee_type: string;
  rejection_reason: string;
}

export default function ProfileValidationClient({ profiles }: { profiles: Profile[] }) {
  const router = useRouter();
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [formData, setFormData] = useState<ValidationFormData>({
    employee_type: 'employee',
    rejection_reason: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ type: 'approve' | 'reject', name: string } | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleApprove = async () => {
    if (!selectedProfile) return;

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Non authentifié');
      }

      // Update profile status and employee type
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          profile_status: 'approved',
          employee_type: formData.employee_type,
          validated_by: user.id,
          validated_at: new Date().toISOString(),
          is_active: true,
        })
        .eq('id', selectedProfile.id);

      if (updateError) throw updateError;

      // TODO: Send email notification to user

      // Show success message
      setSuccess({ type: 'approve', name: selectedProfile.full_name });
      setSelectedProfile(null);
      setAction(null);
      router.refresh();
    } catch (err: any) {
      console.error('Error approving profile:', err);
      setError(err.message || 'Erreur lors de l\'approbation');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProfile || !formData.rejection_reason.trim()) {
      setError('Veuillez indiquer une raison de refus');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Non authentifié');
      }

      // Update profile status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          profile_status: 'rejected',
          rejection_reason: formData.rejection_reason,
          validated_by: user.id,
          validated_at: new Date().toISOString(),
          is_active: false,
        })
        .eq('id', selectedProfile.id);

      if (updateError) throw updateError;

      // TODO: Send email notification to user with rejection reason

      // Show success message
      setSuccess({ type: 'reject', name: selectedProfile.full_name });
      setSelectedProfile(null);
      setAction(null);
      router.refresh();
    } catch (err: any) {
      console.error('Error rejecting profile:', err);
      setError(err.message || 'Erreur lors du refus');
    } finally {
      setLoading(false);
    }
  };

  const openApprovalModal = (profile: Profile) => {
    setSelectedProfile(profile);
    setAction('approve');
    setFormData({ employee_type: 'employee', rejection_reason: '' });
    setError('');
  };

  const openRejectionModal = (profile: Profile) => {
    setSelectedProfile(profile);
    setAction('reject');
    setFormData({ employee_type: 'employee', rejection_reason: '' });
    setError('');
  };

  const closeModal = () => {
    setSelectedProfile(null);
    setAction(null);
    setError('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Validation des profils
          </h1>
          <p className="text-gray-600">
            {profiles.length} profil{profiles.length > 1 ? 's' : ''} en attente de validation
          </p>
        </div>

        {profiles.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Aucun profil en attente
            </h2>
            <p className="text-gray-600 mb-8">
              Tous les profils ont été validés
            </p>

            <div className="max-w-md mx-auto space-y-3">
              <Link
                href="/admin"
                className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
              >
                Retour au panneau admin
              </Link>
              <div className="flex justify-center">
                <BackToDashboard variant="button" className="w-full" />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-lg font-semibold text-blue-600">
                          {profile.first_name?.[0]}{profile.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {profile.full_name}
                        </h3>
                        <p className="text-sm text-gray-600">{profile.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      {profile.department && (
                        <div>
                          <span className="font-medium text-gray-700">Département:</span>
                          <span className="ml-2 text-gray-900">{profile.department}</span>
                        </div>
                      )}
                      {profile.job_title && (
                        <div>
                          <span className="font-medium text-gray-700">Fonction:</span>
                          <span className="ml-2 text-gray-900">{profile.job_title}</span>
                        </div>
                      )}
                      {profile.location && (
                        <div>
                          <span className="font-medium text-gray-700">Localisation:</span>
                          <span className="ml-2 text-gray-900">{profile.location}</span>
                        </div>
                      )}
                      {profile.phone && (
                        <div>
                          <span className="font-medium text-gray-700">Téléphone:</span>
                          <span className="ml-2 text-gray-900">{profile.phone}</span>
                        </div>
                      )}
                      {profile.birth_date && (
                        <div>
                          <span className="font-medium text-gray-700">Date de naissance:</span>
                          <span className="ml-2 text-gray-900">{formatDate(profile.birth_date)}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-700">Demandé le:</span>
                        <span className="ml-2 text-gray-900">{formatDate(profile.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2">
                    <button
                      onClick={() => openApprovalModal(profile)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                    >
                      Approuver
                    </button>
                    <button
                      onClick={() => openRejectionModal(profile)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approval/Rejection Modal */}
      {selectedProfile && action && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {action === 'approve' ? 'Approuver le profil' : 'Refuser le profil'}
            </h2>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-1">Utilisateur</p>
              <p className="text-gray-900">{selectedProfile.full_name}</p>
              <p className="text-sm text-gray-600">{selectedProfile.email}</p>
            </div>

            {action === 'approve' ? (
              <div className="mb-6">
                <label htmlFor="employee_type" className="block text-sm font-medium text-gray-700 mb-2">
                  Type d'employé <span className="text-red-500">*</span>
                </label>
                <select
                  id="employee_type"
                  value={formData.employee_type}
                  onChange={(e) => setFormData({ ...formData, employee_type: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="employee">Employé</option>
                  <option value="manager">Manager</option>
                  <option value="executive">Directeur</option>
                  <option value="contractor">Contractuel</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Choisissez le type d'employé qui sera attribué à cet utilisateur
                </p>
              </div>
            ) : (
              <div className="mb-6">
                <label htmlFor="rejection_reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Raison du refus <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="rejection_reason"
                  value={formData.rejection_reason}
                  onChange={(e) => setFormData({ ...formData, rejection_reason: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Expliquez pourquoi ce profil est refusé..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cette raison sera envoyée par email à l'utilisateur
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={action === 'approve' ? handleApprove : handleReject}
                disabled={loading}
                className={`flex-1 px-4 py-3 ${
                  action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } text-white rounded-lg transition-colors font-medium disabled:opacity-50`}
              >
                {loading ? 'Traitement...' : action === 'approve' ? 'Approuver' : 'Refuser'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal with Navigation */}
      {success && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center">
            <div className="text-6xl mb-4">
              {success.type === 'approve' ? '✅' : '❌'}
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {success.type === 'approve' ? 'Profil approuvé!' : 'Profil refusé'}
            </h2>
            <p className="text-gray-600 mb-8">
              {success.type === 'approve'
                ? `Le profil de ${success.name} a été approuvé avec succès. L'utilisateur recevra un email de confirmation.`
                : `Le profil de ${success.name} a été refusé. L'utilisateur recevra un email avec la raison du refus et pourra corriger ses informations.`
              }
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setSuccess(null)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Continuer la validation
              </button>
              <Link
                href="/admin"
                className="block w-full px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium text-center"
              >
                Retour au panneau admin
              </Link>
              <div className="flex justify-center">
                <BackToDashboard variant="button" className="w-full" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
