import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/office/PageHeader";
import { EmptyState } from "@/components/office/States";

/** Honest placeholder for screens in the approved plan that are not built yet. */
export function NotBuiltYet({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={Hammer}
        title="This screen isn't built yet"
        body="It's in the plan and will be added in the next build step. Nothing here is live yet."
      />
    </>
  );
}
