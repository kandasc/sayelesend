import { Authenticated } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { FileText } from "lucide-react";

export default function Templates() {
  return (
    <Authenticated>
      <TemplatesContent />
    </Authenticated>
  );
}

function TemplatesContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">SMS Templates</h1>
        <p className="text-muted-foreground">
          Create and manage reusable message templates
        </p>
      </div>

      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Templates Coming Soon</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                This feature is part of the upcoming milestone. You'll be able to
                create reusable templates with variables for bulk messaging.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
