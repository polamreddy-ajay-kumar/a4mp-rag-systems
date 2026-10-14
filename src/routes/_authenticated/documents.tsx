import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DocumentsPage } from "@/components/DocumentsPage";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => pageMeta("Document library", "Manage your private document library in A4MP RAG SYSTEMS."),
  component: () => (
    <AppShell>
      <DocumentsPage />
    </AppShell>
  ),
});