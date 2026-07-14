import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Sparkles, Upload, MessageSquare, Shield, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
              <BookOpen className="h-4 w-4" />
            </div>
            A4MP RAG AI
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth" search={{ mode: "signup" }}>
                Get started
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Advanced AI For My Personal RAG
        </div>
        <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl">
          Chat with <span className="text-accent">your own</span> documents.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Upload PDFs, Word docs, and text files. Ask questions in English or Telugu.
          Get precise, cited answers grounded in your personal library.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth" search={{ mode: "signup" }}>
              Start free
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">I have an account</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Upload, title: "Upload anything", body: "PDF, DOCX, and TXT files. Automatically parsed, chunked, and embedded into your private vector library." },
            { icon: MessageSquare, title: "Cited answers", body: "Every response shows which chunks from which files were used. No hallucinations, just retrieval." },
            { icon: Languages, title: "English + Telugu", body: "Ask questions in either language. The assistant replies fluently in whichever you use." },
            { icon: Shield, title: "Private by default", body: "Row-level security ensures each user only ever sees their own documents and conversations." },
            { icon: Sparkles, title: "Semantic search", body: "OpenAI text-embedding-3-small + pgvector HNSW index for lightning-fast similarity search." },
            { icon: BookOpen, title: "Chat history", body: "Threaded conversations saved to your account. Pick up where you left off, on any device." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-6">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/15 text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        A4MP RAG AI · Retrieval-Augmented Generation for your personal knowledge base
      </footer>
    </div>
  );
}
