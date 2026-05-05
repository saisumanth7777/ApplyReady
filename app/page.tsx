"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [outputFormat, setOutputFormat] = useState<"pdf" | "docx">("pdf");
  const [step, setStep] = useState<"upload" | "jd" | "loading" | "done">("upload");
  const [tailoredText, setTailoredText] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleTailor = async () => {
    if (!file || !jobDescription.trim()) return;
    setStep("loading");
    setError("");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const resumeBase64 = btoa(binary);

      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeBase64, fileName: file.name, fileType: file.type, jobDescription }),
      });
      if (!res.ok) {
        let errMsg = `Server error (${res.status})`;
        try {
          const data = await res.json();
          errMsg = data.error || errMsg;
        } catch {
          const text = await res.text();
          errMsg = text.slice(0, 300) || errMsg;
        }
        throw new Error(errMsg);
      }

      const { tailoredResume } = await res.json();
      setTailoredText(tailoredResume);
      setStep("done");
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
        // Open print-ready HTML in new tab — user saves via Ctrl+P / Cmd+P → Save as PDF
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
    setStep("upload");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">ApplyReady</h1>
          <p className="text-slate-400">
            Upload your resume, paste a job description — get an ATS-optimized resume in seconds.
          </p>
        </div>

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
                Claude is rewriting your resume to match the job description and ATS requirements.
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

              <div className="bg-slate-700/50 rounded-xl p-4 max-h-72 overflow-y-auto mb-4">
                <pre className="text-slate-300 text-xs whitespace-pre-wrap font-mono">{tailoredText}</pre>
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
                Processed by Claude AI (Anthropic) · Your resume is not stored
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
