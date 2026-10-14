import { pageMeta } from "@/lib/page-meta";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ChatWindow } from "@/components/ChatWindow";

export const Route = createFileRoute("/_authenticated/app/$conversationId")({
  head: () => pageMeta("Conversation", "Explore your documents with source-backed AI conversations."),
  component: ChatPage,
});

function ChatPage() {
  const { conversationId } = Route.useParams();
  return (
    <AppShell>
      <ChatWindow key={conversationId} conversationId={conversationId} />
    </AppShell>
  );
}