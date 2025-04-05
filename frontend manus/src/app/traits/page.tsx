import TraitAssessment from "@/features/assessment/TraitAssessment";
import { getTraits } from "@/lib/server/get-traits";

export default async function TraitsPage() {
  // Fetch initial traits data on the server using our utility
  const initialTraits = await getTraits();
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <TraitAssessment initialTraits={initialTraits} />
    </div>
  );
}
