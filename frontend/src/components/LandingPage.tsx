import React from 'react';
import { Shield, ArrowRight, TrendingUp, Landmark, Activity, Lock, ChevronDown, Github, BookOpen, ExternalLink } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

interface LandingPageProps {
  onLaunchApp: () => void;
}

/**
 * LandingPage Component
 * Marketing landing page that explains BitFlow Lend to both
 * DeFi-savvy and non-technical users.
 */
export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchApp }) => {
  const [featuresRef, featuresVisible] = useScrollReveal<HTMLDivElement>();
  const [stepsRef, stepsVisible] = useScrollReveal<HTMLDivElement>();
  const [statsRef, statsVisible] = useScrollReveal<HTMLDivElement>();
  const [securityRef, securityVisible] = useScrollReveal<HTMLDivElement>();
  const [ctaRef, ctaVisible] = useScrollReveal<HTMLDivElement>();

  return (
    <div className="min-h-screen bg-white animate-fade-in">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 gradient-dark" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/8 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4" />

        {/* Nav */}
        <nav className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5" aria-label="Landing page navigation">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo-dark.svg" alt="BitFlow Lend" className="h-8 sm:h-9" />
            </div>
            <button
              type="button"
              onClick={onLaunchApp}
              className="btn text-sm bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm"
            >
              Launch App
              <ArrowRight size={16} />
            </button>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-24 sm:pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-sm text-slate-300 mb-8 backdrop-blur-sm animate-fade-in">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Built on Stacks — Secured by Bitcoin
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-6 animate-fade-up">
            Decentralized Lending
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-400 to-accent-500">
              Powered by Bitcoin
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-300 leading-relaxed mb-10" style={{ animationDelay: '0.1s' }}>
            Deposit STX as collateral, borrow against it, and manage your positions — all
            through transparent Clarity smart contracts on the Stacks blockchain.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center" style={{ animationDelay: '0.2s' }}>
            <button
              type="button"
              onClick={onLaunchApp}
              className="btn btn-primary text-base px-8 py-3.5 shadow-glow"
            >
              Launch App
              <ArrowRight size={18} />
            </button>
            <a
              href="https://github.com/Yusufolosun/bitflow-lend"
              target="_blank"
              rel="noopener noreferrer"
              className="btn text-base px-8 py-3.5 bg-white/10 text-white border border-white/20 hover:bg-white/20"
            >
              <Github size={18} />
              View Source
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="relative z-10 flex justify-center pb-8 animate-bounce">
          <ChevronDown size={24} className="text-slate-500" />
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="py-20 sm:py-28 bg-gray-50 bg-grid-pattern">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-accent-500 uppercase tracking-widest mb-3">Core Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
              Everything you need to lend and borrow
            </h2>
            <p className="max-w-2xl mx-auto text-gray-600 leading-relaxed">
              A complete DeFi lending protocol with transparent on-chain mechanics,
              real-time health monitoring, and no hidden fees.
            </p>
          </div>

          <div ref={featuresRef} className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 transition-all duration-700 ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {[
              {
                icon: <Landmark size={24} />,
                title: 'Deposit & Earn',
                desc: 'Deposit STX into the vault. Your deposits serve as collateral and earn you borrowing power.',
                color: 'bg-accent-50 text-accent-600',
              },
              {
                icon: <TrendingUp size={24} />,
                title: 'Borrow Against Collateral',
                desc: 'Borrow STX against your deposited collateral at configurable interest rates and terms.',
                color: 'bg-emerald-50 text-emerald-600',
              },
              {
                icon: <Activity size={24} />,
                title: 'Health Monitoring',
                desc: 'Real-time collateral ratio tracking with proactive warnings before liquidation thresholds.',
                color: 'bg-purple-50 text-purple-600',
              },
              {
                icon: <Shield size={24} />,
                title: 'Transparent Liquidation',
                desc: 'Fully on-chain liquidation mechanics with a 5% bonus for liquidators. No surprises.',
                color: 'bg-amber-50 text-amber-600',
              },
            ].map((feature) => (
              <div key={feature.title} className="card-elevated card-hover p-6 group">
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-accent-500 uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
              Four steps to start lending
            </h2>
            <p className="max-w-2xl mx-auto text-gray-600 leading-relaxed">
              From wallet connection to active loan management — all on-chain,
              all transparent.
            </p>
          </div>

          <div ref={stepsRef} className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 transition-all duration-700 ${stepsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {[
              { step: '01', title: 'Connect Wallet', desc: 'Connect your Stacks wallet (Leather or Xverse) to authenticate securely.' },
              { step: '02', title: 'Deposit STX', desc: 'Deposit STX into the vault. This becomes your available collateral.' },
              { step: '03', title: 'Borrow', desc: 'Borrow up to 66% of your collateral value at your chosen interest rate and term.' },
              { step: '04', title: 'Repay & Withdraw', desc: 'Repay your loan with accrued interest to unlock collateral for withdrawal.' },
            ].map((item) => (
              <div key={item.step} className="relative text-center sm:text-left">
                <div className="text-5xl font-extrabold text-accent-500/10 mb-3">{item.step}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PROTOCOL STATS BANNER ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-accent-400 uppercase tracking-widest mb-3">Protocol</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Built for reliability
            </h2>
          </div>

          <div ref={statsRef} className={`grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 transition-all duration-700 ${statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {[
              { label: 'Min Collateral Ratio', value: '150%', sub: 'Over-collateralized' },
              { label: 'Liquidation Threshold', value: '110%', sub: 'Safety buffer' },
              { label: 'Liquidation Bonus', value: '5%', sub: 'For liquidators' },
              { label: 'Smart Contract', value: 'Clarity', sub: 'Decidable language' },
            ].map((stat) => (
              <div key={stat.label} className="text-center rounded-2xl bg-white/5 border border-white/10 p-6">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm font-medium text-slate-300 mb-1">{stat.label}</div>
                <div className="text-xs text-slate-500">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SECURITY & TRUST ===== */}
      <section className="py-20 sm:py-28 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div ref={securityRef} className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center transition-all duration-700 ${securityVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div>
              <p className="text-sm font-semibold text-accent-500 uppercase tracking-widest mb-3">Security</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-6">
                Transparency at every layer
              </h2>
              <p className="text-gray-600 leading-relaxed mb-8">
                BitFlow Lend is built on Clarity — a decidable smart contract language
                that makes it impossible to compile code with certain classes of bugs.
                Every transaction, every interest calculation, every liquidation is
                verifiable on-chain.
              </p>
              <div className="space-y-4">
                {[
                  { icon: <Lock size={18} />, text: 'Non-custodial — you always control your keys' },
                  { icon: <Shield size={18} />, text: 'Open-source contracts on GitHub' },
                  { icon: <Activity size={18} />, text: 'On-chain oracle price verification' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <span className="text-sm text-gray-700 font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-soft">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Frequently Asked Questions</h3>
              <div className="space-y-4">
                {[
                  {
                    q: 'What is BitFlow Lend?',
                    a: 'A decentralized lending protocol on Stacks where you deposit STX as collateral and borrow against it via transparent smart contracts.',
                  },
                  {
                    q: 'What happens if my collateral ratio drops?',
                    a: 'If your ratio falls below 110%, your position becomes eligible for liquidation. You\'ll see warnings well before this threshold.',
                  },
                  {
                    q: 'Are there hidden fees?',
                    a: 'No. Interest rates are set at borrow time. The only additional cost is standard Stacks network transaction fees (~0.001 STX).',
                  },
                  {
                    q: 'Can I withdraw anytime?',
                    a: 'Yes — any STX not locked as collateral for an active loan can be withdrawn immediately.',
                  },
                ].map((faq) => (
                  <details key={faq.q} className="group border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <summary className="flex items-center justify-between cursor-pointer text-sm font-semibold text-gray-900 hover:text-accent-600 transition-colors">
                      {faq.q}
                      <ChevronDown size={16} className="text-gray-400 group-open:rotate-180 transition-transform" />
                    </summary>
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-20 sm:py-28 bg-white">
        <div ref={ctaRef} className={`max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center transition-all duration-700 ${ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4">
            Ready to start lending?
          </h2>
          <p className="text-gray-600 leading-relaxed mb-8">
            Connect your wallet and make your first deposit in under a minute.
            No sign-ups, no KYC — just your Stacks wallet.
          </p>
          <button
            type="button"
            onClick={onLaunchApp}
            className="btn btn-primary text-base px-10 py-4 shadow-glow"
          >
            Launch App
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="BitFlow Lend" className="h-7" />
              <span className="text-sm text-gray-500">© 2026 BitFlow Lend</span>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/Yusufolosun/bitflow-lend/tree/main/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                <BookOpen size={14} />
                Docs
              </a>
              <a
                href="https://github.com/Yusufolosun/bitflow-lend"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                <Github size={14} />
                GitHub
              </a>
              <a
                href="https://explorer.hiro.so"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ExternalLink size={14} />
                Explorer
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
