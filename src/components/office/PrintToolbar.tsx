import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintToolbar({ title }: { title: string }) {
  return (
    <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/90 px-6 py-3 backdrop-blur">
      <p className="text-sm font-semibold text-navy">{title}</p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => window.close()}>Close</Button>
        <Button onClick={() => window.print()}><Printer /> Print</Button>
      </div>
    </div>
  );
}
