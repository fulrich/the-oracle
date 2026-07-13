import type { Metadata } from "next";
import { ShieldXIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { getAuthState } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Access not granted",
};

export default async function AccessDeniedPage() {
  const authState = await getAuthState();
  if (authState.status === "anonymous") {
    redirect("/sign-in");
  }
  if (authState.status === "active") {
    redirect(authState.viewer.role === "admin" ? "/dm" : "/");
  }

  return (
    <main className="oracle-shell relative isolate grid min-h-svh place-items-center overflow-hidden px-5 py-12">
      <div className="oracle-glow" aria-hidden="true" />
      <section className="relative w-full max-w-lg border border-white/10 bg-[#0b0f17]/88 px-8 py-10 text-center shadow-[0_2rem_8rem_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-12">
        <ShieldXIcon
          aria-hidden="true"
          className="mx-auto size-8 text-[#c78779]"
          strokeWidth={1.35}
        />
        <p className="mt-5 font-mono text-[0.6rem] tracking-[0.18em] text-[#c78779] uppercase">
          The threshold remains closed
        </p>
        <h1 className="font-heading mt-4 text-5xl leading-none tracking-[-0.04em] text-[#ebe5d8]">
          Access not granted
        </h1>
        <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-[#8c9498]">
          This Google identity is valid, but it does not currently have an
          active place in the campaign archive. Ask your Dungeon Master to
          verify the exact email on the allowlist.
        </p>
        <form action={signOut} className="mt-8">
          <button
            className="border border-white/12 px-5 py-3 text-xs tracking-[0.14em] text-[#c9ccca] uppercase hover:border-white/22 hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
            type="submit"
          >
            Sign out and try another account
          </button>
        </form>
      </section>
    </main>
  );
}
