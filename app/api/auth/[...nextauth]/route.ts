// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github"; // o el proveedor que uses

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    // otros providers...
  ],
  secret: process.env.NEXTAUTH_SECRET,
};

// 👇 Esto es lo que Next.js espera
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
