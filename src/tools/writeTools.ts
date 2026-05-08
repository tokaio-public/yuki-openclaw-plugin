import type { Static } from "@sinclair/typebox";
import type { OpenClawToolRegistration } from "../types/openclaw-plugin-sdk.js";
import {
  GetInvoiceSchemaInputSchema,
  ListInvoiceItemsSchema,
  InvoiceSubmissionSchema,
  ContactUpdateSchema,
  ProjectUpdateSchema,
  DocumentUploadSchema,
  DocumentDownloadSchema
} from "./schemas.js";
import { YukiClient, toErrorEnvelope } from "../yuki/client.js";
import { assertWriteConfirmation } from "./confirmation.js";
import { validateInvoiceStructure, estimateInvoiceCount, extractValidationSummary } from "../utils/xmlValidator.js";
import { validateFileForUpload } from "../utils/fileValidator.js";

export function buildWriteTools(getClient: () => YukiClient): OpenClawToolRegistration[] {
  return [
    {
      name: "yuki_get_sales_invoice_schema",
      description: "Retrieve the XML schema path for sales invoices (required for preparing invoice XML).",
      parameters: GetInvoiceSchemaInputSchema,
      async execute(_toolCallId, _params: Static<typeof GetInvoiceSchemaInputSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().getSalesInvoiceSchema()) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Sales", "SalesInvoiceSchemaPath", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_get_purchase_invoice_schema",
      description: "Retrieve the XML schema path for purchase invoices (required for preparing invoice XML).",
      parameters: GetInvoiceSchemaInputSchema,
      async execute(_toolCallId, _params: Static<typeof GetInvoiceSchemaInputSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().getPurchaseInvoiceSchema()) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Purchase", "PurchaseInvoiceSchemaPath", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_list_sales_items",
      description: "List available sales items for invoice creation.",
      parameters: ListInvoiceItemsSchema,
      async execute(_toolCallId, params: Static<typeof ListInvoiceItemsSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().listSalesItems(params.administrationId)) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Sales", "GetSalesItems", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_list_purchase_items",
      description: "List available purchase items for invoice creation.",
      parameters: ListInvoiceItemsSchema,
      async execute(_toolCallId, params: Static<typeof ListInvoiceItemsSchema>) {
        try {
          return {
            content: [{ type: "text", text: JSON.stringify(await getClient().listPurchaseItems(params.administrationId)) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Purchase", "GetPurchaseItems", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_submit_sales_invoice",
      description: "Submit sales invoices to Yuki. Requires dry-run mode override and explicit confirmation for actual submission.",
      parameters: InvoiceSubmissionSchema,
      async execute(_toolCallId, params: Static<typeof InvoiceSubmissionSchema>) {
        try {
          // Check if invoiceType is actually sales (TypeBox enum guarantees this but being defensive)
          if (params.invoiceType !== "sales") {
            return {
              content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Sales", "ProcessSalesInvoices", new Error("Invalid invoice type for sales submission"))) }]
            };
          }

          const dryRun = params.dryRun ?? true;
          const client = getClient();

          // Validate XML structure
          const validationResult = validateInvoiceStructure(params.xmlDocument, "sales");
          const invoiceCount = estimateInvoiceCount(params.xmlDocument, "sales");

          if (!validationResult.valid) {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  ok: false,
                  service: "Sales",
                  method: "ProcessSalesInvoices",
                  errorCode: "XML_VALIDATION_ERROR",
                  message: `XML validation failed: ${extractValidationSummary(validationResult)}`,
                  recoverable: true,
                  nextSteps: ["Review XML structure against schema", "Fix validation errors", "Retry submission"]
                })
              }]
            };
          }

          // For actual submission (not dry-run), enforce confirmation
          if (!dryRun) {
            assertWriteConfirmation(
              { dryRun, confirm: params.confirm, confirmationSummary: params.confirmationSummary },
              client.config.writeOperationsEnabled
            );
          }

          const result = await client.submitSalesInvoices(params.administrationId, params.xmlDocument, dryRun);

          // Add validation info to warnings
          if (dryRun) {
            result.warnings = [
              ...(result.warnings ?? []),
              `XML structure validated: ${invoiceCount} invoice(s) detected`,
              ...validationResult.warnings
            ];
          }

          return {
            content: [{ type: "text", text: JSON.stringify(result) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Sales", "ProcessSalesInvoices", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_submit_purchase_invoice",
      description: "Submit purchase invoices to Yuki. Requires dry-run mode override and explicit confirmation for actual submission.",
      parameters: InvoiceSubmissionSchema,
      async execute(_toolCallId, params: Static<typeof InvoiceSubmissionSchema>) {
        try {
          // Check if invoiceType is actually purchase
          if (params.invoiceType !== "purchase") {
            return {
              content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Purchase", "ProcessPurchaseInvoices", new Error("Invalid invoice type for purchase submission"))) }]
            };
          }

          const dryRun = params.dryRun ?? true;
          const client = getClient();

          // Validate XML structure
          const validationResult = validateInvoiceStructure(params.xmlDocument, "purchase");
          const invoiceCount = estimateInvoiceCount(params.xmlDocument, "purchase");

          if (!validationResult.valid) {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  ok: false,
                  service: "Purchase",
                  method: "ProcessPurchaseInvoices",
                  errorCode: "XML_VALIDATION_ERROR",
                  message: `XML validation failed: ${extractValidationSummary(validationResult)}`,
                  recoverable: true,
                  nextSteps: ["Review XML structure against schema", "Fix validation errors", "Retry submission"]
                })
              }]
            };
          }

          // For actual submission (not dry-run), enforce confirmation
          if (!dryRun) {
            assertWriteConfirmation(
              { dryRun, confirm: params.confirm, confirmationSummary: params.confirmationSummary },
              client.config.writeOperationsEnabled
            );
          }

          const result = await client.submitPurchaseInvoices(
            params.administrationId,
            params.xmlDocument,
            dryRun,
            params.recognizePurchase ?? false
          );

          // Add validation info to warnings
          if (dryRun) {
            result.warnings = [
              ...(result.warnings ?? []),
              `XML structure validated: ${invoiceCount} invoice(s) detected`,
              ...validationResult.warnings
            ];
          }

          return {
            content: [{ type: "text", text: JSON.stringify(result) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Purchase", "ProcessPurchaseInvoices", error)) }]
          };
        }
      }
    },
    // Phase 4 - Write tools for Contacts, Projects, Archive
    {
      name: "yuki_update_contact",
      description: "Update a contact (supplier/customer) in Yuki. Requires XML contact data and explicit confirmation for actual updates.",
      parameters: ContactUpdateSchema,
      async execute(_toolCallId, params: Static<typeof ContactUpdateSchema>) {
        try {
          const dryRun = params.dryRun ?? true;
          const client = getClient();

          // For actual submission (not dry-run), enforce confirmation
          if (!dryRun) {
            assertWriteConfirmation(
              { dryRun, confirm: params.confirm, confirmationSummary: params.confirmationSummary },
              client.config.writeOperationsEnabled
            );
          }

          const result = await client.updateContact(params.contactXml, dryRun);

          return {
            content: [{ type: "text", text: JSON.stringify(result) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Contact", "UpdateContact", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_update_project",
      description: "Update a project in Yuki. Requires XML project data and explicit confirmation for actual updates.",
      parameters: ProjectUpdateSchema,
      async execute(_toolCallId, params: Static<typeof ProjectUpdateSchema>) {
        try {
          const dryRun = params.dryRun ?? true;
          const client = getClient();

          // For actual submission (not dry-run), enforce confirmation
          if (!dryRun) {
            assertWriteConfirmation(
              { dryRun, confirm: params.confirm, confirmationSummary: params.confirmationSummary },
              client.config.writeOperationsEnabled
            );
          }

          const result = await client.updateProject(params.projectXml, dryRun);

          return {
            content: [{ type: "text", text: JSON.stringify(result) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Projects", "UpdateProject", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_download_document",
      description: "Download a document from the Yuki archive. Returns binary file content and metadata.",
      parameters: DocumentDownloadSchema,
      async execute(_toolCallId, params: Static<typeof DocumentDownloadSchema>) {
        try {
          const result = await getClient().downloadDocument(params.documentId);

          return {
            content: [{ type: "text", text: JSON.stringify(result) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Archive", "DocumentFile", error)) }]
          };
        }
      }
    },
    {
      name: "yuki_upload_document",
      description: "Upload a document to the Yuki archive. Requires base64-encoded file data and explicit confirmation for actual uploads.",
      parameters: DocumentUploadSchema,
      async execute(_toolCallId, params: Static<typeof DocumentUploadSchema>) {
        try {
          const dryRun = params.dryRun ?? true;
          const client = getClient();

          // Validate file before upload
          const fileValidation = validateFileForUpload(
            params.filename,
            params.contentType,
            params.fileData?.length ?? 0,
            100 // 100MB max size
          );

          if (!fileValidation.valid) {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  ok: false,
                  service: "Archive",
                  method: "UploadDocumentWithAttachment",
                  errorCode: "FILE_VALIDATION_ERROR",
                  message: `File validation failed: ${fileValidation.errors.join("; ")}`,
                  recoverable: true,
                  nextSteps: [
                    "Review file validation errors",
                    "Check filename (no paths, < 255 chars)",
                    "Verify content-type is whitelisted",
                    "Ensure file size < 100MB",
                    "Retry upload"
                  ]
                })
              }]
            };
          }

          // For actual submission (not dry-run), enforce confirmation
          if (!dryRun) {
            assertWriteConfirmation(
              { dryRun, confirm: params.confirm, confirmationSummary: params.confirmationSummary },
              client.config.writeOperationsEnabled
            );
          }

          const result = await client.uploadDocument(
            params.filename,
            params.contentType,
            params.fileData,
            params.description,
            dryRun
          );

          return {
            content: [{ type: "text", text: JSON.stringify(result) }]
          };
        } catch (error) {
          return {
            content: [{ type: "text", text: JSON.stringify(toErrorEnvelope("Archive", "UploadDocumentWithAttachment", error)) }]
          };
        }
      }
    }
  ];
}
