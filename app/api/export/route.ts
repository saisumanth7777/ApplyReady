import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";

function parseResumeToDocx(text: string): Document {
  const lines = text.split("\n");
  const children: Paragraph[] = [];

  const sectionHeadings = new Set([
    "CONTACT INFORMATION",
    "PROFESSIONAL SUMMARY",
    "SUMMARY",
    "WORK EXPERIENCE",
    "EXPERIENCE",
    "EDUCATION",
    "SKILLS",
    "CERTIFICATIONS",
    "PROJECTS",
    "ACHIEVEMENTS",
    "AWARDS",
    "LANGUAGES",
  ]);

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      children.push(new Paragraph({ text: "" }));
      continue;
    }

    const upper = line.trim().toUpperCase();
    if (sectionHeadings.has(upper)) {
      children.push(
        new Paragraph({
          text: line.trim(),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );
      continue;
    }

    if (line.trimStart().startsWith("•") || line.trimStart().startsWith("-")) {
      children.push(
        new Paragraph({
          text: line.trim().replace(/^[•\-]\s*/, ""),
          bullet: { level: 0 },
          spacing: { after: 60 },
        })
      );
      continue;
    }

    // First non-blank line is likely the candidate's name
    if (children.filter((p) => p).length === 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line.trim(), bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
        })
      );
      continue;
    }

    children.push(
      new Paragraph({
        text: line.trim(),
        spacing: { after: 60 },
      })
    );
  }

  return new Document({
    sections: [{ properties: {}, children }],
  });
}

export async function POST(req: NextRequest) {
  try {
    const { text, format } = await req.json();

    if (!text || !format) {
      return NextResponse.json({ error: "Missing text or format." }, { status: 400 });
    }

    if (format === "docx") {
      const doc = parseResumeToDocx(text);
      const buffer = await Packer.toBuffer(doc);

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": 'attachment; filename="tailored-resume.docx"',
        },
      });
    }

    if (format === "pdf") {
      // Build a minimal HTML page and convert to PDF via browser print
      // For server-side PDF without puppeteer we return styled HTML the browser can print-to-PDF
      const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      const lines = escaped.split("\n");
      const sectionHeadings = new Set([
        "CONTACT INFORMATION",
        "PROFESSIONAL SUMMARY",
        "SUMMARY",
        "WORK EXPERIENCE",
        "EXPERIENCE",
        "EDUCATION",
        "SKILLS",
        "CERTIFICATIONS",
        "PROJECTS",
        "ACHIEVEMENTS",
        "AWARDS",
        "LANGUAGES",
      ]);

      let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; margin: 40px; line-height: 1.5; }
  h1 { font-size: 18pt; text-align: center; margin-bottom: 4px; }
  h2 { font-size: 12pt; text-transform: uppercase; border-bottom: 1px solid #444; margin-top: 16px; margin-bottom: 6px; letter-spacing: 0.05em; }
  p { margin: 2px 0; }
  ul { margin: 4px 0 4px 20px; padding: 0; }
  li { margin-bottom: 2px; }
  @page { margin: 0.5in; }
  #tip { background: #4f46e5; color: #fff; padding: 12px 16px; font-size: 13px; border-radius: 6px; margin-bottom: 24px; }
  #tip strong { font-weight: 700; }
  @media print { #tip { display: none; } }
</style>
</head><body>
<div id="tip">
  <strong>Before saving as PDF:</strong> In the print dialog → More settings → uncheck <em>"Headers and footers"</em> to remove the date/time. Then click Save.
</div>`;

      let firstLine = true;
      for (const raw of lines) {
        const line = raw.trim();
        if (!line) { html += "<br>"; continue; }
        const upper = line.toUpperCase();
        if (firstLine) {
          html += `<h1>${line}</h1>`;
          firstLine = false;
        } else if (sectionHeadings.has(upper)) {
          html += `<h2>${line}</h2>`;
        } else if (line.startsWith("•") || line.startsWith("-")) {
          html += `<ul><li>${line.replace(/^[•\-]\s*/, "")}</li></ul>`;
        } else {
          html += `<p>${line}</p>`;
        }
      }

      html += `<script>window.onload=function(){setTimeout(function(){window.print();},800);}</script></body></html>`;

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": 'inline; filename="tailored-resume.html"',
        },
      });
    }

    return NextResponse.json({ error: "Invalid format. Use pdf or docx." }, { status: 400 });
  } catch (error: unknown) {
    console.error("Export API error:", error);
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}
