import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { askQuestion } from "@/lib/rag.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowUp, Sparkles, FileText, ArrowUpRight, ScanText, ListChecks, Languages, Layers3 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Citation = {
  index: number;
  documentId: string;
  chunkIndex: number;
  filename: string;
  similarity: number;
  snippet: string;
};

type Msg = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations: Citation[];
  created_at: string;
};

export function ChatWindow({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const ask = useServerFn(askQuestion);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, role, content, citations, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as Msg[]);
    })();
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [conversationId]);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);
    const optimistic: Msg = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: q,
      citations: [],
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    try {
      await ask({ data: { conversationId, question: q } });
      // Reload authoritative messages from DB
      const { data } = await supabase
        .from("messages")
        .select("id, role, content, citations, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages((data ?? []) as Msg[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
          {messages.length === 0 && (
            <div className="page-enter py-8 sm:py-16">
              <div className="mb-6 inline-flex items-center gap-2 text-xs text-primary"><Layers3 className="size-5" /> Your personal intelligence</div>
              <h1 className="text-3xl font-medium leading-tight sm:text-4xl">What would you like<br />to understand?</h1>
              <p className="mt-4 text-sm text-muted-foreground">Clarity begins with a good question.</p>
              <div className="mt-9 grid gap-3 sm:grid-cols-3">
                {[{ icon: ScanText, label: "Find the key ideas", query: "What are the key ideas in my documents?" }, { icon: ListChecks, label: "Connect the details", query: "Compare the main points across my documents." }, { icon: Languages, label: "తెలుగులో అడగండి", query: "నా పత్రాలలో ముఖ్యమైన విషయాలను తెలుగులో వివరించండి." }].map(({ icon: Icon, label, query }) => <Button key={label} variant="outline" className="h-auto min-h-24 flex-col items-start whitespace-normal bg-card p-4 text-left" onClick={() => { setInput(query); inputRef.current?.focus(); }}><Icon className="text-primary" /><span className="text-xs font-normal">{label}</span></Button>)}
              </div>
              <Button asChild variant="link" className="mt-5 px-0 text-xs text-muted-foreground"><Link to="/documents"><FileText /> Document library <ArrowUpRight /></Link></Button>
            </div>
          )}

          <div className="space-y-6">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-background">
        <div className="mx-auto max-w-3xl px-4 pb-5 pt-3 sm:px-8">
          <div className="flex items-end gap-2 rounded-lg border border-border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Ask your library…"
              aria-label="Your question"
              className="min-h-[52px] resize-none border-0 focus-visible:ring-0 shadow-none"
            />
            <Button aria-label="Send question" title="Send question" onClick={send} disabled={busy || !input.trim()} size="icon" className="shrink-0">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-3 text-center text-[10px] text-muted-foreground">A4MP Rag Systems · Every world language</p>
        </div>
      </div>
    </>
  );
}

function MessageBubble({ message }: { message: Msg }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : ""}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-lg rounded-br-sm bg-primary px-4 py-3 text-primary-foreground shadow-sm"
            : "max-w-[95%] rounded-lg px-1 py-2"
        }
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        ) : (
          <>
            <div className="markdown-answer text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
            {message.citations && message.citations.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <div className="mb-2 text-xs font-semibold text-muted-foreground">
                  Sources
                </div>
                <div className="space-y-2">
                  {message.citations.map((c) => (
                    <details key={c.index} className="group rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs">
                      <summary className="flex cursor-pointer items-center gap-2 font-medium">
                        <span className="grid h-5 w-5 place-items-center rounded bg-accent/20 text-accent text-[10px] font-bold">
                          {c.index}
                        </span>
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{c.filename}</span>
                        <span className="ml-auto text-muted-foreground">
                          {(c.similarity * 100).toFixed(0)}% match
                        </span>
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{c.snippet}…</p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}