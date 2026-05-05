import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="text-xl font-bold text-white">ApplyReady</span>
        <Link
          href="/tailor"
          className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
        >
          Try Free →
        </Link>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 pt-20 pb-24 max-w-4xl mx-auto">
        <div className="inline-block bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 tracking-wide uppercase">
          AI-Powered · ATS-Optimized
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-tight mb-6">
          Your resume,{" "}
          <span className="text-indigo-400">tailored</span>{" "}
          for every job.
        </h1>
        <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10">
          Upload your resume, paste a job description — ApplyReady rewrites it to match the role and beat ATS filters. In seconds.
        </p>
        <Link
          href="/tailor"
          className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-lg px-10 py-4 rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
        >
          Tailor My Resume Free →
        </Link>
        <p className="text-slate-600 text-sm mt-4">No sign-up needed · Takes 30 seconds</p>
      </section>

      {/* How it works */}
      <section className="bg-slate-800/50 border-y border-slate-700/50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">How it works</h2>
          <p className="text-slate-400 text-center mb-14">Three steps. Thirty seconds.</p>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: "1", icon: "📄", title: "Upload your resume", desc: "Drop in your current resume — PDF or DOCX. We never store your file." },
              { step: "2", icon: "📋", title: "Paste the job description", desc: "Copy the full job posting and paste it in. The more detail, the better the match." },
              { step: "3", icon: "✅", title: "Download your new resume", desc: "Claude AI rewrites your resume to mirror the JD keywords and pass ATS scanners." },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">
                  {icon}
                </div>
                <div className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-2">Step {step}</div>
                <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why ApplyReady */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-3">Why ApplyReady?</h2>
        <p className="text-slate-400 text-center mb-14">Built for the modern job search.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: "🤖", title: "Claude AI", desc: "Powered by Anthropic's Claude — one of the most capable AI models for writing." },
            { icon: "📊", title: "ATS-Optimized", desc: "Mirrors the exact keywords recruiters' ATS systems scan for. More interviews, less ghosting." },
            { icon: "⚡", title: "30 seconds", desc: "Faster than any human resume writer. Apply to more jobs, faster." },
            { icon: "🔒", title: "Private by default", desc: "Your resume is never stored. Processed in real-time and gone." },
            { icon: "📝", title: "PDF & DOCX export", desc: "Download your tailored resume in whatever format the job posting asks for." },
            { icon: "🎯", title: "Role-specific", desc: "Every resume is uniquely rewritten for that specific job — not a generic tweak." },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="text-white font-semibold mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-slate-800/50 border-y border-slate-700/50 py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-3">Simple pricing</h2>
          <p className="text-slate-400 mb-12">Start free. Upgrade when you're ready.</p>
          <div className="grid sm:grid-cols-2 gap-6 text-left">
            {/* Free */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
              <div className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-2">Free</div>
              <div className="text-4xl font-extrabold text-white mb-1">$0</div>
              <div className="text-slate-500 text-sm mb-6">forever</div>
              <ul className="space-y-3 text-sm text-slate-300">
                {["3 tailored resumes", "PDF & DOCX export", "ATS optimization", "No sign-up required"].map((f) => (
                  <li key={f} className="flex items-center gap-2"><span className="text-green-400">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/tailor" className="block text-center mt-8 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-colors">
                Get Started Free
              </Link>
            </div>
            {/* Pro */}
            <div className="bg-indigo-500/10 border border-indigo-500/40 rounded-2xl p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-bold px-4 py-1 rounded-full">BEST VALUE</div>
              <div className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-2">Pro</div>
              <div className="text-4xl font-extrabold text-white mb-1">$12</div>
              <div className="text-slate-500 text-sm mb-6">per month</div>
              <ul className="space-y-3 text-sm text-slate-300">
                {["Unlimited tailored resumes", "PDF & DOCX export", "ATS optimization", "Priority processing", "Cover letter generator (soon)"].map((f) => (
                  <li key={f} className="flex items-center gap-2"><span className="text-green-400">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/tailor" className="block text-center mt-8 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl transition-colors">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-center py-24 px-6">
        <h2 className="text-4xl font-extrabold mb-4">Ready to get more interviews?</h2>
        <p className="text-slate-400 text-lg mb-8">Join job seekers using ApplyReady to stand out in every application.</p>
        <Link
          href="/tailor"
          className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-lg px-10 py-4 rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
        >
          Tailor My Resume Free →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-6 text-center text-slate-600 text-sm">
        <p>© 2025 ApplyReady · Built with Claude AI by Anthropic · Your resume is never stored.</p>
      </footer>

    </main>
  );
}
