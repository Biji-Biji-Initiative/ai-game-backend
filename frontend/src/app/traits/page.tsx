'use client';

import TraitAssessment from "@/features/assessment/TraitAssessment";

export default function TraitsPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <TraitAssessment />
    </div>
  );
}
