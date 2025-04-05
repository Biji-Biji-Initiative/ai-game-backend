import ResultsProfile from "@/features/results/ResultsProfile";

// Define the params type without using the PageProps type
type ProfileParams = {
  id: string;
};

/**
 * Shared user profile page component
 * @param {Object} props - Page props
 * @param {Object} props.params - Route parameters containing profile ID
 */
export default function SharedProfilePage({ params }: { params: ProfileParams }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <ResultsProfile profileId={params.id} />
    </div>
  );
}
