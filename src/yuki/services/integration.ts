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

function deriveAdminStatus(item: Record<string, unknown>): string {
  const explicit = safeString(item.Status) ?? safeString(item.State);
  if (explicit) return explicit;
  // Dutch: HoudtBedrijfsadministratie = "1" means active administration
  const hba = safeString(item.HoudtBedrijfsadministratie);
  if (hba === "1" || hba?.toLowerCase() === "true") return "active";
  if (hba === "0" || hba?.toLowerCase() === "false") return "inactive";
  return "active"; // default assumption for a reachable administration
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
      administrationId: safeString(item.AdministrationId) ?? safeString(item.AdministrationID) ?? String(administrationId),
      companyName: safeString(item.CompanyName) ?? safeString(item.Company) ?? safeString(item.Name),
      businessType: safeString(item.BusinessType) ?? safeString(item.HoudtBedrijfsadministratie) ?? safeString(item.Type),
      country: safeString(item.Country) ?? safeString(item.LandCode),
      currency: safeString(item.Currency) ?? safeString(item.Valuta),
      fiscalYear: safeString(item.FiscalYear) ?? safeString(item.RekenjaarOm),
      lastModified: safeString(item.LastModified) ?? safeString(item.DatumMutatie) ?? safeString(item.ModifiedDate),
      status: deriveAdminStatus(item),
      rawData: raw
    };
  }
}
