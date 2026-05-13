"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { FREE_TAILOR_LIMIT } from "@/lib/constants";

async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx") ||
    file.name.toLowerCase().endsWith(".doc")
  ) {
    // mammoth has a browser build — works client-side with ArrayBuffer
    const mammoth = await import("mammoth");
    const result = await (mammoth as unknown as { extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> }).extractRawText({ arrayBuffer });
    return result.value;
  }

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const pages = await Promise.all(
      Array.from({ length: pdf.numPages }, (_, i) =>
        pdf.getPage(i + 1).then((p) => p.getTextContent().then((c) => c.items.map((it) => ("str" in it ? it.str : "")).join(" ")))
      )
    );
    return pages.join("\n");
  }

  throw new Error("Unsupported file type. Please upload a PDF or DOCX.");
}

function TailorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [outputFormat, setOutputFormat] = useState<"pdf" | "docx">("pdf");
  const [step, setStep] = useState<"upload" | "jd" | "loading" | "done">("upload");
  const [tailoredText, setTailoredText] = useState("");
  const [error, setError] = useState("");
  const [limitReached, setLimitReached] = useState(false);
  const [mismatchWarning, setMismatchWarning] = useState("");
  const [upgradeError, setUpgradeError] = useState("");
  const [upgrading, setUpgrading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useUser();
  const tailorCount = (user?.publicMetadata?.tailorCount as number) || 0;
  const remaining = Math.max(0, FREE_TAILOR_LIMIT - tailorCount);
  const searchParams = useSearchParams();
  const [upgraded, setUpgraded] = useState(false);
  useEffect(() => {
    if (searchParams.get("upgraded") === "true") setUpgraded(true);
  }, [searchParams]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ok =
      f.type === "application/pdf" ||
      f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      f.name.endsWith(".doc") ||
      f.name.endsWith(".docx");
    if (!ok) {
      setError("Only PDF or DOCX files are supported.");
      return;
    }
    setError("");
    setFile(f);
    setStep("jd");
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    setUpgradeError("");
    try {
      const res = await fetch("/api/stripe", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setUpgradeError(data.error || "Could not start checkout. Please try again.");
      }
    } catch {
      setUpgradeError("Network error. Please check your connection and try again.");
    } finally {
      setUpgrading(false);
    }
  };

  const handleTailor = async () => {
    if (!file || !jobDescription.trim()) return;
    setStep("loading");
    setError("");

    try {
      const resumeText = await extractTextFromFile(file);

      if (!resumeText.trim()) {
        throw new Error("Could not read your resume. Please try a different file.");
      }

      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription }),
      });

      const data = await res.json();
      if (res.status === 403 && data.limitReached) {
        setLimitReached(true);
        setStep("jd");
        return;
      }
      if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);

      setTailoredText(data.tailoredResume);
      if (data.mismatch && data.warning) setMismatchWarning(data.warning);
      setStep("done");
      user?.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStep("jd");
    }
  };

  const handleDownload = async () => {
    setError("");
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: tailoredText, format: outputFormat }),
      });
      if (!res.ok) throw new Error("Export failed.");

      if (outputFormat === "pdf") {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tailored-resume.docx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Export failed.");
    }
  };

  const reset = () => {
    setFile(null);
    setJobDescription("");
    setTailoredText("");
    setError("");
    setMismatchWarning("");
    setStep("upload");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
              ← Back to home
            </Link>
            <UserButton />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">ApplyReady</h1>
          <p className="text-slate-400">
            Upload your resume, paste a job description — get an ATS-optimized resume in seconds.
          </p>
          <div className="mt-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${remaining === 0 ? "bg-red-500/20 text-red-400" : "bg-indigo-500/20 text-indigo-400"}`}>
              {remaining === 0 ? "Free limit reached" : `${remaining} free tailor${remaining === 1 ? "" : "s"} remaining`}
            </span>
          </div>
        </div>

        {/* Upgrade Success Banner */}
        {upgraded && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl px-5 py-4 text-sm text-center font-medium">
            You&apos;re now on Pro! Unlimited resume tailoring unlocked.
          </div>
        )}

        {/* Upgrade Modal */}
        {limitReached && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
              <div className="text-5xl mb-4">🚀</div>
              <h2 className="text-2xl font-bold text-white mb-2">You&apos;ve used your 3 free tailors</h2>
              <p className="text-slate-400 mb-6">Upgrade to Pro for unlimited resume tailoring, cover letters, and more.</p>
              <div className="bg-slate-700/50 rounded-xl p-4 mb-6 text-left space-y-2">
                {["Unlimited tailored resumes", "PDF & DOCX export", "Cover letter generator (soon)", "Cancel anytime"].map((f) => (
                  <p key={f} className="text-sm text-slate-300 flex items-center gap-2"><span className="text-green-400">✓</span>{f}</p>
                ))}
              </div>
              {upgradeError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
                  {upgradeError}
                </div>
              )}
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors mb-3"
              >
                {upgrading ? "Redirecting to checkout..." : "Upgrade to Pro — $12/month"}
              </button>
              <button onClick={() => setLimitReached(false)} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                Maybe later
              </button>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {["Upload", "Job Description", "Download"].map((label, i) => {
            const stepIndex = ["upload", "jd", "done"].indexOf(step);
            const active = i <= (step === "loading" ? 1 : stepIndex);
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    active ? "bg-indigo-500 text-white" : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {i + 1}
                </div>
                <span className={`text-sm hidden sm:block ${active ? "text-white" : "text-slate-500"}`}>
                  {label}
                </span>
                {i < 2 && (
                  <div
                    className={`w-8 h-0.5 ${
                      i < stepIndex || (i === 1 && step === "loading")
                        ? "bg-indigo-500"
                        : "bg-slate-700"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
          {/* Error Banner */}
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Upload */}
          {step === "upload" && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Upload Your Resume</h2>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-600 hover:border-indigo-500 rounded-xl p-10 text-center cursor-pointer transition-colors group"
              >
                <div className="text-4xl mb-3">📄</div>
                <p className="text-slate-300 group-hover:text-white transition-colors font-medium">
                  Click to upload your resume
                </p>
                <p className="text-slate-500 text-sm mt-1">PDF or DOCX · Max 10MB</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* Step 2: Job Description */}
          {step === "jd" && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-500/20 rounded-lg px-3 py-1.5">
                  <span className="text-indigo-300 text-sm font-medium">📄 {file?.name}</span>
                </div>
                <button
                  onClick={reset}
                  className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
                >
                  Change file
                </button>
              </div>

              <h2 className="text-xl font-semibold text-white mb-3">Paste the Job Description</h2>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here..."
                className="w-full bg-slate-700 border border-slate-600 rounded-xl p-4 text-slate-200 placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-indigo-500 transition-colors"
                rows={8}
              />

              <div className="flex items-center gap-4 mt-4">
                <div>
                  <p className="text-slate-400 text-sm mb-2">Output format</p>
                  <div className="flex gap-2">
                    {(["pdf", "docx"] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setOutputFormat(fmt)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          outputFormat === fmt
                            ? "bg-indigo-500 text-white"
                            : "bg-slate-700 text-slate-400 hover:text-white"
                        }`}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleTailor}
                  disabled={!jobDescription.trim()}
                  className="ml-auto bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
                >
                  Tailor My Resume →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Loading */}
          {step === "loading" && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4 animate-bounce">✨</div>
              <h2 className="text-xl font-semibold text-white mb-2">Tailoring your resume...</h2>
              <p className="text-slate-400 text-sm">
                AI is rewriting your resume to match the job description and ATS requirements.
              </p>
              <div className="mt-6 flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === "done" && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  ✓
                </div>
                <h2 className="text-xl font-semibold text-white">Resume Tailored Successfully!</h2>
              </div>

              {mismatchWarning && (
                <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
                  <span className="text-yellow-400 text-lg mt-0.5">⚠️</span>
                  <div className="flex-1">
                    <p className="text-yellow-300 text-sm font-medium mb-1">Skill gap detected</p>
                    <p className="text-yellow-400/80 text-xs">{mismatchWarning}</p>
                  </div>
                  <button onClick={() => setMismatchWarning("")} className="text-yellow-600 hover:text-yellow-400 text-lg leading-none">×</button>
                </div>
              )}

              <div className="bg-white rounded-xl p-6 max-h-[480px] overflow-y-auto mb-4 text-left font-serif">
                {(() => {
                  const lines = tailoredText.split("\n");
                  const nonBlankIndices = lines.map((l, i) => l.trim() ? i : -1).filter(i => i >= 0);
                  const nameIndex = nonBlankIndices[0] ?? -1;
                  const contactIndex = nonBlankIndices[1] ?? -1;
                  return lines.map((line, i) => {
                    const trimmed = line.trim();
                    const cleanLine = trimmed.replace(/^#+\s*/, "");
                    if (!trimmed) return <div key={i} className="h-1" />;
                    const isHeading = /^[A-Z][A-Z\s&\/]{4,}$/.test(trimmed);
                    const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-");
                    if (i === nameIndex) return <p key={i} className="text-center text-xl font-bold text-[#1a1a2e] mb-1 tracking-wide">{cleanLine}</p>;
                    if (i === contactIndex && !isHeading) return (
                      <p key={i} className="text-center text-[10px] text-gray-500 pb-2 mb-2 border-b-2 border-[#1a1a2e]">{cleanLine}</p>
                    );
                    if (isHeading) return (
                      <div key={i} className="mt-3 mb-1 border-b border-gray-200 pb-0.5">
                        <span className="text-[10px] font-bold tracking-widest text-[#1a1a2e] uppercase">{trimmed}</span>
                      </div>
                    );
                    if (isBullet) return <p key={i} className="text-[10px] text-gray-700 pl-4 py-0.5 leading-snug">{trimmed}</p>;
                    return <p key={i} className="text-[10px] text-gray-600 py-0.5 leading-snug">{trimmed}</p>;
                  });
                })()}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Download {outputFormat.toUpperCase()} ↓
                </button>
                <button
                  onClick={reset}
                  className="px-5 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-colors text-sm"
                >
                  Start Over
                </button>
              </div>

              <p className="text-slate-500 text-xs text-center mt-3">
                Processed by AI · Your resume is not stored
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          Built for students &amp; job seekers · ATS-optimized output
        </p>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense>
      <TailorPage />
    </Suspense>
  );
}
