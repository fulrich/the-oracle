import type { Metadata } from "next";
import { KeyRoundIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { signInAsLocalAccount, signInWithGoogle } from "@/app/auth/actions";
import { getAuthState } from "@/lib/auth";
import { isLocalAuthEnabled } from "@/lib/env";

export const metadata: Metadata = {
  title: "Enter the archive",
  description: "Sign in to the private Forgotten Oracle archive.",
};

const errorMessages: Record<string, string> = {
  oauth_start: "The Google sign-in could not be started. Please try again.",
  oauth_callback: "Google sign-in could not be completed. Please try again.",
  local_unavailable: "Local test sign-in is not enabled.",
  local_invalid: "That local test account is not available.",
  local_sign_in: "The local test account could not be signed in.",
};

const localAccounts = [
  { email: "dm@example.test", label: "DM administrator" },
  { email: "player.one@example.test", label: "Kaelen Ironheart" },
  { email: "player.two@example.test", label: "Telestra Thornveil" },
  { email: "disabled@example.test", label: "Disabled player" },
] as const;

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
  const localAuthEnabled = isLocalAuthEnabled();

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
          <div>
            <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-[#8ad9cb] uppercase">
              The Forgotten Oracle
            </p>
            <p className="mt-1 text-xs tracking-[0.08em] text-[#727b82]">
              A private archive
            </p>
          </div>
        </div>

        <div className="mt-10">
          <h1 className="font-heading text-5xl leading-[0.9] tracking-[-0.045em] text-[#eee8da]">
            Enter the <em className="text-[#b5dcd4]">archive.</em>
          </h1>
          <p className="mt-4 text-sm text-[#8f9699]">
            Continue with the Google account approved for this campaign.
          </p>
        </div>

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
            Continue with Google
          </button>
        </form>

        {localAuthEnabled ? (
          <details className="mt-7 border-t border-white/8 pt-6">
            <summary className="cursor-pointer text-[0.6rem] tracking-[0.14em] text-[#737d82] uppercase marker:text-[#8ad9cb]">
              Local test identities
            </summary>
            <div className="mt-4 grid gap-2">
              {localAccounts.map((account) => (
                <form action={signInAsLocalAccount} key={account.email}>
                  <input name="account" type="hidden" value={account.email} />
                  <button
                    className="flex w-full items-center justify-between border border-white/8 bg-white/[0.025] px-3.5 py-2.5 text-left hover:border-white/15 hover:bg-white/[0.045] focus-visible:ring-2 focus-visible:ring-[#8ad9cb]/65"
                    type="submit"
                  >
                    <span className="text-xs text-[#c5c8c5]">
                      {account.label}
                    </span>
                    <span className="font-mono text-[0.52rem] text-[#666f75]">
                      {account.email}
                    </span>
                  </button>
                </form>
              ))}
            </div>
          </details>
        ) : null}
      </section>
    </main>
  );
}
