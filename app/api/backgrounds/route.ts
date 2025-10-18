//export const dynamic = 'force-dynamic';
export const dynamic = 'force-static';
export const revalidate = 0;  
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
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
  try {
    const publicDir = path.join(process.cwd(), "public");
    const topDir = path.join(publicDir, "top");
    const bottomDir = path.join(publicDir, "bottom");

    const top = fs.existsSync(topDir)
      ? fs
          .readdirSync(topDir)
          .filter((f) => f.endsWith(".svg"))
          .map((f) => `/top/${f}`)
      : [];

    const bottom = fs.existsSync(bottomDir)
      ? fs
          .readdirSync(bottomDir)
          .filter((f) => f.endsWith(".svg"))
          .map((f) => `/bottom/${f}`)
      : [];

    return NextResponse.json({ top, bottom });
  } catch (err) {
    console.error("backgrounds route error", err);
    return NextResponse.json({ top: [], bottom: [] }, { status: 500 });
  }
}

