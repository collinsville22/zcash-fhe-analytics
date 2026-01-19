import { useEffect, useState, useMemo } from "react";
import { Unlock, ArrowRight, Shield, Cpu } from "lucide-react";

interface DataPoint {
  id: number;
  value: string;
  encrypted: string;
  x: number;
  phase: "raw" | "encrypting" | "encrypted" | "computing" | "aggregated";
}

export function EncryptionVisualizer() {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [aggregateRevealed, setAggregateRevealed] = useState(false);

  const generateEncryptedValue = () => {
    const chars = "0123456789abcdef";
    return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  useEffect(() => {
    const initialPoints: DataPoint[] = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      value: (Math.random() * 10).toFixed(4),
      encrypted: generateEncryptedValue(),
      x: (i + 1) * (100 / 7),
      phase: "raw" as const,
    }));
    setDataPoints(initialPoints);

    let phase = 0;
    const interval = setInterval(() => {
      phase = (phase + 1) % 5;

      if (phase === 0) {
        setDataPoints(
          Array.from({ length: 6 }, (_, i) => ({
            id: i,
            value: (Math.random() * 10).toFixed(4),
            encrypted: generateEncryptedValue(),
            x: (i + 1) * (100 / 7),
            phase: "raw" as const,
          }))
        );
        setAggregateRevealed(false);
      } else if (phase === 1) {
        setDataPoints((prev) => prev.map((p) => ({ ...p, phase: "encrypting" as const })));
      } else if (phase === 2) {
        setDataPoints((prev) => prev.map((p) => ({ ...p, phase: "encrypted" as const })));
      } else if (phase === 3) {
        setDataPoints((prev) => prev.map((p) => ({ ...p, phase: "computing" as const })));
      } else {
        setDataPoints((prev) => prev.map((p) => ({ ...p, phase: "aggregated" as const })));
        setAggregateRevealed(true);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const aggregate = useMemo(() => {
    return dataPoints.reduce((sum, p) => sum + parseFloat(p.value || "0"), 0).toFixed(4);
  }, [dataPoints]);

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "raw":
        return "border-red-500 bg-red-500/10 text-red-400";
      case "encrypting":
        return "border-yellow-500 bg-yellow-500/10 text-yellow-400";
      case "encrypted":
        return "border-green-500 bg-green-500/10 text-green-400";
      case "computing":
        return "border-purple-500 bg-purple-500/10 text-purple-400";
      case "aggregated":
        return "border-blue-500 bg-blue-500/10 text-blue-400";
      default:
        return "border-gray-500 bg-gray-500/10";
    }
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">FHE Encryption Pipeline</h2>
          <p className="text-sm text-white/50">Real-time visualization of homomorphic operations</p>
        </div>

        <div className="flex items-center gap-2">
          {["Raw", "Encrypting", "Encrypted", "Computing", "Revealed"].map((label, i) => (
            <div
              key={label}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                i === ["raw", "encrypting", "encrypted", "computing", "aggregated"].indexOf(dataPoints[0]?.phase)
                  ? "bg-white/20 text-white"
                  : "bg-white/5 text-white/40"
              }`}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="relative h-64 mb-6">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/50 flex items-center justify-center mb-2">
            <Unlock className="w-6 h-6 text-red-400" />
          </div>
          <span className="text-xs text-white/50">Input</span>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-2 transition-all duration-500 ${
            dataPoints[0]?.phase === "computing"
              ? "bg-purple-500/30 border-2 border-purple-500 animate-pulse"
              : "bg-white/5 border border-white/10"
          }`}>
            <Cpu className={`w-8 h-8 ${dataPoints[0]?.phase === "computing" ? "text-purple-400" : "text-white/30"}`} />
          </div>
          <span className="text-xs text-white/50">FHE Compute</span>
        </div>

        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all duration-500 ${
            aggregateRevealed
              ? "bg-green-500/20 border border-green-500/50"
              : "bg-white/5 border border-white/10"
          }`}>
            <Shield className={`w-6 h-6 ${aggregateRevealed ? "text-green-400" : "text-white/30"}`} />
          </div>
          <span className="text-xs text-white/50">Aggregate</span>
        </div>

        {dataPoints.map((point, index) => (
          <div
            key={point.id}
            className="absolute transition-all duration-1000 ease-in-out"
            style={{
              left: `${10 + (point.phase === "aggregated" ? 75 : point.phase === "computing" ? 45 : point.x * 0.6)}%`,
              top: point.phase === "aggregated" ? "50%" : `${20 + (index % 3) * 25}%`,
              transform: "translate(-50%, -50%)",
              opacity: point.phase === "aggregated" ? 0 : 1,
            }}
          >
            <div className={`px-3 py-2 rounded-lg border text-xs font-mono transition-all duration-500 ${getPhaseColor(point.phase)}`}>
              {point.phase === "raw" ? point.value : point.phase === "encrypting" ? "..." : point.encrypted.slice(0, 8)}
            </div>
          </div>
        ))}

        {aggregateRevealed && (
          <div className="absolute right-20 top-1/2 -translate-y-1/2 animate-slide-up">
            <div className="px-4 py-3 rounded-xl bg-green-500/20 border border-green-500/50 text-green-400 font-bold">
              Σ = {aggregate} ZEC
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 text-sm text-white/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Plaintext (Vulnerable)</span>
        </div>
        <ArrowRight className="w-4 h-4" />
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Encrypted (Secure)</span>
        </div>
        <ArrowRight className="w-4 h-4" />
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Aggregate Only</span>
        </div>
      </div>
    </div>
  );
}
