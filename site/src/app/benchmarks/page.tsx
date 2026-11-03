import type { Metadata } from "next";
import Link from "next/link";
import { IconInfo24 } from "@dhis2/ui-icons";
import { BenchmarkSuites } from "@/components/BenchmarksClient";
import {
  buildBenchmarkSuites,
  getBaselines,
  getDefaultMetrics,
  getBenchmarks,
  getMetricDefinitions,
} from "@/lib/benchmarks";
import { BENCHMARKS_LIVE } from "@/lib/flags";
import { getRegistry } from "@/lib/registry";

export const metadata: Metadata = {
  title: "Benchmarks",
  description:
    "How the listed models perform on a few public datasets, backtested by the Chap team — nothing self-reported.",
};

/** Rendered until real benchmark results exist. */
function BenchmarksComingSoon() {
  return (
    <main>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-[1240px] px-5 pb-10 pt-11 sm:px-8 sm:pb-12 sm:pt-16">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-exp">
            Coming soon
          </span>
          <h1 className="my-4 font-brand text-[clamp(36px,4vw,50px)] font-medium leading-[1.02] text-ink">
            Benchmarks
          </h1>
          <p className="max-w-[58ch] text-[16px] leading-[1.7] text-ink-2">
            Every score on this page will come from a controlled Chap
            evaluation of a pinned commit — nothing self-reported. No
            results have been published yet.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 sm:px-8 pt-9">
        <div className="d2-card px-[26px] py-6">
          <div className="font-brand text-[15px] font-medium text-ink">
            What will appear here
          </div>
          <p className="mt-1 max-w-[72ch] text-[13px] leading-[1.6] text-ink-2">
            One ranked table per reference dataset, with a full run record
            behind every row. The exact datasets, metrics and run parameters
            will be documented once the methodology is settled. Results are
            read from Chap&apos;s benchmarking server each time the site is
            published.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 sm:px-8 pb-24 pt-9">
        <div className="flex flex-wrap items-center justify-between gap-5 border-t border-line pt-5">
          <span className="text-[13px] text-ink-2">
            Per-model benchmark charts get the same treatment — they appear on
            each model&apos;s detail page together with the first recorded
            runs.
          </span>
          <Link
            href="/models"
            className="d2-button"
          >
            Browse models
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function BenchmarksPage() {
  const records = getBenchmarks();
  if (!BENCHMARKS_LIVE || records.length === 0) return <BenchmarksComingSoon />;

  const suites = buildBenchmarkSuites(getRegistry(), records, getMetricDefinitions());

  return (
    <main>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-[1240px] px-5 pb-10 pt-11 sm:px-8 sm:pt-16">
          <div>
            <h1 className="mb-4 font-brand text-[clamp(36px,4vw,50px)] font-medium leading-[1.02] text-ink">
              Benchmarks
            </h1>
            <div className="max-w-[70ch] space-y-4 text-[16px] leading-[1.7] text-ink-2">
              <p>
                How the listed models perform on a few public datasets: a
                quick, rough picture of model performance, not a guide to
                which model to choose.{" "}
                <Link href="/docs/benchmarks" className="font-medium text-brand hover:underline">
                  How the benchmarks are run →
                </Link>
              </p>
              <div className="d2-notice d2-notice-warning [&_svg]:shrink-0 [&_svg]:fill-exp">
                <IconInfo24 />
                <p className="text-[14px] leading-[1.55]">
                  These results cover a few datasets with a single setup, and a
                  model may do better or worse on your data. Evaluate the
                  candidates on your own data before choosing one, and use
                  these results to narrow down which to try.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <BenchmarkSuites
        suites={suites}
        baselines={getBaselines()}
        defaultMetrics={getDefaultMetrics()}
      />

      {suites.length === 0 ? (
        <section className="mx-auto max-w-[1240px] px-5 sm:px-8 pt-9">
          <div className="d2-card px-[26px] py-6">
            <div className="font-brand text-[15px] font-medium text-ink">
              Waiting for the first results
            </div>
            <p className="mt-1 max-w-[64ch] text-[13px] leading-[1.6] text-ink-2">
              This page renders the runs read from Chap&apos;s benchmarking
              server each time the site is published. A row appears once a
              listed model&apos;s run has been published.
            </p>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-[1240px] px-5 sm:px-8 pb-24 pt-9">
        <div className="flex flex-wrap items-center justify-between gap-5 border-t border-line pt-5">
          <span className="text-[13px] text-ink-2">
            Each model&apos;s detail page compares its versions on every
            dataset.
          </span>
          <Link
            href="/models"
            className="d2-button"
          >
            Browse models
          </Link>
        </div>
      </section>
    </main>
  );
}
