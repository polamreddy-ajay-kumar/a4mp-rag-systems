import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { askQuestion } from "@/lib/rag.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles, FileText } from "lucide-react";
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
        <div className="mx-auto max-w-3xl px-6 py-8">
          {messages.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent/15 text-accent">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-semibold">Ask your library</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload documents on the Documents page, then ask anything. Answers cite the exact
                chunks used. Works in English and Telugu.
              </p>
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

      <div className="border-t border-border bg-background/70 backdrop-blur">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
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
              placeholder="Ask about your documents… (Shift+Enter for newline)"
              className="min-h-[52px] resize-none border-0 focus-visible:ring-0 shadow-none"
            />
            <Button onClick={send} disabled={busy || !input.trim()} size="icon" className="shrink-0">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
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
            ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-primary-foreground shadow-sm"
            : "max-w-[95%] rounded-2xl rounded-bl-sm bg-card border border-border px-5 py-4 shadow-sm"
        }
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        ) : (
          <>
            <div className="prose prose-sm max-w-none prose-p:my-2 prose-headings:mt-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
            {message.citations && message.citations.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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