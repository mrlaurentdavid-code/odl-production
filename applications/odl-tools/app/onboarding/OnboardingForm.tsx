'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

interface OnboardingFormProps {
  userEmail: string;
}

interface Department {
  id: string;
  name: string;
}

interface JobTitle {
  id: string;
  title: string;
}

interface Location {
  id: string;
  name: string;
}

export default function OnboardingForm({ userEmail }: OnboardingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    department: '',
    job_title: '',
    location: '',
    phone: '',
    phone_country: '+41',
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Load reference data on mount
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        // Load departments
        const { data: depts, error: deptsError } = await supabase
          .from('departments')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        if (deptsError) {
          console.error('Error loading departments:', deptsError);
        } else {
          console.log('Departments loaded:', depts);
          if (depts) setDepartments(depts);
        }

        // Load job titles
        const { data: titles, error: titlesError } = await supabase
          .from('job_titles')
          .select('id, title')
          .eq('is_active', true)
          .order('title');

        if (titlesError) {
          console.error('Error loading job titles:', titlesError);
        } else {
          console.log('Job titles loaded:', titles);
          if (titles) setJobTitles(titles);
        }

        // Load locations
        const { data: locs, error: locsError } = await supabase
          .from('locations')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        if (locsError) {
          console.error('Error loading locations:', locsError);
        } else {
          console.log('Locations loaded:', locs);
          if (locs) setLocations(locs);
        }
      } catch (err) {
        console.error('Error loading reference data:', err);
      }
    };

    loadReferenceData();
  }, [supabase]);

  const formatPhoneNumber = (value: string, countryCode: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');

    // Format based on country code
    if (countryCode === '+41') {
      // Swiss format: +41 XX XXX XX XX
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
      if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
      return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
    } else if (countryCode === '+33') {
      // French format: +33 X XX XX XX XX
      if (digits.length <= 1) return digits;
      if (digits.length <= 3) return `${digits.slice(0, 1)} ${digits.slice(1)}`;
      if (digits.length <= 5) return `${digits.slice(0, 1)} ${digits.slice(1, 3)} ${digits.slice(3)}`;
      if (digits.length <= 7) return `${digits.slice(0, 1)} ${digits.slice(1, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
      return `${digits.slice(0, 1)} ${digits.slice(1, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
    }

    return digits;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value, formData.phone_country);
    setFormData({
      ...formData,
      phone: formatted,
    });
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({
      ...formData,
      phone_country: e.target.value,
      phone: '', // Reset phone when changing country
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Get department and location names from IDs
      const deptName = departments.find(d => d.id === formData.department)?.name || null;
      const locName = locations.find(l => l.id === formData.location)?.name || null;
      const jobName = jobTitles.find(j => j.id === formData.job_title)?.title || null;

      // Format complete phone number with country code
      const fullPhone = formData.phone ? `${formData.phone_country} ${formData.phone}` : null;

      // Update profile with all information
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          full_name: `${formData.first_name} ${formData.last_name}`,
          birth_date: formData.birth_date || null,
          department: deptName,
          job_title: jobName,
          location: locName,
          phone: fullPhone,
          onboarding_completed: true,
          profile_status: 'pending_validation',
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Redirect to a "waiting for validation" page
      router.push('/onboarding/pending');
      router.refresh();
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'Erreur lors de la sauvegarde des informations');
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Bienvenue sur ODL Tools
          </h1>
          <p className="text-gray-600">
            Complétez votre profil pour commencer
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Email</p>
            <p className="text-gray-900 font-medium">{userEmail}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Informations personnelles</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Date de naissance
                </label>
                <input
                  type="date"
                  id="birth_date"
                  name="birth_date"
                  value={formData.birth_date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.phone_country}
                    onChange={handleCountryChange}
                    className="px-3 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="+41">🇨🇭 +41</option>
                    <option value="+33">🇫🇷 +33</option>
                    <option value="+49">🇩🇪 +49</option>
                    <option value="+39">🇮🇹 +39</option>
                    <option value="+44">🇬🇧 +44</option>
                  </select>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder={formData.phone_country === '+41' ? 'XX XXX XX XX' : 'Numéro'}
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Informations professionnelles</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                    Département
                  </label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Sélectionnez un département</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="job_title" className="block text-sm font-medium text-gray-700 mb-2">
                    Fonction
                  </label>
                  <select
                    id="job_title"
                    name="job_title"
                    value={formData.job_title}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Sélectionnez une fonction</option>
                    {jobTitles.map(title => (
                      <option key={title.id} value={title.id}>{title.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                  Localisation
                </label>
                <select
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">Sélectionnez une localisation</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Votre profil sera validé par un administrateur avant que vous puissiez accéder à la plateforme.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Enregistrement...' : 'Soumettre mon profil'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Les champs marqués d'un <span className="text-red-500">*</span> sont obligatoires
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
