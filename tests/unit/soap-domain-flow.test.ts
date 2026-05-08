import { afterEach, describe, expect, it, vi } from "vitest";
import { YukiClient } from "../../src/yuki/client.js";

type FetchArgs = Parameters<typeof fetch>;

function xmlResponse(method: string, result: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>\n<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\n  <soap:Body>\n    <${method}Response xmlns="http://www.theyukicompany.com/">\n      <${method}Result>${result}</${method}Result>\n    </${method}Response>\n  </soap:Body>\n</soap:Envelope>`;
}

describe("Yuki domain SOAP flow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("authenticates and lists domains", async () => {
    const mockFetch = vi.fn<FetchArgs, Promise<Response>>();

    mockFetch
      .mockResolvedValueOnce(
        new Response(xmlResponse("Authenticate", "SESSION-1"), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          xmlResponse(
            "Domains",
            "<Domains><Domain><ID>11</ID><Name>Demo</Name></Domain></Domains>"
          ),
          { status: 200 }
        )
      );

    vi.stubGlobal("fetch", mockFetch as unknown as typeof fetch);

    const client = new YukiClient({ accessKey: "abcde-fghij-klmno" });
    const result = await client.listDomains();

    expect(result.ok).toBe(true);
    expect(result.method).toBe("Domains");
    expect(Array.isArray(result.data)).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("gets current domain", async () => {
    const mockFetch = vi.fn<FetchArgs, Promise<Response>>();

    mockFetch
      .mockResolvedValueOnce(
        new Response(xmlResponse("Authenticate", "SESSION-1"), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(xmlResponse("GetCurrentDomain", "42"), { status: 200 })
      );

    vi.stubGlobal("fetch", mockFetch as unknown as typeof fetch);

    const client = new YukiClient({ accessKey: "abcde-fghij-klmno" });
    const result = await client.getCurrentDomain();

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ domainId: 42 });
  });
});
