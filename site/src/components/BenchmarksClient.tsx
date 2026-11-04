"use client";

import {
  IconArrowLeft16,
  IconArrowRight16,
  IconCross16,
} from "@dhis2/ui-icons";
import Link from "next/link";
import { useRef, useState } from "react";
import type { BenchmarkRowView, BenchmarkSuiteView } from "@/lib/benchmarks";
import { bestRankKey, formatComparison, metricRankKey } from "@/lib/metrics";
import type { Baseline } from "@/lib/schema";
import { BaselineToggle, useBaselineToggle } from "./baseline";
import { MetricPicker, useMetricPicks } from "./metric-picker";

/**
 * The benchmark suites, one table after another, each row opening its
 * run record in a centred modal so the full metric list stays out of the
 * page flow. The shown metrics, the baseline compared with, sorting and
 * the open row are the only client state; everything rendered comes from the build-time suite views.
 */

function valueOf(row: BenchmarkRowView, id: string): string {
  return row.metrics.find((m) => m.id === id)?.value ?? "—";
}

type SortDirection = "asc" | "desc";

/**
 * The @dhis2-ui/table Sorter: `asc` ranks best first, `desc` worst first;
 * columns not ranked by show `default`.
 */
function Sorter({
  direction,
  label,
  onClick,
}: {
  direction: SortDirection | "default";
  label: string;
  onClick: () => void;
}) {
  const title =
    direction === "asc"
      ? `Ranked by ${label}, best first — click for worst first`
      : direction === "desc"
        ? `Ranked by ${label}, worst first — click for best first`
        : `Rank by ${label}`;
  return (
    <button
      type="button"
      className="d2-table-sorter"
      data-direction={direction}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
        <polygon className="top" points="4 9 12 9 8 14" />
        <polygon className="bottom" points="4 7 12 7 8 2" />
      </svg>
    </button>
  );
}

function Figure({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0 bg-surface px-4 py-3">
      <div className="truncate text-[13px] text-ink-2">{label}</div>
      <div
        className={`mt-1 truncate font-mono ${
          strong ? "text-[18px] font-medium text-ink" : "text-[16px] text-ink-2"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function RunRecord({
  row,
  shown,
}: {
  row: BenchmarkRowView;
  shown: string[];
}) {
  if (!row.measured) {
    return (
      <p className="max-w-[60ch] text-[14px] leading-[1.6] text-ink-2">
        The benchmarking server has no result for this pin on this suite yet. It
        benchmarks every listed model whose period type and covariates the
        dataset has, and the row fills in once it does.
      </p>
    );
  }
  // The metrics picked for the table head the record; the rest follow.
  const headline = row.metrics.filter((m) => shown.includes(m.id));
  const rest = row.metrics.filter((m) => !shown.includes(m.id));
  return (
    <div className="flex flex-col gap-6">
      {headline.length > 0 ? (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border border-line bg-line sm:grid-cols-4">
          {headline.map((m, i) => (
            <Figure key={m.id} label={m.label} value={m.value} strong={i === 0} />
          ))}
        </div>
      ) : null}

      {rest.length > 0 ? (
        <section>
          <h3 className="mb-2 text-[14px] font-medium text-ink">
            {headline.length > 0 ? "Other recorded metrics" : "All recorded metrics"}
          </h3>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            {rest.map((m) => (
              <div
                key={m.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-t border-line py-2.5"
              >
                <dt className="text-[14px] text-ink">{m.label}</dt>
                <dd className="text-right font-mono text-[13px] text-ink">
                  {m.value}
                </dd>
                {m.description ? (
                  <dd className="col-span-2 mt-0.5 text-[13px] leading-[1.45] text-ink-2">
                    {m.description}
                  </dd>
                ) : null}
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </div>
  );
}

function RunRecordModal({
  dialogRef,
  suite,
  rows,
  index,
  shown,
  onStep,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  suite: BenchmarkSuiteView;
  rows: BenchmarkRowView[];
  index: number;
  shown: string[];
  onStep: (index: number) => void;
}) {
  const row = rows[index];
  if (!row) return <dialog ref={dialogRef} />;
  const close = () => dialogRef.current?.close();
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="run-record-title"
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" && index > 0) onStep(index - 1);
        if (e.key === "ArrowRight" && index < rows.length - 1)
          onStep(index + 1);
      }}
      className="d2-modal d2-modal-large"
    >
      <button
        type="button"
        className="d2-modal-close"
        aria-label="Close"
        onClick={close}
      >
        <IconCross16 />
      </button>

      <header className="order-1 mb-3 min-w-0 pr-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 id="run-record-title" className="d2-modal-title order-none m-0">
            {row.name}
          </h1>
          <span
            className={`d2-tag ${
              row.measured ? "d2-tag-positive" : "d2-tag-neutral"
            }`}
          >
            {row.measured ? "Successful run" : "Not run"}
          </span>
        </div>
        <div className="mt-1 text-[13px] text-ink-2">
          {suite.heading} · {row.measured ? `rank ${index + 1}` : "no run"}
        </div>
        <div className="mt-0.5 truncate font-mono text-[12px] text-ink-3">
          {row.pinLine} · {row.versionTag}
        </div>
      </header>

      <div className="d2-modal-content">
        <RunRecord row={row} shown={shown} />
      </div>

      <div className="d2-modal-actions flex-wrap justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="d2-button d2-button-secondary"
            disabled={index === 0}
            onClick={() => onStep(index - 1)}
            aria-label="Previous row"
          >
            <IconArrowLeft16 />
          </button>
          <span className="text-[14px] text-ink-2">
            {index + 1} of {rows.length}
          </span>
          <button
            type="button"
            className="d2-button d2-button-secondary"
            disabled={index === rows.length - 1}
            onClick={() => onStep(index + 1)}
            aria-label="Next row"
          >
            <IconArrowRight16 />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/models/${row.modelId}`} className="d2-button">
            Model page
          </Link>
          <button
            type="button"
            className="d2-button d2-button-primary"
            data-autofocus
            onClick={close}
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}

function SuiteTable({
  suite,
  shown,
  baseline,
}: {
  suite: BenchmarkSuiteView;
  shown: string[];
  baseline: Baseline | null;
}) {
  // Ranked by the first shown metric, best first, until a sorter is used;
  // using the ranked column's sorter again flips the direction.
  const [sortPick, setSortPick] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [openIndex, setOpenIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const columns = suite.columns.filter((c) => shown.includes(c.id));
  // A sort column the visitor has since hidden falls back to the first shown.
  const sortColumn =
    columns.find((c) => c.id === sortPick) ?? columns[0] ?? null;
  const comparison = (row: BenchmarkRowView, id: string) =>
    baseline ? row.comparisons[baseline.id]?.[id] : undefined;
  // A comparison is signed so positive is better, so it ranks by its negation.
  const rankOf = (row: BenchmarkRowView) => {
    if (!sortColumn) return undefined;
    if (baseline) {
      const c = comparison(row, sortColumn.id);
      return c === undefined ? undefined : -c;
    }
    const v = row.values[sortColumn.id];
    return v === undefined ? undefined : metricRankKey(sortColumn, v);
  };
  // Rows without a value for the ranked metric stay last either way.
  const compare = (a: BenchmarkRowView, b: BenchmarkRowView) => {
    const ka = rankOf(a);
    const kb = rankOf(b);
    if (ka === undefined || kb === undefined)
      return (ka === undefined ? 1 : 0) - (kb === undefined ? 1 : 0);
    return sortDirection === "asc" ? ka - kb : kb - ka;
  };
  const bestKey = Object.fromEntries(
    columns.map((c) => [
      c.id,
      bestRankKey(
        c,
        suite.rows.flatMap((r) => (r.values[c.id] === undefined ? [] : [r.values[c.id]])),
      ),
    ]),
  );
  const isBest = (row: BenchmarkRowView, c: (typeof columns)[number]) =>
    row.values[c.id] !== undefined &&
    metricRankKey(c, row.values[c.id]) === bestKey[c.id];
  const sortBy = (id: string) => {
    if (sortColumn?.id === id)
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else setSortDirection("asc");
    setSortPick(id);
  };
  const measured = suite.rows.filter((r) => r.measured);
  const rows = (
    sortColumn ? [...measured].sort(compare) : measured
  ).concat(suite.rows.filter((r) => !r.measured));

  const openRow = (i: number) => {
    setOpenIndex(i);
    dialogRef.current?.showModal();
    // showModal focuses the first enabled control (the close cross);
    // start on Close instead.
    dialogRef.current
      ?.querySelector<HTMLElement>("[data-autofocus]")
      ?.focus();
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <dl className="flex flex-wrap gap-x-5 gap-y-1">
          {suite.runContext.map((c) => (
            <div key={c.k} className="flex items-baseline gap-1.5">
              <dt className="text-[13px] text-ink-2">{c.k}</dt>
              <dd className="font-mono text-[13px] text-ink">
                {c.href ? (
                  <a
                    href={c.href}
                    className="font-medium text-brand hover:underline"
                  >
                    {c.v}
                  </a>
                ) : (
                  c.v
                )}
              </dd>
            </div>
          ))}
        </dl>
        <span className="whitespace-nowrap text-[13px] text-ink-2">
          {suite.countLine}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table
          className="d2-table"
          style={{ minWidth: 400 + columns.length * 120 }}
        >
          <thead>
            <tr>
              <th className="w-12 text-left" scope="col">
                <span className="d2-table-head">#</span>
              </th>
              <th className="text-left" scope="col">
                <span className="d2-table-head">Model · pin</span>
              </th>
              <th className="text-left" scope="col">
                <span className="d2-table-head">Version</span>
              </th>
              {columns.map((c) => (
                <th
                  key={c.id}
                  scope="col"
                  title={c.description}
                  aria-sort={
                    sortColumn?.id === c.id
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <span className="d2-table-head justify-end">
                    {c.label}
                    <Sorter
                      direction={
                        sortColumn?.id === c.id ? sortDirection : "default"
                      }
                      label={c.label}
                      onClick={() => sortBy(c.id)}
                    />
                  </span>
                </th>
              ))}
              <th className="text-left" scope="col">
                <span className="d2-table-head">Status</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                onClick={() => openRow(i)}
                className={`cursor-pointer ${row.measured ? "" : "opacity-[0.62]"}`}
              >
                <td className="font-mono text-ink-2">
                  {row.measured ? i + 1 : "—"}
                </td>
                <td className="max-w-0 min-w-[220px]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRow(i);
                    }}
                    className="block max-w-full cursor-pointer truncate border-0 bg-transparent p-0 text-left text-[14px] font-medium text-ink hover:underline"
                  >
                    {row.name}
                  </button>
                  <span className="mt-0.5 block truncate font-mono text-[12px] text-ink-3">
                    {row.pinLine}
                  </span>
                </td>
                <td className="whitespace-nowrap font-mono text-[13px] text-ink-2">
                  {row.isStable ? (
                    <span
                      tabIndex={0}
                      className="d2-tooltip-anchor underline decoration-dotted underline-offset-2"
                    >
                      stable
                      <span role="tooltip" className="d2-tooltip">
                        Stable · {row.versionTag}
                      </span>
                    </span>
                  ) : (
                    row.versionTag
                  )}
                </td>
                {columns.map((c) => {
                  const v = comparison(row, c.id);
                  return (
                    <td
                      key={c.id}
                      className={`text-right font-mono ${
                        v !== undefined && v > 0
                          ? "text-verified"
                          : v !== undefined && v < 0
                            ? "text-danger"
                            : !baseline && isBest(row, c)
                              ? "font-bold text-ink"
                              : sortColumn?.id === c.id
                                ? "text-ink"
                                : "text-ink-2"
                      }`}
                    >
                      {baseline
                        ? v === undefined
                          ? "—"
                          : formatComparison(c, v)
                        : valueOf(row, c.id)}
                    </td>
                  );
                })}
                <td>
                  <span
                    className={`d2-tag ${
                      row.measured ? "d2-tag-positive" : "d2-tag-neutral"
                    }`}
                  >
                    {row.measured ? "Successful" : "Not run"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RunRecordModal
        dialogRef={dialogRef}
        suite={suite}
        rows={rows}
        index={openIndex}
        shown={shown}
        onStep={setOpenIndex}
      />
    </>
  );
}

export function BenchmarkSuites({
  suites,
  baselines,
  defaultMetrics,
}: {
  suites: BenchmarkSuiteView[];
  baselines: Baseline[];
  /** chap's default metrics, in any order. */
  defaultMetrics: string[];
}) {
  // Every metric any suite records, in chap-core's default order.
  const columns = [
    ...new Map(suites.flatMap((s) => s.columns).map((c) => [c.id, c])).values(),
  ];
  // In column order, which is chap-core's metric order.
  const defaults = columns
    .map((c) => c.id)
    .filter((id) => defaultMetrics.includes(id));
  const [shown, setShown] = useMetricPicks(
    columns.map((c) => c.id),
    defaults,
  );
  const { baseline, ...toggle } = useBaselineToggle(baselines);


  if (suites.length === 0) return null;
  return (
    <>
      {/* The caption is always shown and only its text changes, so ticking
          the comparison does not move the tables. */}
      <section className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-8 gap-y-4 px-5 pt-9 sm:px-8">
        <p className="min-w-0 max-w-[70ch] flex-[1_1_40ch] text-[14px] leading-[1.55] text-ink-2">
          {baseline ? (
            <>
              Scores compared with the {baseline.name} baseline: positive is
              better, negative worse. Percentages are relative improvements;
              the rest are in each metric&apos;s units.
            </>
          ) : (
            <>
              Scores aggregated across all splits and organisation units; the
              best in each column is in bold.
              {baselines.length > 0
                ? " Compare with a baseline to see how much better or worse each model does than it."
                : null}
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <BaselineToggle baselines={baselines} {...toggle} />
          <MetricPicker
            columns={columns}
            selected={shown}
            defaults={defaults}
            onChange={setShown}
          />
        </div>
      </section>
      {suites.map((suite) => (
        <section
          key={suite.dataset}
          className="mx-auto max-w-[1240px] px-5 sm:px-8 pt-8"
        >
          <h2 className="mb-2 text-[20px] font-medium text-ink">
            {suite.heading}
          </h2>
          <SuiteTable suite={suite} shown={shown} baseline={baseline} />
        </section>
      ))}
    </>
  );
}
