import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <FileQuestion className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Page Not Found
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            We couldn&apos;t find the page you&apos;re looking for.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <p className="text-muted-foreground text-center">
            The page you are trying to visit doesn&apos;t exist or has been moved.
          </p>
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <Link href="/" passHref>
            <Button>
              Return Home
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
