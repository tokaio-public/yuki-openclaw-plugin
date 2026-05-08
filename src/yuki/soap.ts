import { XMLParser } from "fast-xml-parser";
import type { YukiSoapCallOptions } from "./types.js";
import { YukiPermissionError, YukiSoapFaultError } from "./errors.js";
import { buildSoapEnvelope } from "./xml.js";
import { RateLimitGuard } from "./rateLimit.js";
import { Logger } from "../utils/logger.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true
});

export class YukiSoapClient {
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;
  private readonly logger: Logger;
  private readonly rateLimitGuard: RateLimitGuard;

  public constructor(baseUrl: string, defaultTimeoutMs: number, logger: Logger, rateLimitGuard: RateLimitGuard) {
    this.baseUrl = baseUrl;
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.logger = logger;
    this.rateLimitGuard = rateLimitGuard;
  }

  public async call<T = unknown>(options: YukiSoapCallOptions): Promise<T> {
    this.rateLimitGuard.consume();

    const endpoint = `${this.baseUrl}/${options.service}.asmx`;
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;
    const body = buildSoapEnvelope(options.method, options.args);

    this.logger.debug(`SOAP call ${options.service}.${options.method}`, {
      endpoint,
      method: options.method,
      service: options.service
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let xmlText: string;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: `http://www.theyukicompany.com/${options.method}`
        },
        body,
        signal: controller.signal
      });
      xmlText = await response.text();
    } finally {
      clearTimeout(timeout);
    }

    const parsed = parser.parse(xmlText);
    const bodyNode = parsed?.Envelope?.Body;
    if (!bodyNode) {
      throw new YukiSoapFaultError("Invalid SOAP response: missing Envelope/Body.");
    }

    const fault = bodyNode.Fault;
    if (fault) {
      const faultText = JSON.stringify(fault);
      if (faultText.toLowerCase().includes("no rights") || faultText.toLowerCase().includes("permission")) {
        throw new YukiPermissionError("Missing permission for requested Yuki service or method.");
      }
      throw new YukiSoapFaultError(`SOAP fault returned by Yuki: ${faultText}`);
    }

    const responseNode = bodyNode[`${options.method}Response`];
    if (!responseNode) {
      throw new YukiSoapFaultError(`Invalid SOAP response: missing ${options.method}Response.`);
    }

    const resultNode = responseNode[`${options.method}Result`];
    return resultNode as T;
  }
}
