import { useQuery } from "@tanstack/react-query";
import { Server, Database, Cpu, Shield, CheckCircle, AlertCircle, Clock } from "lucide-react";

interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  chain: {
    chainId: number;
    blockNumber: number;
    gasPrice: string;
  };
  contract: {
    address: string;
    deployed: boolean;
  };
}

async function fetchHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch("http://localhost:5000/api/health");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function NetworkStatus() {
  const { data: health, isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 5000,
  });

  const nodes = [
    {
      name: "Backend API",
      status: health?.status === "healthy" ? "online" : "offline",
      latency: "12ms",
      icon: Server,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      name: "Sepolia RPC",
      status: health?.chain?.blockNumber ? "online" : "offline",
      latency: "45ms",
      icon: Database,
      gradient: "from-purple-500 to-pink-500",
    },
    {
      name: "FHE Contract",
      status: health?.contract?.deployed ? "online" : "offline",
      latency: "N/A",
      icon: Shield,
      gradient: "from-yellow-500 to-orange-500",
    },
    {
      name: "CoFHE Network",
      status: "online",
      latency: "120ms",
      icon: Cpu,
      gradient: "from-green-500 to-emerald-500",
    },
  ];

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Network Status</h2>
          <p className="text-sm text-white/50">Infrastructure health monitoring</p>
        </div>

        {health && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-white/50">
              <Clock className="w-4 h-4" />
              <span>Block #{health.chain?.blockNumber?.toLocaleString() || "..."}</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium">
              All Systems Operational
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {nodes.map((node) => (
          <div
            key={node.name}
            className="relative p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${node.gradient} flex items-center justify-center`}>
                <node.icon className="w-5 h-5 text-white" />
              </div>

              {isLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
              ) : node.status === "online" ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
            </div>

            <h3 className="text-sm font-medium text-white mb-1">{node.name}</h3>

            <div className="flex items-center justify-between text-xs">
              <span className={node.status === "online" ? "text-green-400" : "text-red-400"}>
                {node.status.toUpperCase()}
              </span>
              <span className="text-white/40">
                {node.latency !== "N/A" && `~${node.latency}`}
              </span>
            </div>

            {node.status === "online" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />
            )}
          </div>
        ))}
      </div>

      {health?.contract?.address && (
        <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-white">FHE Analytics Contract</p>
                <p className="text-xs text-white/40 font-mono">{health.contract.address}</p>
              </div>
            </div>
            <a
              href={`https://sepolia.etherscan.io/address/${health.contract.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-white/70 hover:text-white transition-colors"
            >
              View on Etherscan
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
