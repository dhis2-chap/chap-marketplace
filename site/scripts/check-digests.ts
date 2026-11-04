/**
 * Image pin check: `pnpm check-digests`. For every version it requires
 *  - provenance: a signed GitHub build-provenance attestation, made by the
 *    model's own repository, that `image_digest` was built from `commit`
 *    (`gh attestation verify`; needs the gh CLI and a token);
 *  - the tag: `<source.image>:<image_tag>` still resolves to `image_digest`.
 *    chap-admin installs by tag until chap-core pulls by digest, so a moved
 *    tag means installs run something nobody reviewed.
 * Network-bound, so it stays out of `pnpm validate`.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { loadRegistry } from "../src/lib/registry";

const run = promisify(execFile);

const MANIFEST_TYPES = [
  "application/vnd.oci.image.index.v1+json",
  "application/vnd.docker.distribution.manifest.list.v2+json",
  "application/vnd.oci.image.manifest.v1+json",
  "application/vnd.docker.distribution.manifest.v2+json",
].join(", ");

/** Lookups in flight at once; keeps the check quick without hammering the registry. */
const CONCURRENCY = 8;
const TIMEOUT_MS = 30_000;

/** Runs `fn` once more after a failure, so one registry blip does not fail CI. */
async function retryOnce<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return fn();
  }
}

/** The digest a tag resolves to, via the registry's anonymous token flow. */
async function resolveDigest(image: string, tag: string): Promise<string> {
  const [host, ...rest] = image.split("/");
  const url = `https://${host}/v2/${rest.join("/")}/manifests/${tag}`;
  const head = (headers: Record<string, string>) =>
    fetch(url, {
      method: "HEAD",
      headers: { Accept: MANIFEST_TYPES, ...headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  let res = await head({});
  if (res.status === 401) {
    // Bearer realm="…",service="…",scope="…"
    const challenge = res.headers.get("www-authenticate") ?? "";
    const params = Object.fromEntries(
      [...challenge.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]),
    );
    const tokenUrl = new URL(params.realm);
    if (params.service) tokenUrl.searchParams.set("service", params.service);
    if (params.scope) tokenUrl.searchParams.set("scope", params.scope);
    const tokenRes = await fetch(tokenUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!tokenRes.ok) throw new Error(`token request: HTTP ${tokenRes.status}`);
    const { token } = (await tokenRes.json()) as { token: string };
    res = await head({ Authorization: `Bearer ${token}` });
  }
  const digest = res.headers.get("docker-content-digest");
  if (!res.ok || !digest) throw new Error(`HTTP ${res.status}`);
  return digest;
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

const message = (error: unknown) =>
  error instanceof Error ? error.message.split("\n")[0] : String(error);

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
      try {
        await retryOnce(() =>
          verifyProvenance(model.source.image, v.image_digest, model.source.repository, v.commit),
        );
      } catch (error) {
        problems.push(`no attestation that ${v.image_digest} was built from ${v.commit} (${message(error)})`);
      }
      try {
        const digest = await retryOnce(() => resolveDigest(model.source.image, v.image_tag));
        if (digest !== v.image_digest) problems.push(`tag resolves to ${digest}, pinned ${v.image_digest}`);
      } catch (error) {
        problems.push(`tag could not be resolved (${message(error)})`);
      }
      if (problems.length > 0) failed++;
      results[i] = problems.length === 0
        ? `  ✓ ${ref}`
        : [`  ✗ ${ref}`, ...problems.map((p) => `      ${p}`)].join("\n");
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
