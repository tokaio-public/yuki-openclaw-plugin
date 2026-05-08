import type { YukiSessionManager } from "../auth.js";
import type { YukiSoapClient } from "../soap.js";

export interface DocumentMetadata {
  documentId: string;
  filename?: string;
  contentType?: string;
  fileSize?: number;
  uploadDate?: string;
  description?: string;
  rawData?: unknown;
}

export interface DocumentSearchResult {
  documentId: string;
  filename?: string;
  uploadDate?: string;
  rawData?: unknown;
}

export interface DocumentUploadResult {
  success: boolean;
  documentId?: string;
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

function safeNumber(value: unknown): number {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

export class ArchiveService {
  private readonly soapClient: YukiSoapClient;
  private readonly sessionManager: YukiSessionManager;

  public constructor(soapClient: YukiSoapClient, sessionManager: YukiSessionManager) {
    this.soapClient = soapClient;
    this.sessionManager = sessionManager;
  }

  public async searchDocuments(
    searchValue: string,
    folder?: string,
    fromDate?: string,
    toDate?: string
  ): Promise<DocumentSearchResult[]> {
    const sessionID = await this.sessionManager.getSessionId();
    const args: Record<string, unknown> = {
      sessionID,
      searchValue
    };

    if (folder) {
      args.folder = folder;
    }
    if (fromDate) {
      args.dateFrom = fromDate;
    }
    if (toDate) {
      args.dateTo = toDate;
    }

    const raw = await this.soapClient.call<unknown>({
      service: "Archive",
      method: "SearchDocuments",
      args
    });

    const maybeRows = (raw as { Document?: unknown; Documents?: { Document?: unknown } }).Documents?.Document ??
      (raw as { Document?: unknown }).Document;

    return toArray(maybeRows).map((row) => {
      const item = row as Record<string, unknown>;
      return {
        documentId: safeString(item.DocumentID) ?? safeString(item.ID) ?? "",
        filename: safeString(item.Filename),
        uploadDate: safeString(item.UploadDate) ?? safeString(item.Date),
        rawData: row
      };
    });
  }

  public async findDocument(documentId: string): Promise<DocumentMetadata> {
    const sessionID = await this.sessionManager.getSessionId();
    const raw = await this.soapClient.call<unknown>({
      service: "Archive",
      method: "FindDocument",
      args: {
        sessionID,
        documentID: documentId
      }
    });

    const item = raw as Record<string, unknown>;
    return {
      documentId: safeString(item.DocumentID) ?? documentId,
      filename: safeString(item.Filename),
      contentType: safeString(item.ContentType) ?? safeString(item.MimeType),
      fileSize: safeNumber(item.FileSize ?? item.Size ?? 0),
      uploadDate: safeString(item.UploadDate) ?? safeString(item.Date),
      description: safeString(item.Description),
      rawData: raw
    };
  }

  public async downloadDocument(documentId: string): Promise<{ data: string; contentType?: string; filename?: string }> {
    const sessionID = await this.sessionManager.getSessionId();
    
    // First get metadata
    const metadata = await this.findDocument(documentId);

    // Then download the binary
    const raw = await this.soapClient.call<unknown>({
      service: "Archive",
      method: "DocumentFile",
      args: {
        sessionID,
        documentID: documentId
      }
    });

    // Base64-encoded or binary data
    const fileData = safeString(raw as unknown) ?? "";

    return {
      data: fileData,
      contentType: metadata.contentType,
      filename: metadata.filename
    };
  }

  public async uploadDocument(
    documentMetadata: Record<string, unknown>,
    fileData: string,
    fileName: string,
    dryRun: boolean = true
  ): Promise<DocumentUploadResult> {
    const sessionID = await this.sessionManager.getSessionId();

    try {
      const raw = await this.soapClient.call<unknown>({
        service: "Archive",
        method: "UploadDocumentWithAttachment",
        args: {
          sessionID,
          metadata: JSON.stringify(documentMetadata),
          fileName,
          fileData
        }
      });

      const result = raw as Record<string, unknown>;
      const errors = toArray(result.ValidationErrors ?? result.Errors);
      const warnings = toArray(result.Warnings ?? []);

      return {
        success: !dryRun && (errors.length === 0),
        documentId: safeString(result.DocumentID) ?? safeString(result.ID),
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
