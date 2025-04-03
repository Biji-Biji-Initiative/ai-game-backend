import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="flex flex-col items-center justify-center p-6">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium text-center text-muted-foreground">
            Loading...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
