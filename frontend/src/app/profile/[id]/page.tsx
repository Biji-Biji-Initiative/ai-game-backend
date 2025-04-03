import ResultsProfile from "@/features/results/ResultsProfile";

// Define the page props type with the id parameter
interface ProfilePageProps {
  params: {
    id: string;
  };
}

export default function SharedProfilePage({ params }: ProfilePageProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <ResultsProfile profileId={params.id} />
    </div>
  );
}
