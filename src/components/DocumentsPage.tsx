import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ingestChunks } from "@/lib/rag.functions";
import { useServerFn } from "@tanstack/react-start";
import { parseFile, chunkText } from "@/lib/document-parser";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText, Upload, Loader2, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Doc = {
  id: string;
  filename: string;
  mime_type: string;
  file_size: number;
  status: string;
  error_message: string | null;
  chunk_count: number;
  created_at: string;
};

export function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const ingest = useServerFn(ingestChunks);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("documents")
      .select("id, filename, mime_type, file_size, status, error_message, chunk_count, created_at")
      .order("created_at", { ascending: false });
    setDocs((data ?? []) as Doc[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("Not signed in");
      setUploading(false);
      return;
    }
    for (const file of Array.from(files)) {
      try {
        setProgress(`Reading ${file.name}…`);
        const { text } = await parseFile(file);
        if (!text.trim()) throw new Error("No text could be extracted");

        setProgress(`Chunking ${file.name}…`);
        const chunks = chunkText(text);
        if (chunks.length === 0) throw new Error("No chunks produced");

        setProgress(`Creating record for ${file.name}…`);
        const { data: doc, error } = await supabase
          .from("documents")
          .insert({
            user_id: u.user.id,
            filename: file.name,
            mime_type: file.type || "application/octet-stream",
            file_size: file.size,
            status: "processing",
          })
          .select("id")
          .single();
        if (error || !doc) throw error ?? new Error("insert failed");

        setProgress(`Embedding ${chunks.length} chunks for ${file.name}…`);
        await ingest({ data: { documentId: doc.id, chunks } });

        toast.success(`${file.name} indexed (${chunks.length} chunks)`);
        await load();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(`${file.name}: ${msg}`);
      }
    }
    setProgress("");
    setUploading(false);
  };

  const del = async (id: string) => {
    if (!confirm("Delete this document and its chunks?")) return;
    await supabase.from("documents").delete().eq("id", id);
    await load();
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Documents</h1>
          <p className="text-sm text-muted-foreground">
            PDF, DOCX, and TXT files. Parsed and embedded into your private vector library.
          </p>
        </header>

        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
          }}
          className="cursor-pointer rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center transition-colors hover:border-accent"
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.docx,.txt,.md,application/pdf,text/plain"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent/15 text-accent">
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
          </div>
          <p className="mt-3 font-medium">{uploading ? "Working on it…" : "Drop files or click to upload"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {uploading ? progress : "PDF · DOCX · TXT · MD"}
          </p>
        </div>

        <div className="mt-8 space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{d.filename}</div>
                <div className="text-xs text-muted-foreground">
                  {(d.file_size / 1024).toFixed(1)} KB · {d.chunk_count} chunks ·{" "}
                  {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                </div>
              </div>
              {d.status === "ready" ? (
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Ready
                </span>
              ) : d.status === "failed" ? (
                <span className="flex items-center gap-1 text-xs text-destructive" title={d.error_message ?? ""}>
                  <AlertCircle className="h-4 w-4" /> Failed
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Processing
                </span>
              )}
              <Button variant="ghost" size="icon" onClick={() => del(d.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {docs.length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No documents yet. Upload one above to start chatting with your library.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}