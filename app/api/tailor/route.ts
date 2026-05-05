import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require("mammoth") as {
  extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }>;
};

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.endsWith(".docx") ||
    file.name.endsWith(".doc")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error("Unsupported file type. Please upload a PDF or DOCX.");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const resumeFile = formData.get("resume") as File | null;
    const jobDescription = formData.get("jobDescription") as string;

    if (!resumeFile || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Resume file and job description are required." }, { status: 400 });
    }

    if (resumeFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 });
    }

    const resumeText = await extractText(resumeFile);

    if (!resumeText.trim()) {
      return NextResponse.json({ error: "Could not extract text from your resume. Please try a different file." }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are an expert resume writer and ATS (Applicant Tracking System) optimization specialist.

Your task is to rewrite the candidate's resume to be perfectly tailored for the provided job description.

RULES:
1. Keep all factual information accurate — do NOT invent jobs, degrees, or skills the candidate doesn't have
2. Reorder and emphasize existing experience to highlight what's most relevant to this job
3. Mirror keywords and phrases from the job description naturally throughout the resume
4. Use strong action verbs (Led, Built, Improved, Delivered, Designed, Managed, etc.)
5. Quantify achievements where possible using numbers already present in the resume
6. Follow strict ATS formatting: no tables, no columns, no headers/footers, no images
7. Use standard section headings: CONTACT INFORMATION, PROFESSIONAL SUMMARY, WORK EXPERIENCE, EDUCATION, SKILLS, CERTIFICATIONS (only if present)
8. Keep bullet points concise and achievement-focused (start with action verb)
9. Output plain text only — no markdown, no special characters except dashes and pipes for structure

---

ORIGINAL RESUME:
${resumeText}

---

JOB DESCRIPTION:
${jobDescription}

---

Output the fully rewritten ATS-optimized resume as plain text now:`,
        },
      ],
    });

    const tailoredResume = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return NextResponse.json({ tailoredResume });
  } catch (error: unknown) {
    console.error("Tailor API error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
