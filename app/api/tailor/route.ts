import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { FREE_TAILOR_LIMIT } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const isPro = (user.publicMetadata.isPro as boolean) || false;
    const tailorCount = (user.publicMetadata.tailorCount as number) || 0;

    if (!isPro && tailorCount >= FREE_TAILOR_LIMIT) {
      return NextResponse.json({ error: "Free limit reached", limitReached: true }, { status: 403 });
    }

    const { resumeText, jobDescription } = await req.json();

    if (!resumeText?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Resume text and job description are required." }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8096,
      system: `You are an elite resume writer and ATS expert. You rewrite resumes so they land interviews. You are aggressive about matching job description language — you rephrase the candidate's real experience using the JD's exact words and phrases. You never invent experience, but you always find the best angle to present what exists.`,
      messages: [
        {
          role: "user",
          content: `Tailor the resume below for the job description. Follow every instruction exactly and completely.

━━━ STEP 1: MISMATCH CHECK (output this first, one line only) ━━━
Output exactly one of these as the very first line:
MISMATCH:NO
MISMATCH:YES
If MISMATCH:YES, output on the second line: WARNING:<one sentence on the main skill gap>
Even on mismatch, ALWAYS produce the full resume below. Never refuse.

━━━ STEP 2: EXTRACT JD KEYWORDS (silent — do not output) ━━━
Identify the top 8-10 must-have keywords/phrases from the JD.
These MUST appear verbatim in the rewritten resume wherever honest and natural.

━━━ STEP 3: REWRITE THE RESUME ━━━

RULES (follow strictly):
• NEVER invent jobs, titles, degrees, skills, or numbers not in the original
• ALWAYS produce the complete resume — never truncate
• Rephrase existing experience using JD's exact terminology — this is the core task
• Every bullet: strong past-tense action verb + specific task + measurable result (use numbers from original)
• Reorder bullets within each role — most JD-relevant first
• Cut bullets with zero relevance to this JD; keep 4-6 per role
• Professional summary MUST name the exact job title from the JD
• Skills section: JD-matched skills listed first

FORMAT RULES:
• Plain text only — no markdown, no #, no **, no *, no backticks
• Use • for all bullet points
• Section headings in ALL CAPS
• Name on line 1, contact info on line 2
• Output the full resume, no shortcuts

SECTIONS TO INCLUDE (in this order):
NAME
CONTACT INFO
PROFESSIONAL SUMMARY
WORK EXPERIENCE
EDUCATION
SKILLS
CERTIFICATIONS (only if in original)

━━━ ORIGINAL RESUME ━━━
${resumeText}

━━━ JOB DESCRIPTION ━━━
${jobDescription}`,
        },
      ],
    });

    const fullText = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const lines = fullText.split("\n");
    let mismatch = false;
    let warning = "";
    let resumeStart = 0;

    if (lines[0]?.startsWith("MISMATCH:")) {
      mismatch = lines[0].trim() === "MISMATCH:YES";
      resumeStart = 1;
      if (mismatch && lines[1]?.startsWith("WARNING:")) {
        warning = lines[1].replace("WARNING:", "").trim();
        resumeStart = 2;
      }
    }

    const tailoredResume = lines.slice(resumeStart).join("\n").trim();

    try {
      await clerk.users.updateUserMetadata(userId, {
        publicMetadata: { tailorCount: tailorCount + 1 },
      });
    } catch (metaErr) {
      console.error("Failed to update usage count:", metaErr);
    }

    return NextResponse.json({ tailoredResume, mismatch, warning });
  } catch (error: unknown) {
    console.error("Tailor API error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
