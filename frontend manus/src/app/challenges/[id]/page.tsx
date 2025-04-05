import { Suspense } from 'react';
import ChallengeDetailPage from '@/features/challenges/ChallengeDetailPage';
import { Skeleton } from '@/components/ui/skeleton';

// Define the params type without using the PageProps type
type ChallengeParams = {
  id: string;
};

/**
 * Challenge detail page component
 * @param {Object} props - Page props
 * @param {Object} props.params - Route parameters containing id
 */
export default function Page({ params }: { params: ChallengeParams }) {
  return (
    <Suspense fallback={<div className="p-4"><Skeleton className="h-[600px] w-full rounded-md" /></div>}>
      <ChallengeDetailPage params={params} />
    </Suspense>
  );
} 