/**
 * Image digest check: `pnpm check-digests`.
 * Resolves every pinned `<source.image>:<image_tag>` against its registry and
 * fails when the tag no longer points at the pinned `image_digest` — a wrong
 * digest in a PR, or a tag moved after review. Anonymous pulls only, so the
 * images must be public. Kept out of `pnpm validate`, which stays offline.
 */
import { loadRegistry } from "../src/lib/registry";

const MANIFEST_TYPES = [
  "application/vnd.oci.image.index.v1+json",
  "application/vnd.docker.distribution.manifest.list.v2+json",
  "application/vnd.oci.image.manifest.v1+json",
  "application/vnd.docker.distribution.manifest.v2+json",
].join(", ");

/** The digest a tag resolves to, via the registry's anonymous token flow. */
async function resolveDigest(image: string, tag: string): Promise<string> {
  const [host, ...rest] = image.split("/");
  const url = `https://${host}/v2/${rest.join("/")}/manifests/${tag}`;
  let res = await fetch(url, { method: "HEAD", headers: { Accept: MANIFEST_TYPES } });
  if (res.status === 401) {
    // Bearer realm="…",service="…",scope="…"
    const challenge = res.headers.get("www-authenticate") ?? "";
    const params = Object.fromEntries(
      [...challenge.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]),
    );
    const tokenUrl = new URL(params.realm);
    if (params.service) tokenUrl.searchParams.set("service", params.service);
    if (params.scope) tokenUrl.searchParams.set("scope", params.scope);
    const { token } = (await (await fetch(tokenUrl)).json()) as { token: string };
    res = await fetch(url, {
      method: "HEAD",
      headers: { Accept: MANIFEST_TYPES, Authorization: `Bearer ${token}` },
    });
  }
  const digest = res.headers.get("docker-content-digest");
  if (!res.ok || !digest) throw new Error(`HTTP ${res.status}`);
  return digest;
}

/** Lookups in flight at once; keeps the check quick without hammering the registry. */
const CONCURRENCY = 8;

async function main() {
  const pins = loadRegistry().models.flatMap((model) =>
    model.versions.map((v) => ({ image: model.source.image, tag: v.image_tag, pinned: v.image_digest })),
  );
  const results: string[] = new Array(pins.length);
  let next = 0;
  let failed = 0;
  const worker = async () => {
    while (next < pins.length) {
      const i = next++;
      const { image, tag, pinned } = pins[i];
      const ref = `${image}:${tag}`;
      try {
        const digest = await resolveDigest(image, tag);
        if (digest === pinned) {
          results[i] = `  ✓ ${ref}`;
        } else {
          failed++;
          results[i] = `  ✗ ${ref} resolves to ${digest}, pinned ${pinned}`;
        }
      } catch (error) {
        failed++;
        results[i] = `  ✗ ${ref} could not be resolved: ${error instanceof Error ? error.message : error}`;
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(results.join("\n"));

  if (failed > 0) {
    console.error(`\n${failed} image pin${failed === 1 ? "" : "s"} failed.`);
    process.exit(1);
  }
  console.log("\nAll image digests match.");
}

void main();
