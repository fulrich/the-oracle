import type { Metadata } from "next";
import { KeyRoundIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { signInWithGoogle } from "@/app/auth/actions";
import { getAuthState } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Enter the archive",
  description: "Sign in to the private Forgotten Oracle archive.",
};

const errorMessages: Record<string, string> = {
  oauth_start: "The gate would not open. Try again.",
  oauth_callback: "The threshold could not be crossed. Try again.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const authState = await getAuthState();
  if (authState.status === "active") {
    redirect(authState.viewer.role === "admin" ? "/dm" : "/");
  }
  if (authState.status === "denied") {
    redirect("/access-denied");
  }

  const { error } = await searchParams;
  const errorMessage = error ? errorMessages[error] : undefined;

  return (
    <main className="oracle-shell relative isolate grid min-h-svh place-items-center overflow-hidden px-5 py-12">
      <div className="oracle-glow" aria-hidden="true" />
      <section className="relative w-full max-w-md border border-white/10 bg-[#0b0f17]/88 px-7 py-9 shadow-[0_2rem_8rem_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-10 sm:py-11">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="grid size-11 rotate-45 place-items-center border border-[#8ad9cb]/40 bg-[#8ad9cb]/[0.04] text-[#8ad9cb]"
          >
            <span className="-rotate-45">◇</span>
          </span>
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-[#8ad9cb] uppercase">
            The Forgotten Oracle
          </p>
        </div>

        <h1 className="font-heading mt-10 text-5xl leading-[0.9] tracking-[-0.045em] text-[#eee8da]">
          Enter the <em className="text-[#b5dcd4]">archive.</em>
        </h1>

        {errorMessage ? (
          <p
            className="mt-6 border border-[#c77f72]/30 bg-[#c77f72]/8 px-4 py-3 text-sm leading-5 text-[#e4b5ac]"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <form action={signInWithGoogle} className="mt-8">
          <button
            className="flex w-full items-center justify-center gap-3 border border-[#8ad9cb]/28 bg-[#8ad9cb]/8 px-5 py-3.5 text-xs font-semibold tracking-[0.13em] text-[#d8eee9] uppercase transition hover:border-[#8ad9cb]/48 hover:bg-[#8ad9cb]/12 focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f17]"
            type="submit"
          >
            <KeyRoundIcon aria-hidden="true" className="size-4" />
            Enter
          </button>
        </form>
      </section>
    </main>
  );
}
