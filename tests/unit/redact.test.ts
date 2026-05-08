import { describe, expect, it } from "vitest";
import { redactText } from "../../src/utils/redact.js";

describe("redactText", () => {
  it("redacts key-like and token-like values", () => {
    const input = "accessKey=abcde-fghij-klmno token=supersecret";
    const out = redactText(input);
    expect(out).not.toContain("abcde-fghij-klmno");
    expect(out).not.toContain("supersecret");
    expect(out).toContain("[REDACTED]");
  });
});
