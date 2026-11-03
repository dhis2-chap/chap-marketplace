import type { ReactNode } from "react";
import Link from "next/link";
import {
  IconApps24,
  IconCheckmarkCircle24,
  IconTerminalWindow24,
  IconUser24,
} from "@dhis2/ui-icons";

const LINK = "font-medium text-brand hover:underline";
const WRAP = "mx-auto max-w-[1240px] px-5 sm:px-8";
const EYEBROW = "text-[13px] font-medium uppercase tracking-[0.1em] text-ink-3";
const H2 = "mt-2 font-brand text-[clamp(26px,3vw,32px)] font-medium leading-[1.15] text-ink";

interface Audience {
  title: string;
  icon: ReactNode;
  body: ReactNode;
  action: { href: string; label: string };
}

const AUDIENCES: Audience[] = [
  {
    title: "System administrators",
    icon: <IconTerminalWindow24 />,
    body: (
      <>
        Running the Chap Modeling Platform? Find a model and the command to
        install it in your Chap instance.
      </>
    ),
    action: { href: "/models", label: "Find a model" },
  },
  {
    title: "DHIS2 Modeling App users",
    icon: <IconApps24 />,
    body: (
      <>
        Browse the available models to find one that suits your data and
        question. Models can only be installed by a system administrator, so
        each model page explains what to send to your administrator so they
        can install it for you.
      </>
    ),
    action: { href: "/models", label: "Browse models" },
  },
  {
    title: "Model developers",
    icon: <IconUser24 />,
    body: (
      <>
        If you have built a model, you can submit it to the Chap Marketplace.
        The Contribute page explains how to prepare your model, how to submit
        it with a pull request, and what the Chap team checks before it is
        listed.
      </>
    ),
    action: { href: "/contribute", label: "How to contribute" },
  },
];

function IconTile({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[4px] bg-brand-tint text-brand [&_svg]:fill-current">
      {children}
    </span>
  );
}

export default function HomePage() {
  return (
    <main>
      {/* What it is, and what "verified" does and does not promise. */}
      <section className="border-b border-line bg-surface">
        <div
          className={`${WRAP} grid items-center gap-10 pb-14 pt-12 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16 lg:pb-16`}
        >
          <div>
            <h1 className="font-brand text-[clamp(36px,4.6vw,54px)] font-medium leading-[1.05] text-ink">
              Chap Marketplace
            </h1>
            <p className="mt-5 max-w-[52ch] text-[clamp(18px,2vw,21px)] leading-[1.55] text-ink-2">
              Chap Marketplace lists forecasting models that can be installed
              in the Chap Modeling Platform and used from the DHIS2 Modeling
              App. Each model has a page that describes what it does, which
              data it needs, who made it, and how to install it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/models" className="d2-button d2-button-primary d2-button-large">
                Browse models →
              </Link>
              <Link href="/benchmarks" className="d2-button d2-button-large">
                See benchmarks
              </Link>
            </div>
          </div>

          <aside className="rounded-[4px] border border-[#a5d6a7] bg-verified-tint p-6">
            <div className="flex items-center gap-2.5 text-verified [&_svg]:fill-current">
              <IconCheckmarkCircle24 />
              <span className="text-[15px] font-medium">Verified to run in Chap</span>
            </div>
            <p className="mt-3 text-[15px] leading-[1.6] text-ink-2">
              Every model version listed here has been reviewed by the Chap
              team and{" "}
              <Link href="/docs/verification" className={LINK}>
                verified
              </Link>{" "}
              to run in Chap. Verification means a model works with the
              platform. It does not tell you how well the model forecasts.
              For that, see the{" "}
              <Link href="/benchmarks" className={LINK}>
                benchmarks
              </Link>
              .
            </p>
          </aside>
        </div>
      </section>

      {/* Who it is for: one card per audience, each with its next step. */}
      <section className={`${WRAP} pb-16 pt-14 sm:pb-20 sm:pt-16`}>
        <div className={EYEBROW}>Audience</div>
        <h2 className={H2}>Who is this site for?</h2>
        <ul className="mt-8 grid gap-5 md:grid-cols-3">
          {AUDIENCES.map((a) => (
            <li key={a.title} className="d2-card flex flex-col p-6">
              <IconTile>{a.icon}</IconTile>
              <h3 className="mt-4 text-[18px] font-medium text-ink">{a.title}</h3>
              <p className="mt-2 flex-1 text-[15px] leading-[1.6] text-ink-2">
                {a.body}
              </p>
              <Link
                href={a.action.href}
                className="mt-5 self-start text-[15px] font-medium text-brand hover:underline"
              >
                {a.action.label} →
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
