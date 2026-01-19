import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const API_BASE = "http://localhost:5000/api";

type Timeframe = "1h" | "24h" | "7d" | "30d" | "all";

interface HealthData {
  status: string;
  version: string;
  chainId: number;
  contractAddress: string;
  swapCount: number;
  transactionCount: number;
}

interface SwapAnalytics {
  count: number;
  byDestination: Record<string, number>;
  byPlatform: Record<string, number>;
  lastTimestamp: number;
  timeframe: string;
}

interface TxAnalytics {
  count: number;
  byType: Record<string, number>;
  byPool: Record<string, number>;
  byPlatform: Record<string, number>;
  lastTimestamp: number;
  timeframe: string;
}

interface SwapAggregate {
  totalVolumeZec: number;
  totalFeesZec: number;
  swapCount: number;
  timeframe: string;
}

interface TxAggregate {
  totalVolumeZec: number;
  totalFeesZec: number;
  transactionCount: number;
  timeframe: string;
}

interface TimeseriesPoint {
  timestamp: number;
  swaps: number;
  transactions: number;
  volume: number;
}

interface TimeseriesData {
  data: TimeseriesPoint[];
  timeframe: string;
}

async function fetchHealth(): Promise<HealthData> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function fetchSwapAnalytics(timeframe: Timeframe): Promise<SwapAnalytics> {
  const res = await fetch(`${API_BASE}/analytics/swaps?timeframe=${timeframe}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function fetchTxAnalytics(timeframe: Timeframe): Promise<TxAnalytics> {
  const res = await fetch(`${API_BASE}/analytics/transactions?timeframe=${timeframe}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function fetchSwapAggregate(timeframe: Timeframe): Promise<SwapAggregate> {
  const res = await fetch(`${API_BASE}/analytics/swaps/aggregate?timeframe=${timeframe}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function fetchTxAggregate(timeframe: Timeframe): Promise<TxAggregate> {
  const res = await fetch(`${API_BASE}/analytics/transactions/aggregate?timeframe=${timeframe}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function fetchTimeseries(timeframe: Timeframe): Promise<TimeseriesData> {
  const res = await fetch(`${API_BASE}/analytics/timeseries?timeframe=${timeframe === "all" ? "30d" : timeframe}`);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

type TabType = "overview" | "swaps" | "transactions";

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: "1h", label: "1H" },
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "all", label: "All" },
];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [timeframe, setTimeframe] = useState<Timeframe>("all");

  const { data: health } = useQuery({ queryKey: ["health"], queryFn: fetchHealth, refetchInterval: 10000 });
  const { data: swapAnalytics } = useQuery({ queryKey: ["swapAnalytics", timeframe], queryFn: () => fetchSwapAnalytics(timeframe), refetchInterval: 10000 });
  const { data: txAnalytics } = useQuery({ queryKey: ["txAnalytics", timeframe], queryFn: () => fetchTxAnalytics(timeframe), refetchInterval: 10000 });
  const { data: swapAggregate } = useQuery({ queryKey: ["swapAggregate", timeframe], queryFn: () => fetchSwapAggregate(timeframe), refetchInterval: 10000 });
  const { data: txAggregate } = useQuery({ queryKey: ["txAggregate", timeframe], queryFn: () => fetchTxAggregate(timeframe), refetchInterval: 10000 });
  const { data: timeseries } = useQuery({ queryKey: ["timeseries", timeframe], queryFn: () => fetchTimeseries(timeframe), refetchInterval: 10000 });

  const destinationData = Object.entries(swapAnalytics?.byDestination ?? {}).map(([name, value]) => ({ name, value }));
  const platformData = Object.entries(swapAnalytics?.byPlatform ?? {}).map(([name, value]) => ({ name, value }));
  const txTypeData = Object.entries(txAnalytics?.byType ?? {}).map(([name, value]) => ({ name, value }));
  const poolData = Object.entries(txAnalytics?.byPool ?? {}).map(([name, value]) => ({ name, value }));

  const formatTime = (ts: number) => {
    if (!ts) return "—";
    return new Date(ts * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const totalVolume = (swapAggregate?.totalVolumeZec ?? 0) + (txAggregate?.totalVolumeZec ?? 0);
  const totalFees = (swapAggregate?.totalFeesZec ?? 0) + (txAggregate?.totalFeesZec ?? 0);
  const totalOps = (swapAnalytics?.count ?? 0) + (txAnalytics?.count ?? 0);

  const overviewChartData = [
    { name: "Swaps", value: swapAnalytics?.count ?? 0 },
    { name: "Transactions", value: txAnalytics?.count ?? 0 },
  ];

  const volumeChartData = [
    { name: "Swap Vol", value: swapAggregate?.totalVolumeZec ?? 0 },
    { name: "Tx Vol", value: txAggregate?.totalVolumeZec ?? 0 },
  ];

  const timeseriesChartData = (timeseries?.data ?? []).map((point) => ({
    time: new Date(point.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    ops: point.swaps + point.transactions,
    volume: point.volume,
  }));

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Logo />
              <span className="text-base font-medium text-neutral-900 tracking-tight">ciphervault</span>
            </div>
            <nav className="flex items-center gap-6">
              <span className="text-sm text-neutral-900">Analytics</span>
              <a
                href={`https://sepolia.etherscan.io/address/${health?.contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                Contract ↗
              </a>
              <span className="text-sm text-neutral-500">{health?.status === "operational" ? "● Live" : "○ Offline"}</span>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-10">
          <div className="flex gap-1 border-b border-neutral-200">
            {(["overview", "swaps", "transactions"] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm capitalize transition-colors relative ${
                  activeTab === tab ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-600"
                }`}
              >
                {tab}
                {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-px bg-neutral-900" />}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-neutral-100 rounded-md p-0.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                  timeframe === tf.value
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-10">
            <section>
              <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-6">
                Summary
                {timeframe !== "all" && <span className="ml-2 text-neutral-300">· {TIMEFRAMES.find(t => t.value === timeframe)?.label}</span>}
              </h2>
              <div className="grid grid-cols-4 gap-8">
                <Metric label="Total Volume" value={totalVolume.toFixed(8)} suffix="ZEC" />
                <Metric label="Total Fees" value={totalFees.toFixed(8)} suffix="ZEC" />
                <Metric label="Operations" value={totalOps} />
                <Metric label="Last Activity" value={formatTime(Math.max(swapAnalytics?.lastTimestamp ?? 0, txAnalytics?.lastTimestamp ?? 0))} small />
              </div>
            </section>

            <section className="grid grid-cols-2 gap-12">
              <div>
                <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-6">Operations Breakdown</h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overviewChartData} layout="vertical" margin={{ left: 0, right: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#525252" }} width={90} />
                      <Tooltip content={<MinimalTooltip />} />
                      <Bar dataKey="value" fill="#171717" radius={2} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-6">Volume Distribution</h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volumeChartData} layout="vertical" margin={{ left: 0, right: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#525252" }} width={90} />
                      <Tooltip content={<MinimalTooltip suffix=" ZEC" />} />
                      <Bar dataKey="value" fill="#171717" radius={2} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {timeframe !== "all" && timeseriesChartData.length > 0 && (
              <section>
                <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-6">Activity Over Time</h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeseriesChartData} margin={{ left: 0, right: 0, top: 5, bottom: 5 }}>
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#a3a3a3" }} interval="preserveStartEnd" />
                      <YAxis hide />
                      <Tooltip content={<MinimalTooltip suffix=" ops" />} />
                      <Line type="monotone" dataKey="ops" stroke="#171717" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-6">Network</h2>
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <p className="text-sm text-neutral-400 mb-1">Chain</p>
                  <p className="text-sm text-neutral-900">{health?.chainId === 11155111 ? "Sepolia" : health?.chainId ?? "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-400 mb-1">Contract</p>
                  <p className="text-sm text-neutral-900 font-mono">{health?.contractAddress ?? "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-400 mb-1">Version</p>
                  <p className="text-sm text-neutral-900">{health?.version ?? "—"}</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "swaps" && (
          <div className="space-y-10">
            <section>
              <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-6">
                Swap Metrics
                {timeframe !== "all" && <span className="ml-2 text-neutral-300">· {TIMEFRAMES.find(t => t.value === timeframe)?.label}</span>}
              </h2>
              <div className="grid grid-cols-4 gap-8">
                <Metric label="Volume" value={(swapAggregate?.totalVolumeZec ?? 0).toFixed(8)} suffix="ZEC" />
                <Metric label="Fees" value={(swapAggregate?.totalFeesZec ?? 0).toFixed(8)} suffix="ZEC" />
                <Metric label="Count" value={swapAggregate?.swapCount ?? 0} />
                <Metric label="Last Swap" value={formatTime(swapAnalytics?.lastTimestamp ?? 0)} small />
              </div>
            </section>

            <section className="grid grid-cols-2 gap-12">
              <div>
                <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-6">By Destination</h2>
                <div className="h-56">
                  {destinationData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={destinationData} layout="vertical" margin={{ left: 0, right: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#525252" }} width={80} />
                        <Tooltip content={<MinimalTooltip />} />
                        <Bar dataKey="value" fill="#171717" radius={2} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyState label="No destination data" />}
                </div>
              </div>
              <div>
                <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-6">By Platform</h2>
                <div className="h-56">
                  {platformData.length > 0 ? (
                    <div className="flex items-center h-full">
                      <ResponsiveContainer width="45%" height="100%">
                        <PieChart>
                          <Pie data={platformData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" stroke="none">
                            {platformData.map((_, i) => <Cell key={i} fill={i === 0 ? "#171717" : i === 1 ? "#525252" : i === 2 ? "#a3a3a3" : "#d4d4d4"} />)}
                          </Pie>
                          <Tooltip content={<MinimalTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-3 pl-4">
                        {platformData.map((item, i) => (
                          <div key={item.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ background: i === 0 ? "#171717" : i === 1 ? "#525252" : i === 2 ? "#a3a3a3" : "#d4d4d4" }} />
                              <span className="text-sm text-neutral-600">{item.name}</span>
                            </div>
                            <span className="text-sm font-medium text-neutral-900">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <EmptyState label="No platform data" />}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="space-y-10">
            <section>
              <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-6">
                Transaction Metrics
                {timeframe !== "all" && <span className="ml-2 text-neutral-300">· {TIMEFRAMES.find(t => t.value === timeframe)?.label}</span>}
              </h2>
              <div className="grid grid-cols-4 gap-8">
                <Metric label="Volume" value={(txAggregate?.totalVolumeZec ?? 0).toFixed(8)} suffix="ZEC" />
                <Metric label="Fees" value={(txAggregate?.totalFeesZec ?? 0).toFixed(8)} suffix="ZEC" />
                <Metric label="Count" value={txAggregate?.transactionCount ?? 0} />
                <Metric label="Last Transaction" value={formatTime(txAnalytics?.lastTimestamp ?? 0)} small />
              </div>
            </section>

            <section className="grid grid-cols-2 gap-12">
              <div>
                <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-6">By Type</h2>
                <div className="h-56">
                  {txTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={txTypeData} margin={{ left: 0, right: 0, bottom: 0 }}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#525252" }} />
                        <YAxis hide />
                        <Tooltip content={<MinimalTooltip />} />
                        <Bar dataKey="value" fill="#171717" radius={2} barSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyState label="No type data" />}
                </div>
              </div>
              <div>
                <h2 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-6">By Pool</h2>
                <div className="h-56">
                  {poolData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={poolData} layout="vertical" margin={{ left: 0, right: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: "#525252" }} width={80} />
                        <Tooltip content={<MinimalTooltip />} />
                        <Bar dataKey="value" fill="#171717" radius={2} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyState label="No pool data" />}
                </div>
              </div>
            </section>
          </div>
        )}

        <footer className="mt-16 pt-6 border-t border-neutral-200 flex items-center justify-between">
          <p className="text-xs text-neutral-400">ciphervault · FHE analytics</p>
          <p className="text-xs text-neutral-400 font-mono">{health?.contractAddress ?? ""}</p>
        </footer>
      </main>
    </div>
  );
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="2" y="2" width="24" height="24" rx="6" stroke="#171717" strokeWidth="1.5" />
      <rect x="7" y="7" width="14" height="14" rx="3" fill="#171717" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" fill="white" />
    </svg>
  );
}

function Metric({ label, value, suffix, small }: { label: string; value: string | number; suffix?: string; small?: boolean }) {
  return (
    <div>
      <p className="text-sm text-neutral-400 mb-2">{label}</p>
      <p className={`font-medium text-neutral-900 ${small ? "text-base" : "text-2xl"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
        {suffix && <span className="text-sm font-normal text-neutral-400 ml-1">{suffix}</span>}
      </p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="h-full flex items-center justify-center border border-dashed border-neutral-200 rounded">
      <p className="text-sm text-neutral-300">{label}</p>
    </div>
  );
}

function MinimalTooltip({ active, payload, suffix = "" }: { active?: boolean; payload?: Array<{ value: number }>; suffix?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-neutral-900 text-white text-xs px-2 py-1 rounded">
      {payload[0].value}{suffix}
    </div>
  );
}
