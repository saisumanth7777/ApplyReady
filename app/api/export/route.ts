import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  UnderlineType,
} from "docx";

const SECTION_HEADINGS = new Set([
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
  "VOLUNTEER",
  "PUBLICATIONS",
]);

function isHeading(line: string) {
  return SECTION_HEADINGS.has(line.trim().toUpperCase()) || /^[A-Z][A-Z\s&\/]{4,}$/.test(line.trim());
}

function isBullet(line: string) {
  return line.trimStart().startsWith("•") || line.trimStart().startsWith("-");
}

function parseResumeToDocx(text: string): Document {
  const lines = text.split("\n");
  const children: Paragraph[] = [];
  let nameAdded = false;
  let contactAdded = false;

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      children.push(new Paragraph({ text: "", spacing: { after: 60 } }));
      continue;
    }

    if (!nameAdded) {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed, bold: true, size: 32, color: "1a1a2e" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
      }));
      nameAdded = true;
      continue;
    }

    if (!contactAdded && !isHeading(trimmed) && !isBullet(trimmed)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed, size: 20, color: "444444" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1a1a2e", space: 4 } },
      }));
      contactAdded = true;
      continue;
    }

    if (isHeading(trimmed)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed, bold: true, size: 22, color: "1a1a2e", underline: { type: UnderlineType.SINGLE, color: "cccccc" } })],
        spacing: { before: 240, after: 80 },
      }));
      continue;
    }

    if (isBullet(trimmed)) {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed.replace(/^[•\-]\s*/, ""), size: 20 })],
        bullet: { level: 0 },
        spacing: { after: 40 },
      }));
      continue;
    }

    children.push(new Paragraph({
      children: [new TextRun({ text: trimmed, size: 20 })],
      spacing: { after: 60 },
    }));
  }

  return new Document({ sections: [{ properties: {}, children }] });
}

function buildResumeHtml(text: string): string {
  const lines = text.split("\n");

  let nameHtml = "";
  let contactHtml = "";
  let bodyHtml = "";

  let nameSet = false;
  let contactSet = false;
  let inList = false;

  const closeList = () => { if (inList) { bodyHtml += "</ul>"; inList = false; } };

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (!nameSet && trimmed) {
      nameHtml = `<div id="name">${trimmed}</div>`;
      nameSet = true;
      continue;
    }

    if (!contactSet && trimmed && !isHeading(trimmed) && !isBullet(trimmed)) {
      contactHtml = `<div id="contact">${trimmed}</div>`;
      contactSet = true;
      continue;
    }

    if (!trimmed) {
      closeList();
      continue;
    }

    if (isHeading(trimmed)) {
      closeList();
      bodyHtml += `<h2>${trimmed}</h2>`;
      continue;
    }

    if (isBullet(trimmed)) {
      if (!inList) { bodyHtml += "<ul>"; inList = true; }
      bodyHtml += `<li>${trimmed.replace(/^[•\-]\s*/, "")}</li>`;
      continue;
    }

    closeList();
    bodyHtml += `<p>${trimmed}</p>`;
  }

  closeList();

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Tailored Resume</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Garamond', 'Georgia', serif;
    font-size: 10.5pt;
    color: #1a1a1a;
    line-height: 1.45;
    padding: 0.65in 0.75in;
    max-width: 8.5in;
    margin: 0 auto;
  }
  #name {
    font-size: 22pt;
    font-weight: bold;
    text-align: center;
    color: #1a1a2e;
    letter-spacing: 0.04em;
    margin-bottom: 6px;
  }
  #contact {
    text-align: center;
    font-size: 9.5pt;
    color: #555;
    padding-bottom: 10px;
    margin-bottom: 4px;
    border-bottom: 2px solid #1a1a2e;
  }
  h2 {
    font-size: 10pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #1a1a2e;
    border-bottom: 1px solid #d0d0d0;
    margin-top: 14px;
    margin-bottom: 5px;
    padding-bottom: 2px;
  }
  p { margin: 2px 0; font-size: 10.5pt; }
  ul { margin: 3px 0 3px 20px; list-style-type: disc; }
  li { margin-bottom: 2px; font-size: 10.5pt; }
  #tip {
    background: #4f46e5;
    color: #fff;
    padding: 10px 16px;
    font-size: 12px;
    border-radius: 6px;
    margin-bottom: 24px;
    font-family: Arial, sans-serif;
  }
  #tip strong { font-weight: 700; }
  @media print {
    #tip { display: none; }
    body { padding: 0.5in 0.6in; }
  }
  @page { margin: 0; }
</style>
</head>
<body>
<div id="tip">
  <strong>To save as PDF:</strong> Press <strong>Ctrl+P</strong> (or Cmd+P on Mac) → Save as PDF → uncheck "Headers and footers" for a clean result.
</div>
${nameHtml}
${contactHtml}
${bodyHtml}
<script>window.onload=function(){setTimeout(function(){window.print();},600);};</script>
</body>
</html>`;
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
      const html = buildResumeHtml(text);
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
