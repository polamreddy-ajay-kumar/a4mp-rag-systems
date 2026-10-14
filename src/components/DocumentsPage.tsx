import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ingestChunks } from "@/lib/rag.functions";
import { useServerFn } from "@tanstack/react-start";
import { parseFile, chunkText } from "@/lib/document-parser";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText, Upload, Loader2, Trash2, CheckCircle2, AlertCircle, Library, ShieldCheck } from "lucide-react";
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
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
        <header className="mb-8">
          <p className="mb-3 text-xs text-primary">YOUR KNOWLEDGE COLLECTION</p>
          <h1 className="text-3xl font-medium">Documents</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            A personal collection. A clearer perspective.
          </p>
        </header>

        <div
          role="button"
          tabIndex={uploading ? -1 : 0}
          aria-label="Upload documents"
          aria-disabled={uploading}
          onKeyDown={(e) => { if (!uploading && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); inputRef.current?.click(); } }}
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
          }}
          className="cursor-pointer rounded-lg border border-dashed border-border bg-card p-10 text-center transition-colors hover:border-primary"
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.docx,.txt,.md,application/pdf,text/plain"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
          </div>
          <p className="mt-3 font-medium">{uploading ? "Working on it…" : "Add to your library"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {uploading ? progress : "PDF · DOCX · TXT · MD"}
          </p>
        </div>

        <div className="mt-8 flex items-center justify-between border-b border-border pb-4"><h2 className="flex items-center gap-2 text-sm font-medium"><Library className="size-4 text-primary" /> All documents <span className="text-muted-foreground">({docs.length})</span></h2><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" /> Private</span></div>
        <div className="mt-4 space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="min-w-0 flex-1 basis-32">
                <div className="truncate font-medium">{d.filename}</div>
                <div className="text-xs text-muted-foreground">
                  {(d.file_size / 1024).toFixed(1)} KB · {d.chunk_count} chunks ·{" "}
                  {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                </div>
              </div>
              {d.status === "ready" ? (
                <span className="flex items-center gap-1 text-xs text-success">
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
              <Button aria-label={`Delete ${d.filename}`} title="Delete document" variant="ghost" size="icon" onClick={() => del(d.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {docs.length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Your library is ready for its first document.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}