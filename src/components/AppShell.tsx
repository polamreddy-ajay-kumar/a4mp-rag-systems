import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, MessageSquarePlus, LogOut, Files, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createConversation } from "@/lib/rag.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Convo = { id: string; title: string; updated_at: string };

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const router = useRouter();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [email, setEmail] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const createFn = useServerFn(createConversation);
  const currentPath = router.state.location.pathname;

  const load = async () => {
    const { data } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false });
    setConvos((data ?? []) as Convo[]);
  };

  useEffect(() => {
    load();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, [currentPath]);

  const newChat = async () => {
    setBusy(true);
    try {
      const { id } = await createFn();
      await load();
      navigate({ to: "/app/$conversationId", params: { conversationId: id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this conversation?")) return;
    await supabase.from("conversations").delete().eq("id", id);
    await load();
    if (currentPath.includes(id)) navigate({ to: "/app" });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="grid min-h-screen grid-cols-[280px_1fr] bg-secondary/40">
      {/* Sidebar */}
      <aside className="flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-4">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="text-sm font-semibold">A4MP RAG AI</div>
        </div>

        <div className="p-3">
          <Button onClick={newChat} disabled={busy} className="w-full justify-start gap-2" variant="secondary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
            New chat
          </Button>
        </div>

        <nav className="px-3 pb-2">
          <Link
            to="/documents"
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent",
              currentPath.startsWith("/documents") && "bg-sidebar-accent",
            )}
          >
            <Files className="h-4 w-4" /> Documents
          </Link>
        </nav>

        <div className="px-4 pt-4 pb-2 text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
          Conversations
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto px-2">
          {convos.map((c) => {
            const active = currentPath.endsWith(c.id);
            return (
              <div
                key={c.id}
                className={cn(
                  "group flex items-center gap-1 rounded-md px-2 text-sm hover:bg-sidebar-accent",
                  active && "bg-sidebar-accent",
                )}
              >
                <Link
                  to="/app/$conversationId"
                  params={{ conversationId: c.id }}
                  className="flex-1 truncate py-2"
                >
                  {c.title || "Untitled"}
                </Link>
                <button
                  aria-label="Delete conversation"
                  className="opacity-0 group-hover:opacity-100 p-1 text-sidebar-foreground/60 hover:text-destructive"
                  onClick={() => del(c.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          {convos.length === 0 && (
            <p className="px-3 py-2 text-xs text-sidebar-foreground/50">No chats yet</p>
          )}
        </div>

        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 truncate px-2 text-xs text-sidebar-foreground/70">{email}</div>
          <Button onClick={signOut} variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:text-sidebar-foreground">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="flex h-screen flex-col overflow-hidden">{children}</main>
    </div>
  );
}