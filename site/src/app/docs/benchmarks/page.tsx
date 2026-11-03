import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How the benchmarks are run",
  description:
    "What the Chap Marketplace benchmarks can and cannot tell you, and how the Chap team runs them: datasets, backtesting, metrics and ranking.",
};

const LINK = "font-medium text-brand hover:underline";
const H2 = "mb-3 font-brand text-[22px] font-medium text-ink";

export default function BenchmarkDocsPage() {
  return (
    <main className="mx-auto max-w-[1240px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
      <Link href="/docs" className={`text-[15px] ${LINK}`}>
        ← Documentation
      </Link>
      <h1 className="mt-5 font-brand text-[clamp(32px,4vw,46px)] font-medium leading-[1.1] text-ink">
        How the benchmarks are run
      </h1>
      <div className="mt-6 max-w-[70ch] space-y-8 text-[17px] leading-[1.6] text-ink-2">
        <p>
          The{" "}
          <Link href="/benchmarks" className={LINK}>
            Benchmarks
          </Link>{" "}
          page shows how the listed models perform on a few public datasets.
          It gives a quick, rough picture of model performance. It is not a
          guide to which model to choose.
        </p>

        <section>
          <h2 className={H2}>What the results can and cannot tell you</h2>
          <p>
            The benchmarks cover a small number of datasets, from a few
            countries, with a single setup. A model that does well here may do
            worse on your data, and the other way round. Performance depends
            heavily on the disease, the country, the level of detail and
            quality of the data, and how far ahead you forecast.
          </p>
          <p className="mt-3">
            To choose a model for your own use, evaluate the candidates on your
            own data: in the{" "}
            <a
              href="https://chap.dhis2.org/chap-modeling-platform/modeling-app/using-the-modeling-app/getting-started/"
              target="_blank"
              rel="noreferrer"
              className={LINK}
            >
              DHIS2 Modeling App
            </a>
            , which can evaluate and compare models, or with the{" "}
            <a
              href="https://chap.dhis2.org/chap-modeling-platform/chap-cli/eval-reference/"
              target="_blank"
              rel="noreferrer"
              className={LINK}
            >
              <code className="font-mono text-[15px]">chap eval</code>
            </a>{" "}
            command. Use the benchmarks to narrow down which models to try,
            not to make the final decision.
          </p>
        </section>

        <section>
          <h2 className={H2}>Who runs them</h2>
          <p>
            The Chap team runs every benchmark on its own{" "}
            <a
              href="https://github.com/dhis2-chap/chap_benchmarking"
              target="_blank"
              rel="noreferrer"
              className={LINK}
            >
              benchmarking server
            </a>
            , in the same way for every model. No results are self-reported by
            model authors. New model versions are benchmarked automatically
            once they are listed.
          </p>
        </section>

        <section>
          <h2 className={H2}>Datasets</h2>
          <p>
            Monthly data from Vietnam, Laos and Thailand, from the open{" "}
            <a
              href="https://github.com/dhis2/climate-health-data"
              target="_blank"
              rel="noreferrer"
              className={LINK}
            >
              climate-health-data
            </a>{" "}
            repository.
          </p>
        </section>

        <section>
          <h2 className={H2}>Method</h2>
          <p>
            Each model is tested by backtesting. It is trained on the data up
            to a point in time and forecasts the next three months, and the
            forecasts are compared with what actually happened. This is
            repeated six times, moving the point in time forward one month
            each time, and the results are combined. See the{" "}
            <a
              href="https://chap.dhis2.org/chap-modeling-platform/contributor/evaluation_pipeline/"
              target="_blank"
              rel="noreferrer"
              className={LINK}
            >
              evaluation pipeline
            </a>{" "}
            for the details.
          </p>
        </section>

        <section>
          <h2 className={H2}>Metrics</h2>
          <p>
            Every run records the metrics the Chap platform computes, such as
            the continuous ranked probability score (CRPS), mean absolute
            error (MAE) and interval coverage. What each one measures is
            described in{" "}
            <a
              href="https://github.com/dhis2-chap/chap-core/tree/master/chap_core/assessment/metrics"
              target="_blank"
              rel="noreferrer"
              className={LINK}
            >
              chap-core&apos;s metric definitions
            </a>
            ; the Metrics menu above each table shows the same descriptions.
          </p>
        </section>

        <section>
          <h2 className={H2}>Ranking</h2>
          <p>
            By default, each table shows six metrics in the Chap
            platform&apos;s default order, and models are sorted by the first
            of them: CRPS on log-transformed case counts. This is a default,
            not a verdict on which model is best, so take it with a grain of
            salt. You can sort by any other metric, or pick the metrics shown.
          </p>
          <p className="mt-3">
            We have not yet decided how to rank models across datasets, and
            more benchmarks are needed before the results say much. Look at
            several metrics, and above all at the ones that matter for how you
            will use the forecasts.
          </p>
        </section>

        <p className="text-[15px]">
          Technical details on how results reach this site are in{" "}
          <a
            href="https://github.com/dhis2-chap/model-marketplace/blob/main/benchmarks/README.md"
            target="_blank"
            rel="noreferrer"
            className={LINK}
          >
            benchmarks/README.md
          </a>
          .
        </p>

        <Link href="/benchmarks" className="d2-button d2-button-secondary">
          See the benchmarks
        </Link>
      </div>
    </main>
  );
}
