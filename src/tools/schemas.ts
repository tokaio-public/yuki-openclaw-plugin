import { Type } from "@sinclair/typebox";

export const EmptyInputSchema = Type.Object({}, { additionalProperties: false });

export const SetCurrentDomainInputSchema = Type.Object(
  {
    domainId: Type.Integer({ minimum: 1, description: "Yuki domain ID to set as current" })
  },
  { additionalProperties: false }
);

export const AdministrationIdSchema = Type.Object(
  {
    administrationId: Type.Integer({ minimum: 1, description: "Yuki administration ID" })
  },
  { additionalProperties: false }
);

export const DateRangeSchema = Type.Object(
  {
    administrationId: Type.Integer({ minimum: 1, description: "Yuki administration ID" }),
    fromDate: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Start date (YYYY-MM-DD)" }),
    toDate: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "End date (YYYY-MM-DD)" })
  },
  { additionalProperties: false }
);

export const GLAccountSearchSchema = Type.Object(
  {
    administrationId: Type.Integer({ minimum: 1, description: "Yuki administration ID" }),
    accountCode: Type.String({ description: "GL account code" }),
    fromDate: Type.Optional(Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Start date (YYYY-MM-DD)" })),
    toDate: Type.Optional(Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "End date (YYYY-MM-DD)" }))
  },
  { additionalProperties: false }
);

export const TransactionDetailSchema = Type.Object(
  {
    transactionId: Type.String({ description: "Transaction ID to retrieve" })
  },
  { additionalProperties: false }
);

export const GetInvoiceSchemaInputSchema = Type.Object(
  {
    invoiceType: Type.Enum({ sales: "sales", purchase: "purchase" }, { description: "Type of invoice: sales or purchase" })
  },
  { additionalProperties: false }
);

export const ListInvoiceItemsSchema = Type.Object(
  {
    administrationId: Type.Integer({ minimum: 1, description: "Yuki administration ID" }),
    invoiceType: Type.Enum({ sales: "sales", purchase: "purchase" }, { description: "Type of invoice: sales or purchase" })
  },
  { additionalProperties: false }
);

export const InvoiceSubmissionSchema = Type.Object(
  {
    administrationId: Type.Integer({ minimum: 1, description: "Yuki administration ID" }),
    invoiceType: Type.Enum({ sales: "sales", purchase: "purchase" }, { description: "Type of invoice: sales or purchase" }),
    xmlDocument: Type.String({ description: "XML document containing invoice(s)" }),
    dryRun: Type.Optional(Type.Boolean({ description: "Validate only, do not submit (default: true)" })),
    confirm: Type.Optional(Type.Boolean({ description: "Explicit confirmation required when dryRun=false" })),
    confirmationSummary: Type.Optional(Type.String({ minLength: 10, description: "Brief summary of what is being submitted" })),
    recognizePurchase: Type.Optional(Type.Boolean({ description: "For purchase invoices: recognize/validate instead of full process (default: false)" }))
  },
  { additionalProperties: false }
);

// Phase 4 - Contact, Project, Archive schemas

export const ContactSearchSchema = Type.Object(
  {
    searchValue: Type.String({ minLength: 1, description: "Name, email, or company to search" })
  },
  { additionalProperties: false }
);

export const ContactUpdateSchema = Type.Object(
  {
    contactXml: Type.String({ description: "XML document containing contact data" }),
    dryRun: Type.Optional(Type.Boolean({ description: "Validate only, do not submit (default: true)" })),
    confirm: Type.Optional(Type.Boolean({ description: "Explicit confirmation required when dryRun=false" })),
    confirmationSummary: Type.Optional(Type.String({ minLength: 10, description: "Brief summary of contact update" }))
  },
  { additionalProperties: false }
);

export const ProjectSearchSchema = Type.Object(
  {
    administrationId: Type.Integer({ minimum: 1, description: "Yuki administration ID" })
  },
  { additionalProperties: false }
);

export const ProjectDetailSchema = Type.Object(
  {
    projectId: Type.String({ description: "Project ID to retrieve" })
  },
  { additionalProperties: false }
);

export const ProjectUpdateSchema = Type.Object(
  {
    projectXml: Type.String({ description: "XML document containing project data" }),
    dryRun: Type.Optional(Type.Boolean({ description: "Validate only, do not submit (default: true)" })),
    confirm: Type.Optional(Type.Boolean({ description: "Explicit confirmation required when dryRun=false" })),
    confirmationSummary: Type.Optional(Type.String({ minLength: 10, description: "Brief summary of project update" }))
  },
  { additionalProperties: false }
);

export const DocumentSearchSchema = Type.Object(
  {
    searchValue: Type.String({ minLength: 1, description: "Document name or content to search" }),
    folder: Type.Optional(Type.String({ description: "Archive folder to limit search" })),
    fromDate: Type.Optional(Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "Start date (YYYY-MM-DD)" })),
    toDate: Type.Optional(Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "End date (YYYY-MM-DD)" }))
  },
  { additionalProperties: false }
);

export const DocumentDownloadSchema = Type.Object(
  {
    documentId: Type.String({ description: "Document ID to download" })
  },
  { additionalProperties: false }
);

export const DocumentUploadSchema = Type.Object(
  {
    filename: Type.String({ minLength: 1, maxLength: 255, description: "Name of file to upload" }),
    contentType: Type.String({ description: "MIME type (e.g., application/pdf, text/plain)" }),
    fileData: Type.String({ description: "Base64-encoded file content" }),
    description: Type.Optional(Type.String({ description: "Optional description of document" })),
    dryRun: Type.Optional(Type.Boolean({ description: "Validate only, do not upload (default: true)" })),
    confirm: Type.Optional(Type.Boolean({ description: "Explicit confirmation required when dryRun=false" })),
    confirmationSummary: Type.Optional(Type.String({ minLength: 10, description: "Brief summary of document upload" }))
  },
  { additionalProperties: false }
);

// Phase 5 - VAT and Backoffice schemas

export const VATReturnListSchema = Type.Object(
  {
    administrationId: Type.Integer({ minimum: 1, description: "Yuki administration ID" }),
    fromPeriod: Type.Optional(Type.String({ description: "Start period (YYYY-MM format)" })),
    toPeriod: Type.Optional(Type.String({ description: "End period (YYYY-MM format)" }))
  },
  { additionalProperties: false }
);

export const VATCodesSchema = Type.Object(
  {
    administrationId: Type.Integer({ minimum: 1, description: "Yuki administration ID" })
  },
  { additionalProperties: false }
);

export const BackofficeQuestionsSchema = Type.Object(
  {
    administrationId: Type.Integer({ minimum: 1, description: "Yuki administration ID" })
  },
  { additionalProperties: false }
);

export const WorkflowSchema = Type.Object(
  {
    administrationId: Type.Integer({ minimum: 1, description: "Yuki administration ID" })
  },
  { additionalProperties: false }
);

// Phase 6 - Company Snapshot and Month-end Checklist schemas

export const CompanySnapshotSchema = Type.Object(
  {
    administrationId: Type.Integer({ minimum: 1, description: "Yuki administration ID" })
  },
  { additionalProperties: false }
);

export const MonthEndChecklistSchema = Type.Object(
  {
    administrationId: Type.Integer({ minimum: 1, description: "Yuki administration ID" }),
    period: Type.String({ pattern: "^\\d{4}-\\d{2}$", description: "Month period in YYYY-MM format" })
  },
  { additionalProperties: false }
);
