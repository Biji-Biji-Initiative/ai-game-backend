import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-10">
      <div className="text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
          Welcome to AI Fight Club
        </h1>
        <p className="text-xl text-muted-foreground max-w-[600px] mx-auto">
          Discover your human edge in an AI-powered world
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-6 items-center">
        <Link href="/context">
          <Button size="lg" className="text-lg px-8 py-6 bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl">
            Start Your Journey
          </Button>
        </Link>
        <Link href="/about">
          <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            Learn More
          </Button>
        </Link>
      </div>
      
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
        <div className="p-6 border-2 rounded-lg shadow-md hover:shadow-lg transition-all space-y-3 bg-white dark:bg-gray-800">
          <h2 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400">Discover Your Strengths</h2>
          <p>Understand your cognitive traits and how they compare to AI capabilities.</p>
        </div>
        <div className="p-6 border-2 rounded-lg shadow-md hover:shadow-lg transition-all space-y-3 bg-white dark:bg-gray-800">
          <h2 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400">Take on Challenges</h2>
          <p>Test yourself through AI challenges designed to highlight human advantages.</p>
        </div>
        <div className="p-6 border-2 rounded-lg shadow-md hover:shadow-lg transition-all space-y-3 bg-white dark:bg-gray-800">
          <h2 className="text-xl font-semibold text-indigo-600 dark:text-indigo-400">Track Your Progress</h2>
          <p>See your development and where you stand in the competitive landscape.</p>
        </div>
      </div>
    </div>
  );
}
