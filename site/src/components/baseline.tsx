"use client";

import { IconChevronDown16 } from "@dhis2/ui-icons";
import { useState } from "react";
import type { Baseline } from "@/lib/schema";

/** The @dhis2-ui/checkbox regular icon. */
export function CheckboxIcon() {
  return (
    <span className="d2-checkbox-icon" aria-hidden>
      <svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
        <rect className="background" x="0" y="0" width="18" height="18" rx="3" />
        <path
          className="border"
          d="M15,0 C16.6568542,0 18,1.34314575 18,3 L18,15 C18,16.6568542 16.6568542,18 15,18 L3,18 C1.34314575,18 0,16.6568542 0,15 L0,3 C0,1.34314575 1.34314575,0 3,0 L15,0 Z M15,1 L3,1 C1.9456382,1 1.08183488,1.81587779 1.00548574,2.85073766 L1,3 L1,15 C1,16.0543618 1.81587779,16.9181651 2.85073766,16.9945143 L3,17 L15,17 C16.0543618,17 16.9181651,16.1841222 16.9945143,15.1492623 L17,15 L17,3 C17,1.9456382 16.1841222,1.08183488 15.1492623,1.00548574 L15,1 Z"
        />
        <path
          className="checkmark"
          d="M4.74451387,8.02852516 C4.39595738,8.11985643 4.12375034,8.39235188 4.03251575,8.74127768 C3.94128115,9.09020348 4.04521722,9.46125864 4.30437605,9.71182782 L7.29823844,12.7078028 C7.68753993,13.0973991 8.31859767,13.0973991 8.70789916,12.7078028 L13.695624,6.71585285 C13.9547828,6.46528367 14.0587189,6.09422851 13.9674843,5.74530271 C13.8762497,5.39637691 13.6040426,5.12388146 13.2554861,5.0325502 C12.9069296,4.94121893 12.5362672,5.04526513 12.2859632,5.30469855 L8.0030688,10.5910713 L5.71403676,8.30067351 C5.46373279,8.0412401 5.09307036,7.9371939 4.74451387,8.02852516 Z"
        />
      </svg>
    </span>
  );
}

/**
 * The baseline comparison, as in the modeling app: off by default, with
 * chap's default baseline preselected for when it is ticked.
 */
export function useBaselineToggle(baselines: Baseline[]) {
  const [comparing, setComparing] = useState(false);
  const [baselineId, setBaselineId] = useState(
    () => (baselines.find((b) => b.default) ?? baselines[0])?.id ?? "",
  );
  const selected = baselines.find((b) => b.id === baselineId) ?? null;
  return {
    baseline: comparing ? selected : null,
    comparing,
    onComparingChange: setComparing,
    baselineId,
    onBaselineChange: setBaselineId,
  };
}

/** The Compare with baseline checkbox and the baseline select it enables. */
export function BaselineToggle({
  baselines,
  comparing,
  onComparingChange,
  baselineId,
  onBaselineChange,
}: {
  baselines: Baseline[];
  comparing: boolean;
  onComparingChange: (comparing: boolean) => void;
  baselineId: string;
  onBaselineChange: (id: string) => void;
}) {
  if (baselines.length === 0) return null;
  return (
    <div className="flex items-center gap-3">
      <label className="d2-checkbox">
        <input
          type="checkbox"
          checked={comparing}
          onChange={(e) => onComparingChange(e.target.checked)}
        />
        <CheckboxIcon />
        Compare with baseline
      </label>
      {/* A native select styled as the Metrics button, with its chevron. */}
      <span className="relative inline-flex">
        <select
          aria-label="Baseline"
          className="d2-button appearance-none pr-[34px] [field-sizing:content]"
          disabled={!comparing}
          title={
            comparing
              ? undefined
              : "Tick Compare with baseline to choose the baseline."
          }
          value={baselineId}
          onChange={(e) => onBaselineChange(e.target.value)}
        >
          {baselines.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <span
          className={`pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 ${comparing ? "fill-ink" : "fill-[#a0adba]"}`}
        >
          <IconChevronDown16 />
        </span>
      </span>
    </div>
  );
}
