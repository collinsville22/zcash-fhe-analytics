import { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  value: string;
  label: string;
  meta?: string;
  variant: "gold" | "cyan" | "rose" | "violet" | "emerald";
}

const variantStyles = {
  gold: {
    card: "hover:border-gold",
    icon: "bg-gold-dim text-gold",
    meta: "text-gold",
  },
  cyan: {
    card: "hover:border-cyan",
    icon: "bg-cyan-dim text-cyan",
    meta: "text-cyan",
  },
  rose: {
    card: "hover:border-rose",
    icon: "bg-rose-dim text-rose",
    meta: "text-rose",
  },
  violet: {
    card: "hover:border-violet",
    icon: "bg-violet-dim text-violet",
    meta: "text-violet",
  },
  emerald: {
    card: "hover:border-emerald",
    icon: "bg-emerald-dim text-emerald",
    meta: "text-emerald",
  },
};

export function StatCard({ icon, value, label, meta, variant }: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={`bg-surface border border-border-dim rounded-2xl p-7 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${styles.card}`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${styles.icon}`}>
        {icon}
      </div>
      <div className="text-4xl font-bold mb-2 leading-none">{value}</div>
      <div className="text-sm text-zinc-500 uppercase tracking-wider mb-3">{label}</div>
      {meta && (
        <span className={`text-xs px-3 py-1 bg-elevated rounded-full font-mono ${styles.meta}`}>
          {meta}
        </span>
      )}
    </div>
  );
}
