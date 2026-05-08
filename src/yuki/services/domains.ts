import type { YukiAdministration, YukiDomain } from "../types.js";
import { YukiSessionManager } from "../auth.js";
import { YukiSoapClient } from "../soap.js";

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export class DomainService {
  private readonly soapClient: YukiSoapClient;
  private readonly sessionManager: YukiSessionManager;

  public constructor(soapClient: YukiSoapClient, sessionManager: YukiSessionManager) {
    this.soapClient = soapClient;
    this.sessionManager = sessionManager;
  }

  public async listDomains(): Promise<YukiDomain[]> {
    const sessionID = await this.sessionManager.getSessionId();
    const raw = await this.soapClient.call<unknown>({
      service: "Archive",
      method: "Domains",
      args: { sessionID }
    });

    const maybeRows = (raw as { Domain?: unknown; Domains?: { Domain?: unknown } }).Domains?.Domain ??
      (raw as { Domain?: unknown }).Domain;

    return toArray(maybeRows).map((row) => {
      const item = row as Record<string, unknown>;
      return {
        id: Number(item.ID ?? item.DomainID ?? item.id ?? 0),
        name: typeof item.Name === "string" ? item.Name : undefined,
        raw: row
      };
    });
  }

  public async getCurrentDomain(): Promise<number> {
    const sessionID = await this.sessionManager.getSessionId();
    const raw = await this.soapClient.call<string | number>({
      service: "Archive",
      method: "GetCurrentDomain",
      args: { sessionID }
    });
    return Number(raw);
  }

  public async setCurrentDomain(domainID: number): Promise<boolean> {
    const sessionID = await this.sessionManager.getSessionId();
    const raw = await this.soapClient.call<string | boolean>({
      service: "Archive",
      method: "SetCurrentDomain",
      args: { sessionID, domainID }
    });
    if (typeof raw === "boolean") {
      return raw;
    }
    return String(raw).toLowerCase() === "true";
  }

  public async listAdministrations(): Promise<YukiAdministration[]> {
    const sessionID = await this.sessionManager.getSessionId();
    const raw = await this.soapClient.call<unknown>({
      service: "Archive",
      method: "Administrations",
      args: { sessionID }
    });

    const maybeRows = (raw as { Administration?: unknown; Administrations?: { Administration?: unknown } })
      .Administrations?.Administration ?? (raw as { Administration?: unknown }).Administration;

    return toArray(maybeRows).map((row) => {
      const item = row as Record<string, unknown>;
      return {
        id: Number(item.ID ?? item.AdministrationID ?? item.id ?? 0),
        name: typeof item.Name === "string" ? item.Name : undefined,
        raw: row
      };
    });
  }
}
