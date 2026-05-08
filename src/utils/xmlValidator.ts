/**
 * XML Validator for Yuki invoice documents
 * Performs well-formedness and structure validation using fast-xml-parser.
 */

import { XMLValidator } from "fast-xml-parser";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateXmlWellFormedness(xmlString: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!xmlString || xmlString.trim().length === 0) {
    errors.push("XML document is empty");
    return { valid: false, errors, warnings };
  }

  // Check for null bytes (common corruption) before parser sees the string
  if (xmlString.includes("\x00")) {
    errors.push("XML document contains null bytes");
    return { valid: false, errors, warnings };
  }

  // Check for XML declaration (optional but recommended)
  if (!xmlString.trim().startsWith("<?xml")) {
    warnings.push("XML document should start with <?xml declaration");
  }

  // Warn about unescaped ampersands before structural validation
  if (xmlString.includes("&") && !xmlString.includes("&amp;") && !xmlString.includes("&#")) {
    warnings.push("Unescaped ampersands detected; use &amp; for literal &");
  }

  // Delegate structural validation to fast-xml-parser (handles balanced tags,
  // CDATA, encoding, attribute syntax, etc.)
  const result = XMLValidator.validate(xmlString, { allowBooleanAttributes: true });
  if (result !== true) {
    const err = result.err;
    errors.push(`XML parse error: ${err.msg} (line ${err.line}, col ${err.col})`);
    return { valid: false, errors, warnings };
  }

  // Check XML size reasonableness
  if (xmlString.length > 10_000_000) {
    warnings.push(`XML document is very large (${Math.round(xmlString.length / 1024 / 1024)}MB); consider splitting into batches`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateInvoiceStructure(xmlString: string, invoiceType: "sales" | "purchase"): ValidationResult {
  const wellFormedResult = validateXmlWellFormedness(xmlString);

  if (!wellFormedResult.valid) {
    return wellFormedResult;
  }

  const errors = [...wellFormedResult.errors];
  const warnings = [...wellFormedResult.warnings];

  // Check for required root elements
  const upperXml = xmlString.toUpperCase();
  
  if (invoiceType === "sales") {
    if (!upperXml.includes("<INVOICES>") && !upperXml.includes("<INVOICE>")) {
      errors.push("Sales invoice XML must contain <Invoices> or <Invoice> root element");
    }
  } else if (invoiceType === "purchase") {
    if (!upperXml.includes("<PURCHASEINVOICES>") && !upperXml.includes("<PURCHASEINVOICE>")) {
      errors.push("Purchase invoice XML must contain <PurchaseInvoices> or <PurchaseInvoice> root element");
    }
  }

  // Check for required elements within invoices
  const requiredFields = ["Number", "Date", "Amount"];
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const fieldUpper = field.toUpperCase();
    if (!upperXml.includes(`<${fieldUpper}>`) && !upperXml.includes(`<${field}>`)) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    warnings.push(`Missing common invoice fields: ${missingFields.join(", ")}`);
  }

  // Check for encodings
  const encodingMatch = xmlString.match(/encoding=["']([^"']+)["']/i);
  const encodingCandidate = encodingMatch?.[1];
  if (encodingCandidate) {
    const encoding = encodingCandidate.toLowerCase();
    if (!["utf-8", "utf8", "iso-8859-1", "windows-1252"].includes(encoding)) {
      warnings.push(`Unusual encoding detected: ${encoding}; UTF-8 is recommended`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function estimateInvoiceCount(xmlString: string, invoiceType: "sales" | "purchase"): number {
  const tagName = invoiceType === "sales" ? "invoice" : "purchaseinvoice";
  const pattern = new RegExp(`<${tagName}[\\s>]`, "gi");
  const matches = xmlString.match(pattern);
  return matches ? matches.length : 0;
}

export function extractValidationSummary(result: ValidationResult): string {
  if (result.valid && result.warnings.length === 0) {
    return "XML is valid";
  }

  const parts: string[] = [];

  if (result.errors.length > 0) {
    parts.push(`${result.errors.length} error(s): ${result.errors[0]}`);
  }

  if (result.warnings.length > 0) {
    parts.push(`${result.warnings.length} warning(s): ${result.warnings[0]}`);
  }

  return parts.join("; ");
}
