import { describe, expect, it } from "vitest";
import { checkLicenseLabel, normalizeSpdx, toLicenseView } from "./licenses";
import { loadRegistry, stableVersion } from "./registry";
import { licenseSchema, modelSchema } from "./schema";
import { toCardView, toDetailView } from "./views";

describe("model licenses", () => {
  const registry = loadRegistry();
  const model = registry.models[0];

  it("requires an explicit license block and valid SPDX code or null", () => {
    expect(modelSchema.safeParse({ ...model, license: undefined }).success).toBe(false);
    for (const code of [undefined, "", "Apache 2"]) {
      expect(licenseSchema.safeParse({ code }).success).toBe(false);
    }
    expect(licenseSchema.safeParse({ code: "MIT OR Apache-2.0" }).success).toBe(true);
  });

  it("requires restrictions for missing, non-open-source and custom licenses", () => {
    for (const code of [null, "CC-BY-NC-4.0", "LicenseRef-Custom"]) {
      expect(licenseSchema.safeParse({ code }).success).toBe(false);
      expect(licenseSchema.safeParse({ code, restrictions: "Read the source license terms." }).success).toBe(true);
    }
    expect(toLicenseView({ code: null }).status).toBe("No license");
    expect(toLicenseView({ code: "MIT AND CC-BY-NC-4.0" }).status).toBe("Not open source");
    expect(toLicenseView({ code: "MIT OR CC-BY-NC-4.0" }).status).toBe("Open source");
  });

  it("keeps restricted weights visible even when the code is open source", () => {
    const license = {
      code: "Apache-2.0",
      weights: { name: "Restricted weights", url: "https://example.org/license", open_source: false },
    };
    expect(licenseSchema.safeParse(license).success).toBe(false);
    const restricted = licenseSchema.parse({ ...license, restrictions: "Non-commercial use only." });
    expect(toLicenseView(restricted)).toMatchObject({ ...restricted, codeOpenSource: true, status: "Not open source" });
    expect(licenseSchema.safeParse({ ...license, weights: { ...license.weights, open_source: true } }).success).toBe(true);
  });

  it("allows a relicense override and uses it on the stable card and version rows", () => {
    const stable = stableVersion(model);
    const changed = modelSchema.parse({
      ...model,
      versions: model.versions.map((v) => v === stable ? { ...v, license: { code: "MIT" } } : v),
    });
    expect(toCardView(changed).license.code).toBe("MIT");
    const detail = toDetailView(changed, registry, [], [], { proposals: [], fetchedAt: null });
    expect(detail.license.code).toBe("MIT");
    expect(detail.versions.find((v) => v.isStable)?.license.code).toBe("MIT");
    expect(detail.versions.find((v) => !v.isStable)?.license.code).toBe(model.license.code);
    expect(modelSchema.safeParse({ ...model, versions: [{ ...stable, license: model.license }] }).success).toBe(false);
  });

  it("normalizes SPDX formatting and term order while retaining grouping and exceptions", () => {
    expect(normalizeSpdx(" (MIT and (ISC AND Apache-2.0)) ")).toBe(normalizeSpdx("Apache-2.0 AND MIT AND ISC"));
    expect(normalizeSpdx("MIT AND (ISC OR Apache-2.0)")).not.toBe(normalizeSpdx("(MIT AND ISC) OR Apache-2.0"));
    expect(normalizeSpdx("GPL-2.0-only WITH Classpath-exception-2.0")).not.toBe(normalizeSpdx("GPL-2.0-only"));
  });

  it("fails label mismatches, including only versus or-later, and warns only for empty labels", () => {
    expect(checkLicenseLabel(" (Apache-2.0 OR MIT) ", "MIT OR Apache-2.0")).toBe("match");
    expect(() => checkLicenseLabel("GPL-3.0-only", "GPL-3.0-or-later")).toThrow("does not match");
    expect(() => checkLicenseLabel("MIT", null)).toThrow("does not match");
    expect(() => checkLicenseLabel("not SPDX", "MIT")).toThrow();
    expect(checkLicenseLabel("  ", "MIT")).toBe("missing");
    expect(checkLicenseLabel("", null)).toBe("missing");
  });
});
