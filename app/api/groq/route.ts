export const dynamic = 'force-static';
export const revalidate = 0;
import { NextResponse } from "next/server";
<<<<<<< HEAD
//import { getServerSession } from "next-auth";
//import { authOptions } from "@/lib/auth";


export async function GET() {
  //const session = await getServerSession(authOptions);
  /*if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }*/
=======

export async function GET() {
>>>>>>> f573bd87d09192a21be05b10bcfbd25e06bcabec
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
