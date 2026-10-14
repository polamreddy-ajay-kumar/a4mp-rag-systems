import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ArrowRight, FileText, ScanText, Languages, ShieldCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/Brand";
import { pageMeta } from "@/lib/page-meta";
import sculpture from "@/assets/knowledge-sculpture.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => pageMeta("Your personal knowledge, connected", "A4MP RAG SYSTEMS — private document intelligence with cited answers in English and Telugu."),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-5 sm:px-8">
          <Link to="/" aria-label="A4MP RAG SYSTEMS home"><Brand /></Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in <ArrowUpRight /></Link></Button>
            <Button asChild size="sm" className="hidden sm:inline-flex"><Link to="/auth" search={{ mode: "signup" }}>Open workspace <ArrowRight /></Link></Button>
          </div>
        </div>
      </header>
      <section className="relative isolate overflow-hidden border-b border-border">
        <img src={sculpture} alt="Precision glass architecture with illuminated emerald layers" width={1536} height={1024} className="hero-media" />
        <div className="hero-shade" />
        <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:py-28">
          <div className="page-enter max-w-xl">
            <div className="mb-7 flex items-center gap-2 text-xs font-medium text-primary"><span className="size-1.5 rounded-full bg-primary" /> PERSONAL KNOWLEDGE INTELLIGENCE</div>
            <h1 className="text-4xl font-medium leading-[1.12] text-hero-foreground sm:text-6xl">A4MP<br />RAG SYSTEMS<span className="text-primary">.</span></h1>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-hero-muted sm:text-lg">Your documents. Connected.<br />Your answers. Grounded.</p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-hero-muted">A private space to turn your personal library into clear, source-backed understanding.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/auth" search={{ mode: "signup" }}>Create your workspace <ArrowUpRight /></Link></Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-hero-muted"><span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" /> Private by design</span><span>English + తెలుగు</span></div>
          </div>
        </div>
      </section>
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-5 px-5 py-7 sm:grid-cols-4 sm:px-8">
          {["PDF, Word & text", "Source-backed answers", "English + Telugu", "Your private library"].map(t => <div key={t} className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm"><Check className="size-4 shrink-0 text-primary" />{t}</div>)}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-3 text-xs text-primary">BUILT AROUND YOUR KNOWLEDGE</p><h2 className="text-2xl font-medium sm:text-3xl">Less searching. More understanding.</h2></div><Button asChild variant="link" className="px-0"><Link to="/auth">Enter workspace <ArrowUpRight /></Link></Button></div>
        <div className="grid gap-4 md:grid-cols-3">
          {[{ icon: FileText, number: "01", title: "One connected library", text: "Keep your reports, research and notes together in your own private collection." }, { icon: ScanText, number: "02", title: "Answers with evidence", text: "See the source behind each answer. Go deeper with references to your original documents." }, { icon: Languages, number: "03", title: "Think in your language", text: "Continue the conversation in English or Telugu, with your chat history always close by." }].map(({ icon: Icon, number, title, text }) => <article key={number} className="rounded-lg border border-border bg-card p-6"><div className="flex items-center justify-between"><Icon className="size-6 text-primary" /><span className="font-display text-xs text-muted-foreground">{number}</span></div><h3 className="mt-8 text-lg font-medium">{title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p></article>)}
        </div>
      </section>
      <footer className="border-t border-border"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8"><Brand /><p className="text-xs text-muted-foreground">Personal knowledge. Meaningful intelligence.</p></div></footer>
    </div>
  );
}
