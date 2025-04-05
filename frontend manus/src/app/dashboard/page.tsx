import { Suspense } from 'react';
import DashboardPage from "@/features/dashboard/DashboardPage";
import { getProgressSummary, getSkillProgress, getUserJourneyEvents, getCurrentUserId } from "@/lib/server/api";
import { Skeleton } from "@/components/ui/skeleton";

export default async function Dashboard() {
  // Try to get user ID on the server (this will likely return null in our current setup)
  const userId = getCurrentUserId();
  
  // If we have a userId, fetch initial data server-side for better performance
  if (userId) {
    // Fetch initial data in parallel
    const [progressData, skillData, journeyData] = await Promise.all([
      getProgressSummary(userId),
      getSkillProgress(userId),
      getUserJourneyEvents(userId),
    ]);
    
    // Pass the pre-fetched data as props to the client component
    return (
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardPage 
          initialProgressData={progressData.data} 
          initialSkillData={skillData.data}
          initialJourneyData={journeyData.data} 
        />
      </Suspense>
    );
  }
  
  // If we don't have a userId, render the client component without initial data
  // The client component will handle authentication and data fetching on the client
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPage 
        initialProgressData={null} 
        initialSkillData={null} 
        initialJourneyData={null} 
      />
    </Suspense>
  );
}

// Skeleton loading state for dashboard
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-56 mt-2" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        
        <Skeleton className="h-64 w-full mb-8 rounded-lg" />
        <Skeleton className="h-48 w-full mb-8 rounded-lg" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
