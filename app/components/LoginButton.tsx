"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function LoginButton() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (session) {
    return (
      <button onClick={() => signOut()} className="px-3 py-1 border rounded">
        Cerrar sesión
      </button>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="px-3 py-1 border rounded"
    >
      Iniciar sesión
    </button>
  );
}
