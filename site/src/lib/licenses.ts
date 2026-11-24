import parse from "spdx-expression-parse";
import spdx from "spdx-license-list";
import type { Model, ModelLicense, ModelVersion } from "./schema";

/** Ignore formatting, redundant grouping and term order; preserve license IDs. */
export function normalizeSpdx(expression: string): string {
  function normalize(node: parse.Info): string {
    if ("license" in node) {
      return node.license + (node.plus ? "+" : "") +
        (node.exception ? ` WITH ${node.exception}` : "");
    }
    const terms = (child: parse.Info): string[] =>
      "conjunction" in child && child.conjunction === node.conjunction
        ? [...terms(child.left), ...terms(child.right)]
        : [normalize(child)];
    return `(${terms(node).sort().join(` ${node.conjunction.toUpperCase()} `)})`;
  }
  return normalize(parse(expression));
}

export function isOpenSourceCode(code: string | null): boolean {
  if (code === null) return false;
  function approved(node: parse.Info): boolean {
    if ("license" in node) return spdx[node.license]?.osiApproved === true;
    return node.conjunction === "and"
      ? approved(node.left) && approved(node.right)
      : approved(node.left) || approved(node.right);
  }
  try {
    return approved(parse(code));
  } catch {
    return false; // The schema reports the invalid expression separately.
  }
}

export function licenseFor(model: Model, version: ModelVersion): ModelLicense {
  return version.license ?? model.license;
}

export interface LicenseView extends ModelLicense {
  codeOpenSource: boolean;
  status: "Open source" | "Not open source" | "No license";
}

/** This describes the declared code and weights, not every image dependency. */
export function toLicenseView(license: ModelLicense): LicenseView {
  const codeOpenSource = isOpenSourceCode(license.code);
  return {
    ...license,
    codeOpenSource,
    status: license.code === null ? "No license"
      : codeOpenSource && license.weights?.open_source !== false
        ? "Open source" : "Not open source",
  };
}

export function checkLicenseLabel(label: string, code: string | null): "match" | "missing" {
  if (!label.trim()) return "missing";
  if (code === null || normalizeSpdx(label) !== normalizeSpdx(code)) {
    throw new Error(`image license ${JSON.stringify(label)} does not match license.code ${JSON.stringify(code)}`);
  }
  return "match";
}
