import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DocumentsPage } from "@/components/DocumentsPage";

export const Route = createFileRoute("/_authenticated/documents")({
  component: () => (
    <AppShell>
      <DocumentsPage />
    </AppShell>
  ),
});