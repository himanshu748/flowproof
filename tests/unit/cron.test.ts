import { afterEach, describe, expect, it, vi } from "vitest";
const begin = vi.hoisted(() => vi.fn());
vi.mock("@/src/server/db/client", () => ({ sql: { begin } }));
import { GET } from "../../app/api/cron/purge/route";
afterEach(() => {
  vi.unstubAllEnvs();
  begin.mockReset();
});
describe("retention endpoint authorization", () => {
  it("rejects calls when the secret is absent or incorrect", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(
      (await GET(new Request("https://example.test/api/cron/purge"))).status,
    ).toBe(401);
    vi.stubEnv("CRON_SECRET", "test-secret");
    expect(
      (
        await GET(
          new Request("https://example.test/api/cron/purge", {
            headers: { authorization: "Bearer incorrect" },
          }),
        )
      ).status,
    ).toBe(401);
    expect(begin).not.toHaveBeenCalled();
  });
  it("runs expiry cleanup in a transaction only with the correct secret", async () => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    const tx = vi.fn().mockResolvedValue([]);
    begin.mockImplementation(async (operation) => operation(tx));
    const response = await GET(
      new Request("https://example.test/api/cron/purge", {
        headers: { authorization: "Bearer test-secret" },
      }),
    );
    expect(response.status).toBe(200);
    expect(tx).toHaveBeenCalledTimes(3);
    expect(await response.json()).toEqual({ purged: true });
  });
});
