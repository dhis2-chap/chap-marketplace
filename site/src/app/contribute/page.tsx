import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { IconCheckmarkCircle24, IconInfo24, IconSync24 } from "@dhis2/ui-icons";
import { GitHubMark } from "@/components/icons";
import { CodePanel } from "@/components/CodePanel";
import { CopyButton } from "@/components/copy";
import { getRegistry } from "@/lib/registry";

export const metadata: Metadata = {
  title: "Contribute",
  description:
    "How to list a model in the Chap Marketplace: what you need, how review and verification work, and an example file.",
};

/** Compact version of the real schema documented in models/README.md. */
const EXAMPLE_YAML = `schema_version: 2

id: my_model
service_id: my-model          # MLServiceInfo.id — kebab-case of id
display_name: My Model
kind: model                   # model | starter
assessed_status: red          # YOUR OWN chapkit AssessedStatus

summary: >-
  What the model is and when to use it.

developed_for: >-             # the disease and setting you tested it on
  Monthly dengue cases in Country X at district level.

source:
  repository: https://github.com/org/my_model
  image: ghcr.io/org/my_model                  # published, no tag
  runtime_image: ghcr.io/dhis2-chap/chapkit-py # the chapkit base

attribution:
  author: Your Name
  organization: Your Institute
  original_source: https://...  # upstream model, if you adapted one

compatibility:
  period_types: [monthly]
  min_prediction_periods: 1
  max_prediction_periods: 12
  requires_geo: false

covariates:
  required: [population]      # supplied automatically by chap
  defaults: [rainfall]        # your service's own defaults
  allow_free_additional: true

channels:
  stable: 1.0.0               # must point at a verified version
  latest: 1.0.0

versions:
  - version: 1.0.0            # your MLServiceInfo.version
    commit: 1111111111111111111111111111111111111111
    image_tag: sha-1111111    # the tag built from that commit
    image_digest: sha256:…    # what that tag resolves to
    chapkit: ">=2.0.0,<3"
    status: verified          # set by maintainers on approval
    verified_by: []           # the reviewers
    changelog: First submission.

configurations:
  monthly:
    description: When to use this configuration.
    config:
      prediction_periods: 3
      some_option: 12
      additional_continuous_covariates: [rainfall]
`;

const CHECKS = [
  "It is a chapkit service.",
  "The image is published with a sha-<short commit> tag.",
  "The pin is the full 40-character commit, the image tag built from it and the digest that tag resolves to.",
  "It registers with chap-core and runs a train and a predict.",
  "assessed_status is your own honest rating — we copy it as is.",
  "At least one maintainer GitHub handle is listed.",
];

const LINK = "font-medium text-brand hover:underline";
const H2 = "mb-4 font-brand text-[22px] font-medium text-ink";

const STEPS: [string, ReactNode][] = [
  [
    "You submit",
    <>
      You describe your model in a single YAML file and open a pull request in
      the Chap Marketplace repository on GitHub. The example file and
      checklist below show what to include.
    </>,
  ],
  [
    "We review and verify it",
    <>
      The Chap team checks that the model works with Chap: that it is a
      chapkit service whose published image matches the listed code, that it
      registers with Chap and can train and predict, and that the file is
      valid. This is what we call verification. Read{" "}
      <Link href="/docs/verification" className={LINK}>
        Model verification
      </Link>{" "}
      for what it covers and what it does not.
    </>,
  ],
  [
    "Your model is listed",
    <>
      Once the review is approved, the model appears in the marketplace under
      your name. Listed models are also run in our{" "}
      <Link href="/benchmarks" className={LINK}>
        benchmarks
      </Link>
      .
    </>,
  ],
];

export default function ContributePage() {
  const registry = getRegistry();
  const repository = registry.index.marketplace.repository;
  return (
    <main className="mx-auto max-w-[1240px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
      <h1 className="max-w-[20ch] font-brand text-[clamp(32px,4vw,46px)] font-medium leading-[1.1] text-ink">
        Submit a model
      </h1>
      <p className="mt-4 max-w-[64ch] text-[17px] leading-[1.6] text-ink-2">
        Contributing a model means listing it in the Chap Marketplace, so that
        anyone running the Chap Modeling Platform can find it, install it and
        use it from the DHIS2 Modeling App. Your name and organization are
        shown on the model&apos;s page. The model stays yours: its code lives
        in your own repository, and you keep developing and maintaining it
        there.
      </p>

      <section className="mt-12">
        <h2 className={H2}>What you need</h2>
        <ul className="grid gap-4 md:grid-cols-2">
          <li className="d2-card flex gap-4 p-5 text-[15px] leading-[1.6] text-ink-2">
            <span className="flex shrink-0">
              <IconCheckmarkCircle24 color="var(--mp-verified)" />
            </span>
            <span>
              A model packaged as a{" "}
              <a
                href="https://chap.dhis2.org/chap-modeling-platform/external_models/chapkit/"
                target="_blank"
                rel="noreferrer"
                className={LINK}
              >
                chapkit
              </a>{" "}
              service, with its image published. If your model is not packaged
              yet, the chapkit guide explains how.
            </span>
          </li>
          <li className="d2-card flex gap-4 p-5 text-[15px] leading-[1.6] text-ink-2">
            <span className="flex shrink-0">
              <IconCheckmarkCircle24 color="var(--mp-verified)" />
            </span>
            <span>
              A short description of the model: what it does, which disease
              and setting it was developed for, and what data it needs.
            </span>
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className={H2}>What happens when you submit</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="d2-card p-5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand font-medium text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 text-[17px] font-medium text-ink">{title}</h3>
              <p className="mt-1 text-[15px] leading-[1.6] text-ink-2">{body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="d2-notice [&_svg]:shrink-0 [&_svg]:fill-brand">
            <IconSync24 />
            <p className="text-[14px] leading-[1.55]">
              To publish a new version later, open a pull request that adds it
              to your file. Each version is verified separately.
            </p>
          </div>
          <div className="d2-notice d2-notice-warning [&_svg]:shrink-0 [&_svg]:fill-exp">
            <IconInfo24 />
            <p className="text-[14px] leading-[1.55]">
              Verification checks that a model runs in Chap. It does not judge
              how good its forecasts are. Describe honestly in your file what
              the model was developed and tested for, so users can judge
              whether it fits their needs.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-12 grid items-start gap-10 lg:grid-cols-[1.3fr_1fr]">
        {/* min-w-0: without it the grid track sizes to the widest YAML line
            instead of letting the code panel scroll. */}
        <div className="min-w-0">
          <h2 className="mb-2 font-brand text-[22px] font-medium text-ink">
            Example file
          </h2>
          <p className="mb-5 text-[15px] text-ink-2">
            Full format in{" "}
            <a
              href={`${repository}/blob/main/models/README.md`}
              target="_blank"
              rel="noreferrer"
              className={LINK}
            >
              models/README.md
            </a>
            .
          </p>
          <div className="overflow-hidden rounded-[3px] border border-line">
            <div className="flex items-center justify-between gap-4 border-b border-line bg-surface-2 px-4 py-3">
              <span className="font-mono text-[14px] text-ink-2">
                models/my_model.yaml
              </span>
              <CopyButton text={EXAMPLE_YAML} label="Copy file" />
            </div>
            <CodePanel code={EXAMPLE_YAML} gutterWidth={18} />
          </div>
        </div>
        <aside className="min-w-0">
          <h2 className="mb-4 font-brand text-[22px] font-medium text-ink">
            Before you open the PR
          </h2>
          <ul className="space-y-3">
            {CHECKS.map((c) => (
              <li key={c} className="flex gap-3 text-[15px] leading-[1.5] text-ink-2">
                <span className="flex shrink-0">
                  <IconCheckmarkCircle24 color="var(--mp-verified)" />
                </span>
                {c}
              </li>
            ))}
          </ul>
          <a
            href={`${repository}/compare`}
            target="_blank"
            rel="noreferrer"
            className="d2-button d2-button-primary d2-button-large mt-8 w-full"
          >
            <GitHubMark className="h-4 w-4" />
            Open a pull request
          </a>
        </aside>
      </div>
    </main>
  );
}
