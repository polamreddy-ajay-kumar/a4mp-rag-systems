import { Layers3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-3", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-md border border-primary/30 bg-primary/10 text-primary"><Layers3 className="size-5" /></span>
      <span className="min-w-0 font-display text-sm font-semibold">A4MP <span className={compact ? "block text-[10px] font-medium tracking-normal text-muted-foreground" : "font-normal text-muted-foreground"}>RAG SYSTEMS</span></span>
    </span>
  );
}