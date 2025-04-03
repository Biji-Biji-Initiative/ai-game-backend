import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">AI Fight Club</CardTitle>
          <CardDescription className="text-xl mt-2">
            Discover Your Competitive Advantage in the Age of AI
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4 text-center">
            <p className="text-lg">
              In a world increasingly shaped by artificial intelligence, what makes <span className="font-bold">you</span> uniquely valuable?
            </p>
            
            <p>
              AI Fight Club helps you discover your human competitive edge - the skills, traits, and capabilities 
              that make you valuable and differentiated in an AI-powered future.
            </p>
            
            <div className="py-4">
              <h3 className="font-semibold text-lg">How It Works:</h3>
              <ul className="list-disc list-inside text-left max-w-md mx-auto mt-2 space-y-2">
                <li>Tell us about your professional context</li>
                <li>Complete a brief trait assessment</li>
                <li>Share your attitudes about AI</li>
                <li>Challenge AI across three rounds</li>
                <li>Receive your Human Edge Profile</li>
              </ul>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-center pb-6">
          <Link href="/context" passHref>
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800">
              Begin Your Journey
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
