import type { YukiSessionManager } from "../auth.js";
import type { YukiSoapClient } from "../soap.js";

export interface CompanySnapshot {
  administrationId: string;
  companyName?: string;
  businessType?: string;
  country?: string;
  currency?: string;
  fiscalYear?: string;
  lastModified?: string;
  status?: string;
  rawData?: unknown;
}

function safeString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export class IntegrationService {
  private readonly soapClient: YukiSoapClient;
  private readonly sessionManager: YukiSessionManager;

  public constructor(soapClient: YukiSoapClient, sessionManager: YukiSessionManager) {
    this.soapClient = soapClient;
    this.sessionManager = sessionManager;
  }

  public async getAdministrationData(administrationId: number): Promise<CompanySnapshot> {
    const sessionID = await this.sessionManager.getSessionId();
    const raw = await this.soapClient.call<unknown>({
      service: "Integration",
      method: "GetAdministrationData",
      args: {
        sessionID,
        administrationID: administrationId
      }
    });

    const item = raw as Record<string, unknown>;
    return {
      administrationId: String(administrationId),
      companyName: safeString(item.CompanyName) ?? safeString(item.Name),
      businessType: safeString(item.BusinessType) ?? safeString(item.Type),
      country: safeString(item.Country),
      currency: safeString(item.Currency),
      fiscalYear: safeString(item.FiscalYear),
      lastModified: safeString(item.LastModified) ?? safeString(item.ModifiedDate),
      status: safeString(item.Status) ?? safeString(item.State),
      rawData: raw
    };
  }
}
