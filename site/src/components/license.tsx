import type { LicenseView } from "@/lib/licenses";

/** A version's full license details, for the Versions tab. */
export function LicenseSummary({ license, linkWeights = false }: {
  license: LicenseView;
  linkWeights?: boolean;
}) {
  return (
    <div className="space-y-2 text-[14px] leading-relaxed text-ink-2">
      <p className="flex flex-wrap items-center gap-2">
        <span>{license.weights ? "Code license: " : null}{license.code ?? (
          <span className="d2-tag">No license</span>
        )}</span>
        {license.code !== null && !license.codeOpenSource ? (
          <span className="d2-tag">Not open source</span>
        ) : null}
      </p>
      {license.weights ? (
        <p>
          Weights license: {linkWeights ? (
            <a href={license.weights.url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
              {license.weights.name}
            </a>
          ) : license.weights.name}
          {!license.weights.open_source ? (
            <span className="d2-tag ml-2">Not open source</span>
          ) : null}
        </p>
      ) : null}
      {license.restrictions ? <p className="text-[13px] text-ink-3">{license.restrictions}</p> : null}
    </div>
  );
}
