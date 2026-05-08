import { addMs, nowEpochMs, ONE_DAY_MS } from "../utils/dates.js";
import type { YukiSession } from "./types.js";
import { YukiAuthError } from "./errors.js";
import { YukiSoapClient } from "./soap.js";

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export class YukiSessionManager {
  private readonly soapClient: YukiSoapClient;
  private readonly accessKey: string;
  private session?: YukiSession;

  public constructor(soapClient: YukiSoapClient, accessKey: string) {
    this.soapClient = soapClient;
    this.accessKey = accessKey;
  }

  public async getSessionId(): Promise<string> {
    if (this.session && nowEpochMs() < this.session.expiresAtEpochMs - REFRESH_MARGIN_MS) {
      return this.session.sessionId;
    }

    const sessionId = await this.soapClient.call<string>({
      service: "Archive",
      method: "Authenticate",
      args: { accessKey: this.accessKey }
    });

    if (typeof sessionId !== "string" || sessionId.trim().length === 0) {
      throw new YukiAuthError("Authentication failed. Check configured WebserviceAccessKey.");
    }

    this.session = {
      sessionId,
      expiresAtEpochMs: addMs(nowEpochMs(), ONE_DAY_MS)
    };

    return sessionId;
  }

  public clearSession(): void {
    this.session = undefined;
  }
}
