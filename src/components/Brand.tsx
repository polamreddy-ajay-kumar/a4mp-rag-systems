import logo from "@/assets/brand-logo.png";
import { cn } from "@/lib/utils";

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <img
      src={logo}
      alt="A4MP RAG SYSTEMS"
      className={cn("w-auto select-none", compact ? "h-10" : "h-12", className)}
      draggable={false}
    />
  );
}
