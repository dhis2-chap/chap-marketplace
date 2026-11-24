import { afterEach, describe, expect, it, vi } from "vitest";
import { imageLicenseLabels, resolveDigest } from "./image-registry";

afterEach(() => vi.unstubAllGlobals());

describe("image registry metadata", () => {
  const image = "ghcr.io/org/model";
  const root = `https://ghcr.io/v2/org/model`;

  it("uses anonymous registry auth for tag and pinned config lookups", async () => {
    const fetchMock = vi.fn(async (url: string | URL, options?: RequestInit) => {
      if (String(url).startsWith("https://ghcr.io/token?")) return Response.json({ token: "test-token" });
      if (!(options?.headers as Record<string, string>)?.Authorization) {
        return new Response(null, { status: 401, headers: {
          "www-authenticate": 'Bearer realm="https://ghcr.io/token",service="ghcr.io",scope="repository:org/model:pull"',
        } });
      }
      if (options?.method === "HEAD") return new Response(null, { headers: { "docker-content-digest": "sha256:pinned" } });
      if (url === `${root}/manifests/sha256:pinned`) return Response.json({ config: { digest: "sha256:config" } });
      if (url === `${root}/blobs/sha256:config`) return Response.json({ config: { Labels: { "org.opencontainers.image.licenses": "MIT" } } });
      throw new Error(`unexpected request: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await resolveDigest(image, "sha-1234567")).toBe("sha256:pinned");
    expect(await imageLicenseLabels(image, "sha256:pinned")).toEqual(["MIT"]);
  });

  it("reads every platform in an index, skips attestations, and preserves missing labels", async () => {
    const responses: Record<string, unknown> = {
      "manifests/sha256:index": { manifests: [
        { digest: "sha256:amd64", platform: { os: "linux" } },
        { digest: "sha256:arm64", platform: { os: "linux" } },
        { digest: "sha256:attestation", platform: { os: "unknown" }, annotations: { "vnd.docker.reference.type": "attestation-manifest" } },
      ] },
      "manifests/sha256:amd64": { config: { digest: "sha256:config-amd64" } },
      "manifests/sha256:arm64": { config: { digest: "sha256:config-arm64" } },
      "blobs/sha256:config-amd64": { config: { Labels: { "org.opencontainers.image.licenses": "GPL-3.0" } } },
      "blobs/sha256:config-arm64": { config: {} },
    };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const response = responses[url.replace(`${root}/`, "")];
      if (!response) throw new Error(`unexpected request: ${url}`);
      return Response.json(response);
    }));
    expect(await imageLicenseLabels(image, "sha256:index")).toEqual(["GPL-3.0", ""]);
  });

  it("fails unreadable or malformed image metadata rather than warning about a missing label", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
    await expect(imageLicenseLabels(image, "sha256:missing")).rejects.toThrow("HTTP 404");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ manifests: [] })));
    await expect(imageLicenseLabels(image, "sha256:empty")).rejects.toThrow("no runnable manifests");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({})));
    await expect(imageLicenseLabels(image, "sha256:invalid")).rejects.toThrow("no config digest");
  });
});
