import { useQuery } from "@tanstack/react-query";
import { TrendingUp, ArrowUpRight, Lock, Shield, Activity, Coins } from "lucide-react";

interface SwapStats {
  totalVolumeZec: number;
  totalFeesZec: number;
  swapCount: number;
}

interface TxStats {
  totalVolumeZec: number;
  transactionCount: number;
}

async function fetchSwapAggregates(): Promise<SwapStats> {
  const res = await fetch("http://localhost:5000/api/analytics/swaps/aggregates");
  if (!res.ok) return { totalVolumeZec: 0, totalFeesZec: 0, swapCount: 0 };
  return res.json();
}

async function fetchTransactionAggregates(): Promise<TxStats> {
  const res = await fetch("http://localhost:5000/api/analytics/transactions/aggregates");
  if (!res.ok) return { totalVolumeZec: 0, transactionCount: 0 };
  return res.json();
}

export function StatsGrid() {
  const { data: swaps } = useQuery({
    queryKey: ["swapAggregates"],
    queryFn: fetchSwapAggregates,
  });

  const { data: txs } = useQuery({
    queryKey: ["transactionAggregates"],
    queryFn: fetchTransactionAggregates,
  });

  const stats = [
    {
      label: "Total Swap Volume",
      value: `${(swaps?.totalVolumeZec ?? 0).toFixed(4)} ZEC`,
      change: "+12.5%",
      icon: TrendingUp,
      gradient: "from-yellow-500 to-orange-500",
      glow: "shadow-yellow-500/20",
    },
    {
      label: "Total Fees Collected",
      value: `${(swaps?.totalFeesZec ?? 0).toFixed(6)} ZEC`,
      change: "+8.2%",
      icon: Coins,
      gradient: "from-green-500 to-emerald-500",
      glow: "shadow-green-500/20",
    },
    {
      label: "Swap Transactions",
      value: (swaps?.swapCount ?? 0).toLocaleString(),
      change: "+24",
      icon: Activity,
      gradient: "from-purple-500 to-blue-500",
      glow: "shadow-purple-500/20",
    },
    {
      label: "Private Transactions",
      value: (txs?.transactionCount ?? 0).toLocaleString(),
      change: "+156",
      icon: Shield,
      gradient: "from-pink-500 to-rose-500",
      glow: "shadow-pink-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="relative group"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500`} />

          <div className="relative glass rounded-2xl p-6 hover:bg-white/5 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg ${stat.glow}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>

              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">
                <ArrowUpRight className="w-3 h-3" />
                {stat.change}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-white/50">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>

            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Lock className="w-4 h-4 text-green-400" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
