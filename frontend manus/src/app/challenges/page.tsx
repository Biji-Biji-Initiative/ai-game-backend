import ChallengeBrowser from '@/features/challenges/ChallengeBrowser';

export default function ChallengeBrowserPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <ChallengeBrowser />
      </div>
    </div>
  );
}
