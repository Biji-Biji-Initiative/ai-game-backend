'use client';

import ResultsProfile from '@/features/results/ResultsProfile';

// In Next.js App Router, this defines the params type for dynamic routes
type SharedProfileParams = {
  params: {
    profileId: string;
  };
};

export default function SharedProfilePage({ params }: SharedProfileParams) {
  const { profileId } = params;
  
  return (
    <div className="container max-w-5xl mx-auto p-4 my-8">
      <ResultsProfile profileId={profileId} />
    </div>
  );
}
