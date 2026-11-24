import { describe, expect, it } from "vitest";
import {
  displayPin,
  fullPin,
  imageRef,
  loadRegistry,
  marketplaceStats,
  stableVersion,
  latestVersion,
} from "./registry";
import { modelSchema } from "./schema";
import { toCardView, toDetailView } from "./views";

describe("the real registry", () => {
  const registry = loadRegistry();

  it("loads and validates every model file", () => {
    expect(registry.models.length).toBeGreaterThan(0);
    expect(registry.index.review_policy.required_approvals).toBe(3);
  });

  it("carries the marketplace's own repository for open-PR ingestion", () => {
    expect(registry.index.marketplace.repository).toBe(
      "https://github.com/dhis2-chap/chap-marketplace",
    );
  });

  it("resolves latest and any verified stable channel for every model", () => {
    for (const model of registry.models) {
      expect(latestVersion(model).version).toBe(model.channels.latest);
      if (model.channels.stable) expect(stableVersion(model)?.status).toBe("verified");
    }
  });

  it("preserves BSC's requested GHRmodel credit and affiliation lines", () => {
    const ghr = registry.models.find((m) => m.id === "chapkit_ghr_model")!;
    expect(ghr.attribution.author).toBe(
      "Carles Milà¹, Ania B. Kawiecki¹, Rachel Lowe¹,² on behalf of the BSC Global Health Resilience group",
    );
    expect(ghr.attribution.organization).toBe(
      "¹ Barcelona Supercomputing Center (BSC), Barcelona, Spain\n" +
        "² Catalan Institution for Research & Advanced Studies (ICREA), Barcelona, Spain",
    );
  });

  it("lists chapkit services only — every model has a published image", () => {
    for (const model of registry.models) {
      expect(model.source.image).toMatch(/^ghcr\.io\//);
      expect(model.source.runtime_image).toMatch(
        /^ghcr\.io\/dhis2-chap\/chapkit-/,
      );
      for (const version of model.versions) {
        expect(version.chapkit).toMatch(/^>=2\.\d+\.\d+,<3$/);
      }
    }
  });

  it("derives the source pin in both display and chap-consumable form", () => {
    const ghr = registry.models.find((m) => m.id === "chapkit_ghr_model");
    expect(ghr).toBeDefined();
    const stable = latestVersion(ghr!);
    expect(displayPin(ghr!, stable)).toBe(
      "github.com/chap-models/chapkit_ghr_model@bb661b0",
    );
    expect(fullPin(ghr!, stable)).toBe(
      "https://github.com/chap-models/chapkit_ghr_model@bb661b02ab20c35b09d70b7bd4fa38a191cafc94",
    );
  });

  it("derives the deployable image pin from the same commit", () => {
    const ghr = registry.models.find((m) => m.id === "chapkit_ghr_model")!;
    expect(imageRef(ghr, latestVersion(ghr))).toBe(
      "ghcr.io/chap-models/chapkit_ghr_model:sha-bb661b0@sha256:cee89ce8f4c64de67d3d7d9f024aec39b79acbf94a4420ba285d54ab0f321bec",
    );
  });

  it("counts forecasting models and starters separately", () => {
    const stats = marketplaceStats(registry);
    expect(stats.models + stats.starters).toBe(registry.models.length);
    expect(stats.starters).toBeGreaterThan(0);
  });

  it("counts reviews as verified pins × required approvals", () => {
    const stats = marketplaceStats(registry);
    expect(stats.reviews).toBe(stats.verifiedPins * 3);
  });
});

describe("schema refinements", () => {
  const base = {
    schema_version: 2,
    id: "my_model",
    service_id: "my-model",
    display_name: "My Model",
    kind: "model",
    assessed_status: "red",
    summary: "A test model.",
    source: {
      repository: "https://github.com/org/my_model",
      image: "ghcr.io/org/my_model",
      runtime_image: "ghcr.io/dhis2-chap/chapkit-py",
    },
    attribution: { author: "Someone" },
    compatibility: {
      period_types: ["monthly"],
      min_prediction_periods: 1,
      max_prediction_periods: 12,
      requires_geo: false,
    },
    covariates: {
      required: ["population"],
      defaults: ["rainfall"],
      allow_free_additional: false,
    },
    channels: { stable: "1.0.0", latest: "1.0.0" },
    versions: [
      {
        version: "1.0.0",
        commit: "1111111111111111111111111111111111111111",
        image_tag: "sha-1111111",
        image_digest: `sha256:${"1".repeat(64)}`,
        chapkit: ">=2.0.0,<3",
        status: "verified",
        verified_by: [],
        changelog: null,
      },
    ],
    configurations: {},
  };

  it("accepts a well-formed model", () => {
    expect(modelSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a comparison model", () => {
    expect(modelSchema.safeParse({ ...base, role: "comparison" }).success).toBe(true);
  });

  it("rejects a role other than comparison", () => {
    const bad = { ...base, role: "baseline" };
    expect(modelSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a starter flagged as a comparison model", () => {
    const bad = { ...base, kind: "starter", role: "comparison" };
    expect(modelSchema.safeParse(bad).success).toBe(false);
  });

  it("leaves benchmarking off unless the model opts in", () => {
    expect(modelSchema.parse(base).benchmarking).toBe(false);
    expect(modelSchema.parse({ ...base, benchmarking: true }).benchmarking).toBe(true);
  });

  it("rejects a starter that opts in to benchmarking", () => {
    const bad = { ...base, kind: "starter", benchmarking: true };
    expect(modelSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unverified listing that opts in to benchmarking", () => {
    const bad = { ...base, channels: { latest: "1.0.0" }, benchmarking: true };
    expect(modelSchema.safeParse(bad).success).toBe(false);
  });

  it("keeps GHRmodel out of the benchmarks", () => {
    const ghr = loadRegistry().models.find((m) => m.id === "chapkit_ghr_model")!;
    expect(ghr.benchmarking).toBe(false);
  });

  it("rejects a service id that is not the kebab-case model id", () => {
    const bad = { ...base, service_id: "something-else" };
    expect(modelSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a channel pointing at a missing version", () => {
    const bad = { ...base, channels: { stable: "1.0.0", latest: "9.9.9" } };
    expect(modelSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a stable channel pointing at an unverified version", () => {
    const bad = {
      ...base,
      versions: [{ ...base.versions[0], status: "unverified" }],
    };
    expect(modelSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts an unverified listing without stable, but not with reviewers", () => {
    const unverified = {
      ...base,
      channels: { latest: "1.0.0" },
      versions: [{ ...base.versions[0], status: "unverified" }],
    };
    expect(modelSchema.safeParse(unverified).success).toBe(true);
    const reviewed = {
      ...unverified,
      versions: [{ ...unverified.versions[0], verified_by: ["reviewer"] }],
    };
    expect(modelSchema.safeParse(reviewed).success).toBe(false);
  });

  it("keeps unverified listings separate and preserves a verified stable pin when latest is unverified", () => {
    const model = modelSchema.parse({
      ...base,
      channels: { latest: "1.0.0" },
      versions: [{ ...base.versions[0], status: "unverified" }],
    });
    const detail = () => toDetailView(model, loadRegistry(), [], [], { proposals: [], fetchedAt: null });
    expect(toCardView(model).unverified).toBe(true);
    expect(stableVersion(model)).toBeUndefined();
    expect(detail()).toMatchObject({ stable: null, latest: { status: "unverified" }, verifiedPins: 0 });

    model.versions.push({ ...model.versions[0], version: "0.9.0", status: "verified" });
    model.channels.stable = "0.9.0";
    expect(modelSchema.safeParse(model).success).toBe(true);
    expect(toCardView(model).unverified).toBe(false);
    expect(detail()).toMatchObject({ stable: { tag: "0.9.0" }, latest: { status: "unverified" }, verifiedPins: 1 });
  });

  it("rejects a short commit hash", () => {
    const bad = {
      ...base,
      versions: [{ ...base.versions[0], commit: "cdd06ed" }],
    };
    expect(modelSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a sha- image tag that disagrees with the commit", () => {
    const bad = {
      ...base,
      versions: [{ ...base.versions[0], image_tag: "sha-2222222" }],
    };
    expect(modelSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts a non-sha image tag without cross-checking it", () => {
    const ok = {
      ...base,
      versions: [{ ...base.versions[0], image_tag: "1.0.0" }],
    };
    expect(modelSchema.safeParse(ok).success).toBe(true);
  });

  it("rejects prediction_periods outside the declared range", () => {
    const bad = {
      ...base,
      configurations: {
        monthly: {
          description: "test",
          config: { prediction_periods: 24 },
        },
      },
    };
    expect(modelSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects configurations repeating a required covariate", () => {
    const bad = {
      ...base,
      configurations: {
        monthly: {
          description: "test",
          config: {
            prediction_periods: 3,
            additional_continuous_covariates: ["population"],
          },
        },
      },
    };
    expect(modelSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects undeclared covariates when the service refuses free extras", () => {
    const bad = {
      ...base,
      configurations: {
        monthly: {
          description: "test",
          config: {
            prediction_periods: 3,
            additional_continuous_covariates: ["mean_temperature"],
          },
        },
      },
    };
    expect(modelSchema.safeParse(bad).success).toBe(false);
  });

  it("allows any covariate when the service accepts free extras", () => {
    const ok = {
      ...base,
      covariates: { ...base.covariates, allow_free_additional: true },
      configurations: {
        monthly: {
          description: "test",
          config: {
            prediction_periods: 3,
            additional_continuous_covariates: ["mean_temperature"],
          },
        },
      },
    };
    expect(modelSchema.safeParse(ok).success).toBe(true);
  });
});
