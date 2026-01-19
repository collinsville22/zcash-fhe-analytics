import { ReactNode } from "react";

interface MetricCardProps {
  icon: ReactNode;
  badge: string;
  value: string;
  label: string;
  footer: string;
  variant: "gold" | "cyan" | "rose" | "violet" | "emerald";
}

const variantStyles = {
  gold: {
    icon: "bg-gold-dim text-gold",
    badge: "bg-gold-dim text-gold",
  },
  cyan: {
    icon: "bg-cyan-dim text-cyan",
    badge: "bg-cyan-dim text-cyan",
  },
  rose: {
    icon: "bg-rose-dim text-rose",
    badge: "bg-rose-dim text-rose",
  },
  violet: {
    icon: "bg-violet-dim text-violet",
    badge: "bg-violet-dim text-violet",
  },
  emerald: {
    icon: "bg-emerald-dim text-emerald",
    badge: "bg-emerald-dim text-emerald",
  },
};

export function MetricCard({ icon, badge, value, label, footer, variant }: MetricCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className="bg-surface border border-border-dim rounded-2xl p-6 transition-all hover:border-border-active hover:bg-elevated">
      <div className="flex items-center justify-between mb-5">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${styles.icon}`}>
          {icon}
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-md font-semibold tracking-wide uppercase ${styles.badge}`}>
          {badge}
        </span>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-zinc-500 mb-3">{label}</div>
      <div className="text-xs text-zinc-600">{footer}</div>
    </div>
  );
}
