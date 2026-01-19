import { useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { Shield, Lock, Eye, Wallet, ArrowRight } from "lucide-react";

export function ConnectPrompt() {
  const { connect } = useConnect();

  const features = [
    {
      icon: Shield,
      title: "Fully Homomorphic Encryption",
      description: "Compute on encrypted data without decryption",
      gradient: "from-yellow-500 to-orange-500",
    },
    {
      icon: Lock,
      title: "Threshold Decryption",
      description: "Aggregates revealed only with consensus",
      gradient: "from-green-500 to-emerald-500",
    },
    {
      icon: Eye,
      title: "Privacy-First Analytics",
      description: "Individual transactions remain confidential",
      gradient: "from-purple-500 to-blue-500",
    },
  ];

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="max-w-4xl mx-auto text-center">
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 bg-yellow-500/30 blur-3xl rounded-full" />
          <div className="relative w-32 h-32 mx-auto">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 animate-ripple" />
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 animate-ripple" style={{ animationDelay: "0.5s" }} />
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center animate-shield">
              <Shield className="w-12 h-12 text-black" />
            </div>
          </div>
        </div>

        <h2 className="text-5xl font-bold mb-4">
          <span className="text-gradient-gold">Privacy-Preserving</span>
          <br />
          <span className="text-white">Analytics Dashboard</span>
        </h2>

        <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">
          Explore Zcash network analytics powered by Fully Homomorphic Encryption.
          Your data stays encrypted while we compute meaningful insights.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="glass rounded-2xl p-6 hover:bg-white/5 transition-colors animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 mx-auto`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-white/50">{feature.description}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => connect({ connector: injected() })}
          className="relative group inline-flex"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-yellow-600 blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
          <div className="relative px-8 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl font-bold text-lg text-black flex items-center gap-3 hover:scale-105 transition-transform">
            <Wallet className="w-6 h-6" />
            Connect to Explore
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>
    </div>
  );
}
