import type { ReactNode } from "react";
import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/admin/utils";

const tones = {
  info: { box: "border-info/40 bg-info/10", icon: "text-info", Icon: Info },
  warning: { box: "border-warning/50 bg-warning/10", icon: "text-warning", Icon: AlertTriangle },
  danger: { box: "border-danger/50 bg-danger/10", icon: "text-danger", Icon: OctagonAlert },
} as const;

/** Aviso en línea (banner). `role="alert"` solo para errores. */
export function Notice({ tone = "info", title, children, actions, className }: { tone?: keyof typeof tones; title?: ReactNode; children?: ReactNode; actions?: ReactNode; className?: string }) {
  const { box, icon, Icon } = tones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "note"} className={cn("flex gap-3 rounded-lg border p-3.5 text-sm", box, className)}>
      <Icon aria-hidden size={18} className={cn("mt-0.5 shrink-0", icon)} />
      <div className="min-w-0 flex-1 space-y-1">
        {title ? <p className="font-semibold text-text">{title}</p> : null}
        {children ? <div className="text-[13px] leading-relaxed text-text/90">{children}</div> : null}
        {actions ? <div className="pt-1.5">{actions}</div> : null}
      </div>
    </div>
  );
}
