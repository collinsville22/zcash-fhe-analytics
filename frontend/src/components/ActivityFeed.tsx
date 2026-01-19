import { useEffect, useState } from "react";
import { Lock, ArrowRightLeft, Send, Shield, Clock } from "lucide-react";

interface Activity {
  id: string;
  type: "swap" | "transaction" | "encrypt";
  description: string;
  time: string;
  encrypted: boolean;
  hash: string;
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const types: ("swap" | "transaction" | "encrypt")[] = ["swap", "transaction", "encrypt"];
    const descriptions = {
      swap: ["ZEC → USDC swap encrypted", "Cross-chain swap recorded", "DEX swap aggregated"],
      transaction: ["Private transfer logged", "Shielded tx processed", "Z-address activity"],
      encrypt: ["Value encrypted to FHE", "Batch encryption complete", "Ciphertext updated"],
    };

    const generateActivity = (): Activity => {
      const type = types[Math.floor(Math.random() * types.length)];
      return {
        id: Math.random().toString(36).slice(2),
        type,
        description: descriptions[type][Math.floor(Math.random() * 3)],
        time: "Just now",
        encrypted: true,
        hash: `0x${Math.random().toString(16).slice(2, 10)}...`,
      };
    };

    setActivities(Array.from({ length: 5 }, generateActivity));

    const interval = setInterval(() => {
      setActivities((prev) => {
        const newActivity = generateActivity();
        const updated = [newActivity, ...prev.slice(0, 4)];
        return updated.map((a, i) => ({
          ...a,
          time: i === 0 ? "Just now" : i === 1 ? "1m ago" : i === 2 ? "3m ago" : i === 3 ? "5m ago" : "8m ago",
        }));
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "swap":
        return ArrowRightLeft;
      case "transaction":
        return Send;
      case "encrypt":
        return Lock;
      default:
        return Shield;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case "swap":
        return "from-yellow-500 to-orange-500";
      case "transaction":
        return "from-green-500 to-emerald-500";
      case "encrypt":
        return "from-purple-500 to-blue-500";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  return (
    <div className="glass rounded-2xl p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Live Activity</h2>
          <p className="text-sm text-white/50">Encrypted operations stream</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-medium">Live</span>
        </div>
      </div>

      <div className="space-y-4">
        {activities.map((activity, index) => {
          const Icon = getIcon(activity.type);
          const gradient = getColor(activity.type);

          return (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors"
              style={{
                animation: index === 0 ? "slide-up 0.3s ease-out" : undefined,
              }}
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-white truncate">{activity.description}</p>
                  {activity.encrypted && (
                    <Shield className="w-3 h-3 text-green-400 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-white/40">
                  <span className="font-mono">{activity.hash}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {activity.time}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/40">All data encrypted with TFHE</span>
          <button className="text-yellow-400 hover:text-yellow-300 transition-colors font-medium">
            View All
          </button>
        </div>
      </div>
    </div>
  );
}
