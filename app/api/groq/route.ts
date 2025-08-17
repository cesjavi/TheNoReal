import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not defined" },
      { status: 500 }
    );
  }

  // Example usage: the key could be used to call Groq's API here.
  return NextResponse.json({ message: "GROQ_API_KEY loaded" });
}
