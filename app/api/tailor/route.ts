import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { resumeText, jobDescription } = await req.json();

    if (!resumeText?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: "Resume text and job description are required." }, { status: 400 });
    }

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8096,
      system: `You are an elite resume writer and career coach with 20+ years of experience helping candidates land roles at top companies. You are an expert in ATS systems, recruiter psychology, and crafting resumes that get interviews. You write with precision — every word earns its place.`,
      messages: [
        {
          role: "user",
          content: `Tailor the resume below for the job description provided. Follow every instruction exactly.

━━━ STEP 1: SILENTLY ANALYZE (do not output this) ━━━
- What are the top 5 must-have skills/keywords from the JD?
- What experience in the resume maps to those requirements?
- What measurable achievements can be emphasized?
- What job title and seniority level is the role?

━━━ STEP 2: REWRITE THE RESUME ━━━

STRICT RULES:
• NEVER invent jobs, degrees, skills, or numbers not in the original resume
• Every bullet point = strong action verb + what you did + measurable result (if available)
• Mirror the JD's exact keywords and phrases naturally — ATS needs exact matches
• Reorder bullets within each job to put the most JD-relevant ones first
• Cut weak/irrelevant bullets; keep only what's relevant to this specific role

SECTION-BY-SECTION GUIDE:

[NAME & CONTACT]
Full name on first line. Contact on second line: Phone | Email | LinkedIn | City, State

[PROFESSIONAL SUMMARY]
3-4 punchy sentences. Mention: (1) years of experience + field, (2) the exact job title you're applying for, (3) 2-3 skills directly from the JD, (4) a key career achievement.

[WORK EXPERIENCE]
Format each role exactly as:
Company Name | Job Title | Month Year – Month Year

• Start every bullet with a past-tense action verb
• Include numbers wherever the original resume has them
• Write 4-6 bullets per role, most JD-relevant first
• Do NOT use "Responsible for" or "Helped with"

[EDUCATION]
Degree | Major | University | Year

[SKILLS]
Put JD-matched skills first. Group logically.

[CERTIFICATIONS] (only if present in original)

━━━ OUTPUT FORMAT ━━━
Plain text only. No markdown. No asterisks. No hashtags.
Use • for bullet points.
Use ALL CAPS for section headings.
Output the complete resume — do not truncate.

━━━ ORIGINAL RESUME ━━━
${resumeText}

━━━ JOB DESCRIPTION ━━━
${jobDescription}`,
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
