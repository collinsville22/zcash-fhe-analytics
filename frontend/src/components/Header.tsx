import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { Shield, Wallet, LogOut, Zap } from "lucide-react";

export function Header() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="relative border-b border-white/5">
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-green-500/5" />

      <div className="relative container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full" />
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center animate-pulse-glow">
                <Shield className="w-7 h-7 text-black" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="text-gradient-gold">Zcash</span>
                <span className="text-white/90 ml-2">FHE Analytics</span>
              </h1>
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Zap className="w-3 h-3 text-green-400" />
                <span>Privacy-Preserving Intelligence</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 glass rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-white/70">Sepolia Testnet</span>
            </div>

            {isConnected ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 px-4 py-2 glass-strong rounded-full">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-mono text-sm text-white/90">
                    {formatAddress(address!)}
                  </span>
                </div>

                <button
                  onClick={() => disconnect()}
                  className="p-2 glass rounded-lg hover:bg-red-500/10 transition-colors group"
                >
                  <LogOut className="w-5 h-5 text-white/50 group-hover:text-red-400 transition-colors" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => connect({ connector: injected() })}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-yellow-600 blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl font-semibold text-black flex items-center gap-2 hover:scale-105 transition-transform">
                  <Wallet className="w-5 h-5" />
                  Connect Wallet
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
