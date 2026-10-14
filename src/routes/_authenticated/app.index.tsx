import { pageMeta } from "@/lib/page-meta";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => pageMeta("Workspace", "Your personal A4MP RAG SYSTEMS knowledge workspace."),
  component: AppEntry,
});

function AppEntry() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      try {
        const { data: convos } = await supabase
          .from("conversations")
          .select("id")
          .order("updated_at", { ascending: false })
          .limit(1);
        if (convos && convos.length > 0) {
          navigate({
            to: "/app/$conversationId",
            params: { conversationId: convos[0].id },
            replace: true,
          });
          return;
        }
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return;
        const { data: created, error } = await supabase
          .from("conversations")
          .insert({ user_id: u.user.id, title: "New chat" })
          .select("id")
          .single();
        if (error || !created) throw error ?? new Error("failed to create");
        navigate({
          to: "/app/$conversationId",
          params: { conversationId: created.id },
          replace: true,
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not open chat");
      }
    })();
  }, [navigate]);
  return (
    <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
      Loading your workspace…
    </div>
  );
}