/**
 * Image pin check: `pnpm check-digests`. For every version it requires
 *  - provenance: a signed GitHub build-provenance attestation, made by the
 *    model's own repository, that `image_digest` was built from `commit`
 *    (`gh attestation verify`; needs the gh CLI and a token);
 *  - the tag: `<source.image>:<image_tag>` still resolves to `image_digest`.
 *    chap-admin installs by tag until chap-core pulls by digest, so a moved
 *    tag means installs run something nobody reviewed.
 *  - the license: each runnable image config agrees with license.code;
 *    an empty label asks for manual review of the pinned source.
 * Network-bound, so it stays out of `pnpm validate`.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { loadRegistry } from "../src/lib/registry";
import { checkLicenseLabel, licenseFor } from "../src/lib/licenses";
import { imageLicenseLabels, resolveDigest } from "./lib/image-registry";

const run = promisify(execFile);

/** Lookups in flight at once; keeps the check quick without hammering the registry. */
const CONCURRENCY = 8;
const TIMEOUT_MS = 30_000;

/**
 * Pauses before each retry. In CI a `gh attestation verify` now and then
 * fails, on a different image each time, and passes on a re-run; an immediate
 * retry tends to fail too, so the retries back off.
 */
const RETRY_DELAYS_MS = [2_000, 8_000];

/** Runs `fn`, retrying after each delay, so a transient failure does not fail CI. */
async function withRetries<T>(fn: () => Promise<T>): Promise<T> {
  for (const delay of RETRY_DELAYS_MS) {
    try {
      return await fn();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return fn();
}

/** Throws unless the repository attested that `digest` was built from `commit`. */
async function verifyProvenance(image: string, digest: string, repository: string, commit: string) {
  const repo = repository.match(/^https:\/\/github\.com\/([^/]+\/[^/]+?)\/?$/)?.[1];
  if (!repo) throw new Error(`${repository} is not a GitHub repository`);
  await run(
    "gh",
    ["attestation", "verify", `oci://${image}@${digest}`, "--repo", repo, "--source-digest", commit],
    { timeout: TIMEOUT_MS },
  );
}

/** The error's first line plus, for a failed command, the last line it wrote to stderr. */
const message = (error: unknown) => {
  if (!(error instanceof Error)) return String(error);
  const first = error.message.split("\n")[0];
  const stderr = (error as { stderr?: unknown }).stderr;
  const last = typeof stderr === "string" ? stderr.trim().split("\n").at(-1) : undefined;
  return last ? `${first}: ${last}` : first;
};

async function main() {
  const pins = loadRegistry().models.flatMap((model) =>
    model.versions.map((v) => ({ model, v })),
  );
  const results: string[] = new Array(pins.length);
  let next = 0;
  let failed = 0;
  const worker = async () => {
    while (next < pins.length) {
      const i = next++;
      const { model, v } = pins[i];
      const ref = `${model.source.image}:${v.image_tag}`;
      const problems: string[] = [];
      const warnings: string[] = [];
      try {
        await withRetries(() =>
          verifyProvenance(model.source.image, v.image_digest, model.source.repository, v.commit),
        );
      } catch (error) {
        problems.push(`no attestation that ${v.image_digest} was built from ${v.commit} (${message(error)})`);
      }
      try {
        const digest = await withRetries(() => resolveDigest(model.source.image, v.image_tag));
        if (digest !== v.image_digest) problems.push(`tag resolves to ${digest}, pinned ${v.image_digest}`);
      } catch (error) {
        problems.push(`tag could not be resolved (${message(error)})`);
      }
      try {
        const labels = await withRetries(() => imageLicenseLabels(model.source.image, v.image_digest));
        for (const label of labels) {
          if (checkLicenseLabel(label, licenseFor(model, v).code) === "missing") {
            warnings.push(`empty org.opencontainers.image.licenses; review the LICENSE file at ${model.source.repository}/tree/${v.commit}`);
          }
        }
      } catch (error) {
        problems.push(`license check failed (${message(error)})`);
      }
      if (problems.length > 0) failed++;
      results[i] = problems.length === 0
        ? `  ✓ ${ref}`
        : [`  ✗ ${ref}`, ...problems.map((p) => `      ${p}`)].join("\n");
      for (const warning of new Set(warnings)) results[i] += `\n      ⚠ ${warning}`;
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(results.join("\n"));

  if (failed > 0) {
    console.error(`\n${failed} image pin${failed === 1 ? "" : "s"} failed.`);
    process.exit(1);
  }
  console.log("\nAll image pins verified.");
}

void main();
