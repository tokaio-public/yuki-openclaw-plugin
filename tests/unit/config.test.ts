import { describe, expect, it } from "vitest";
import { loadYukiConfig } from "../../src/config.js";

describe("loadYukiConfig", () => {
  it("loads required config from plugin config", () => {
    const cfg = loadYukiConfig({ accessKey: "abc-123-xyz" });
    expect(cfg.accessKey).toBe("abc-123-xyz");
    expect(cfg.country).toBe("be");
    expect(cfg.defaultDryRun).toBe(true);
    expect(cfg.writeOperationsEnabled).toBe(false);
  });

  it("throws when key is missing", () => {
    expect(() => loadYukiConfig({})).toThrowError();
  });
});
