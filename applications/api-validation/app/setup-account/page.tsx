import { Suspense } from 'react';
import SetupAccountContent from './SetupAccountContent';

export default function SetupAccountPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
          <p className="text-gray-600 mt-4">Chargement...</p>
        </div>
      </div>
    }>
      <SetupAccountContent />
    </Suspense>
  );
}
