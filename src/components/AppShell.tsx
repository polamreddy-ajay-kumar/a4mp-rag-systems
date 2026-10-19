import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageSquarePlus, LogOut, Files, Loader2, Trash2, Menu, X, MessageSquare, ShieldCheck, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createConversation } from "@/lib/rag.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { Brand } from "@/components/Brand";

type Convo = { id: string; title: string; updated_at: string };

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const router = useRouter();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [email, setEmail] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
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
    setMenuOpen(false);
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
    <div className="flex h-dvh overflow-hidden bg-background">
      {menuOpen && <div className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden" onClick={() => setMenuOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform md:static md:translate-x-0", menuOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between px-5 py-6"><Link to="/"><Brand compact /></Link><Button variant="ghost" size="icon" className="md:hidden" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X /></Button></div>
        <div className="px-4 pb-5"><Button onClick={newChat} disabled={busy} className="w-full justify-start gap-3">{busy ? <Loader2 className="size-4 animate-spin" /> : <MessageSquarePlus />} New conversation</Button></div>
        <nav className="space-y-1 px-3">
          <Button asChild variant="ghost" className={cn("w-full justify-start text-muted-foreground", currentPath.startsWith("/app") && "bg-sidebar-accent text-foreground")}><Link to="/app"><MessageSquare /> Workspace</Link></Button>
          <Button asChild variant="ghost" className={cn("w-full justify-start text-muted-foreground", currentPath.startsWith("/documents") && "bg-sidebar-accent text-foreground")}><Link to="/documents"><Files /> Document library</Link></Button>
        </nav>
        <div className="mx-5 mt-6 flex items-center justify-between border-t border-sidebar-border pt-6 pb-3 text-[10px] font-medium text-muted-foreground"><span>Recent conversations</span><span>{convos.length.toString().padStart(2, "0")}</span></div>
        <div className="flex-1 space-y-1 overflow-y-auto px-3">
          {convos.map((c) => <div key={c.id} className={cn("group flex items-center rounded-md text-sm hover:bg-sidebar-accent", currentPath.endsWith(c.id) && "bg-sidebar-accent")}>
            <Link to="/app/$conversationId" params={{ conversationId: c.id }} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5"><MessageSquare className="size-3.5 shrink-0 text-muted-foreground" /><span className="truncate">{c.title || "Untitled"}</span></Link>
            <Button aria-label="Delete conversation" title="Delete conversation" variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground md:opacity-0 md:group-hover:opacity-100 focus:opacity-100" onClick={() => del(c.id)}><Trash2 className="size-3.5" /></Button>
          </div>)}
          {convos.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No conversations yet</p>}
        </div>
        <div className="mx-5 mb-5 flex items-center gap-2 border-t border-sidebar-border pt-5 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-primary" /> Private workspace</div>
        <div className="flex items-center gap-3 border-t border-sidebar-border px-4 py-4"><span className="grid size-8 shrink-0 place-items-center rounded-md bg-secondary font-display text-sm text-primary">{email.charAt(0).toUpperCase() || "A"}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{email || "Your account"}</p><p className="mt-1 text-[10px] text-muted-foreground">Personal workspace</p></div><Button onClick={signOut} variant="ghost" size="icon" aria-label="Sign out" title="Sign out" className="size-8 text-muted-foreground"><LogOut /></Button></div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setMenuOpen(true)} className="md:hidden"><Menu /></Button><span className="hidden text-xs text-muted-foreground sm:inline">Workspace</span><ChevronRight className="hidden size-3 text-muted-foreground sm:block" /><span className="truncate text-sm font-medium">{currentPath.startsWith("/documents") ? "Document library" : "Knowledge chat"}</span></div>
          <span className="flex shrink-0 items-center gap-2 text-[10px] text-muted-foreground sm:text-xs"><span className="size-1.5 rounded-full bg-primary" /> A4MP Rag Systems</span>
        </header>
        {children}
      </main>
    </div>
  );
}
