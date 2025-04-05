import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import PromptViewer from "@/features/prompts/PromptViewer";

export default function PromptsPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-5xl shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Prompt Viewer</CardTitle>
          <p className="text-sm text-gray-500 mt-2">
            (Developer Tool)
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="border-l-4 border-amber-500 pl-4 py-2 bg-amber-50 dark:bg-amber-900/20 mb-6">
            <p className="italic text-gray-700 dark:text-gray-300">
              This is a developer tool for examining and testing OpenAI prompts used in the application.
            </p>
          </div>
          
          <PromptViewer />
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Link href="/" passHref>
            <Button variant="outline">Back to App</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
