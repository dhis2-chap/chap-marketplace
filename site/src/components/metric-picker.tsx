"use client";

import { IconChevronDown16 } from "@dhis2/ui-icons";
import { useEffect, useRef, useState } from "react";
import type { MetricColumn } from "@/lib/metrics";
import { CheckboxIcon } from "./baseline";

/** Remembers the visitor's metric picks; storage may be unavailable. */
const STORAGE_KEY = "chap-marketplace:benchmark-metrics";

function readPicks(): string[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) &&
      parsed.every((id) => typeof id === "string")
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function writePicks(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Not remembered; the picks still apply for this visit.
  }
}

/**
 * The shown metrics, the defaults until the visitor picks their own. Their
 * picks are restored after hydration, so the prerendered table matches the
 * first render, and shared by every benchmark table on the site.
 */
export function useMetricPicks(
  available: string[],
  defaults: string[],
): [string[], (ids: string[]) => void] {
  const [shown, setShown] = useState(defaults);
  useEffect(() => {
    const picks = readPicks()?.filter((id) => available.includes(id));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (picks) setShown(picks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [
    shown,
    (ids) => {
      setShown(ids);
      writePicks(ids);
    },
  ];
}

export function MetricPicker({
  columns,
  selected,
  defaults,
  onChange,
}: {
  columns: Pick<MetricColumn, "id" | "label" | "description">[];
  selected: string[];
  defaults: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Keep chap-core's metric order whatever order the boxes were ticked in.
  const toggle = (id: string) =>
    onChange(
      columns
        .map((c) => c.id)
        .filter((c) => (c === id ? !selected.includes(c) : selected.includes(c))),
    );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="d2-button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        Metrics ({selected.length} of {columns.length})
        <IconChevronDown16 />
      </button>
      {open ? (
        <div className="d2-flyout absolute right-0 z-20 mt-1 max-h-[480px] w-[min(360px,calc(100vw-32px))]">
          <div className="flex items-center justify-between gap-3 pr-3">
            <h6 className="d2-menu-header">Shown metrics</h6>
            <span className="flex gap-2">
              <button
                type="button"
                className="d2-button d2-button-small d2-button-secondary"
                onClick={() => onChange(columns.map((c) => c.id))}
              >
                All
              </button>
              <button
                type="button"
                className="d2-button d2-button-small d2-button-secondary"
                onClick={() => onChange(defaults)}
              >
                Default
              </button>
            </span>
          </div>
          <ul className="m-0 list-none p-0">
            {columns.map((c) => (
              <li key={c.id}>
                <label className="d2-menu-item d2-checkbox items-start py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                  <CheckboxIcon />
                  <span className="ml-1 min-w-0">
                    <span className="block">{c.label}</span>
                    {c.description ? (
                      <span className="mt-0.5 block text-[13px] leading-[1.4] text-ink-2">
                        {c.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
