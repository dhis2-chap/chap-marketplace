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

async function main() {
  let failed = 0;
  for (const model of loadRegistry().models) {
    for (const v of model.versions) {
      const ref = `${model.source.image}:${v.image_tag}`;
      try {
        const digest = await resolveDigest(model.source.image, v.image_tag);
        if (digest === v.image_digest) {
          console.log(`  ✓ ${ref}`);
        } else {
          failed++;
          console.error(`  ✗ ${ref} resolves to ${digest}, pinned ${v.image_digest}`);
        }
      } catch (error) {
        failed++;
        console.error(`  ✗ ${ref} could not be resolved: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} image pin${failed === 1 ? "" : "s"} failed.`);
    process.exit(1);
  }
  console.log("\nAll image digests match.");
}

void main();
