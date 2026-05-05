import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    apiKeyPrefix: process.env.ANTHROPIC_API_KEY?.slice(0, 12) ?? "not set",
    nodeVersion: process.version,
    env: process.env.NODE_ENV,
  });
}
