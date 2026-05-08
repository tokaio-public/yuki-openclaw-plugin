import type { YukiSessionManager } from "../auth.js";
import type { YukiSoapClient } from "../soap.js";

export interface Contact {
  contactId: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  type?: "customer" | "supplier" | "other";
  rawData?: unknown;
}

export interface ContactSearchResult {
  contactId: string;
  name?: string;
  email?: string;
  contactType?: string;
  rawData?: unknown;
}

export interface ContactUpdateResult {
  success: boolean;
  contactId?: string;
  validationErrors?: string[];
  warnings?: string[];
  rawData?: unknown;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function safeString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export class ContactService {
  private readonly soapClient: YukiSoapClient;
  private readonly sessionManager: YukiSessionManager;

  public constructor(soapClient: YukiSoapClient, sessionManager: YukiSessionManager) {
    this.soapClient = soapClient;
    this.sessionManager = sessionManager;
  }

  public async searchContacts(searchValue: string): Promise<ContactSearchResult[]> {
    const sessionID = await this.sessionManager.getSessionId();
    const raw = await this.soapClient.call<unknown>({
      service: "Contact",
      method: "SearchContacts",
      args: {
        sessionID,
        searchValue
      }
    });

    const maybeRows = (raw as { Contact?: unknown; Contacts?: { Contact?: unknown } }).Contacts?.Contact ??
      (raw as { Contact?: unknown }).Contact;

    return toArray(maybeRows).map((row) => {
      const item = row as Record<string, unknown>;
      return {
        contactId: safeString(item.ContactID) ?? safeString(item.ID) ?? "",
        name: safeString(item.ContactName) ?? safeString(item.Name),
        email: safeString(item.Email) ?? safeString(item.EmailAddress),
        contactType: safeString(item.ContactType) ?? safeString(item.Type),
        rawData: row
      };
    });
  }

  public async getSuppliersAndCustomers(searchValue: string): Promise<ContactSearchResult[]> {
    const sessionID = await this.sessionManager.getSessionId();
    const raw = await this.soapClient.call<unknown>({
      service: "Contact",
      method: "GetSuppliersAndCustomers",
      args: {
        sessionID,
        searchValue
      }
    });

    const maybeRows = (raw as { Contact?: unknown; Contacts?: { Contact?: unknown } }).Contacts?.Contact ??
      (raw as { Contact?: unknown }).Contact;

    return toArray(maybeRows).map((row) => {
      const item = row as Record<string, unknown>;
      return {
        contactId: safeString(item.ContactID) ?? safeString(item.ID) ?? "",
        name: safeString(item.ContactName) ?? safeString(item.Name),
        email: safeString(item.Email) ?? safeString(item.EmailAddress),
        contactType: safeString(item.ContactType) ?? safeString(item.Type),
        rawData: row
      };
    });
  }

  public async updateContact(
    contactXml: string,
    dryRun: boolean = true
  ): Promise<ContactUpdateResult> {
    const sessionID = await this.sessionManager.getSessionId();

    try {
      const raw = await this.soapClient.call<unknown>({
        service: "Contact",
        method: "UpdateContact",
        args: {
          sessionID,
          xmlData: contactXml
        }
      });

      const result = raw as Record<string, unknown>;
      const errors = toArray(result.ValidationErrors ?? result.Errors);
      const warnings = toArray(result.Warnings ?? []);

      return {
        success: !dryRun && (errors.length === 0),
        contactId: safeString(result.ContactID) ?? safeString(result.ID),
        validationErrors: errors.map((e) => safeString(e) ?? JSON.stringify(e)).filter((e) => e),
        warnings: warnings.map((w) => safeString(w) ?? JSON.stringify(w)).filter((w) => w),
        rawData: raw
      };
    } catch (error) {
      return {
        success: false,
        validationErrors: [error instanceof Error ? error.message : "Unknown error"],
        warnings: [],
        rawData: undefined
      };
    }
  }
}
