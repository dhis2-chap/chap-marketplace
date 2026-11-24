import type { LicenseView } from "@/lib/licenses";

/** Shared disclosure for cards, the stable pin and individual versions. */
export function LicenseSummary({ license, linkWeights = false }: {
  license: LicenseView;
  linkWeights?: boolean;
}) {
  return (
    <div className="space-y-2 text-[14px] leading-relaxed text-ink-2">
      <p className="flex flex-wrap items-center gap-2">
        <span>Code: {license.code ?? (
          <span className="d2-tag d2-tag-negative">No license</span>
        )}</span>
        {license.code !== null && !license.codeOpenSource ? (
          <span className="d2-tag d2-tag-negative">Not open source</span>
        ) : null}
      </p>
      {license.weights ? (
        <p>
          Weights: {linkWeights ? (
            <a href={license.weights.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
              {license.weights.name}
            </a>
          ) : license.weights.name}
          {!license.weights.open_source ? (
            <span className="d2-tag d2-tag-negative ml-2">Not open source</span>
          ) : null}
        </p>
      ) : null}
      {license.restrictions ? <p>{license.restrictions}</p> : null}
    </div>
  );
}
