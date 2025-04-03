import ResultsProfile from "@/features/results/ResultsProfile";
import { AuthPrompt } from "@/features/results/AuthPrompt";

export default function ResultsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <ResultsProfile />
      <AuthPrompt />
    </div>
  );
}
