/** Registry metadata only: never downloads or runs image layers. */
const MANIFEST_TYPES = [
  "application/vnd.oci.image.index.v1+json",
  "application/vnd.docker.distribution.manifest.list.v2+json",
  "application/vnd.oci.image.manifest.v1+json",
  "application/vnd.docker.distribution.manifest.v2+json",
].join(", ");

const TIMEOUT_MS = 30_000;

async function request(image: string, resource: string, method = "GET"): Promise<Response> {
  const [host, ...rest] = image.split("/");
  const url = `https://${host}/v2/${rest.join("/")}/${resource}`;
  const fetchResource = (headers: Record<string, string>) => fetch(url, {
    method,
    headers: { Accept: MANIFEST_TYPES, ...headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  let res = await fetchResource({});
  if (res.status === 401) {
    const challenge = res.headers.get("www-authenticate") ?? "";
    const params = Object.fromEntries(
      [...challenge.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]),
    );
    const tokenUrl = new URL(params.realm);
    if (params.service) tokenUrl.searchParams.set("service", params.service);
    if (params.scope) tokenUrl.searchParams.set("scope", params.scope);
    const tokenRes = await fetch(tokenUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!tokenRes.ok) throw new Error(`token request: HTTP ${tokenRes.status}`);
    const { token } = await tokenRes.json() as { token: string };
    res = await fetchResource({ Authorization: `Bearer ${token}` });
  }
  if (!res.ok) throw new Error(`${resource}: HTTP ${res.status}`);
  return res;
}

export async function resolveDigest(image: string, tag: string): Promise<string> {
  const res = await request(image, `manifests/${tag}`, "HEAD");
  const digest = res.headers.get("docker-content-digest");
  if (!digest) throw new Error("missing docker-content-digest header");
  return digest;
}

interface Manifest {
  config?: { digest: string };
  manifests?: {
    digest: string;
    platform?: { os?: string };
    annotations?: Record<string, string>;
  }[];
}

/** Read every platform's config at the pinned digest, skipping attestations. */
export async function imageLicenseLabels(image: string, digest: string): Promise<string[]> {
  const manifest = await (await request(image, `manifests/${digest}`)).json() as Manifest;
  if (manifest.manifests) {
    const runnable = manifest.manifests.filter((m) =>
      m.platform?.os !== "unknown" &&
      m.annotations?.["vnd.docker.reference.type"] !== "attestation-manifest",
    );
    if (runnable.length === 0) throw new Error("image index contains no runnable manifests");
    return (await Promise.all(runnable.map((m) => imageLicenseLabels(image, m.digest)))).flat();
  }
  if (!manifest.config?.digest) throw new Error("image manifest has no config digest");
  const config = await (await request(image, `blobs/${manifest.config.digest}`)).json() as {
    config?: { Labels?: Record<string, string> };
  };
  return [config.config?.Labels?.["org.opencontainers.image.licenses"] ?? ""];
}
