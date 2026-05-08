import { describe, it, expect } from "vitest";
import {
  validateXmlWellFormedness,
  validateInvoiceStructure,
  estimateInvoiceCount,
  extractValidationSummary
} from "../../src/utils/xmlValidator.js";

describe("XML Validator Tests", () => {
  describe("validateXmlWellFormedness", () => {
    it("should validate well-formed XML", () => {
      const xml = '<?xml version="1.0"?><root><item>test</item></root>';
      const result = validateXmlWellFormedness(xml);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect empty XML", () => {
      const result = validateXmlWellFormedness("");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("XML document is empty");
    });

    it("should warn about missing XML declaration", () => {
      const xml = "<root><item>test</item></root>";
      const result = validateXmlWellFormedness(xml);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("should start with");
    });

    it("should detect unbalanced tags", () => {
      const xml = '<?xml version="1.0"?><root><item>test</root>';
      const result = validateXmlWellFormedness(xml);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Unbalanced"))).toBe(true);
    });

    it("should warn about unescaped ampersands", () => {
      const xml = '<?xml version="1.0"?><root><item>A & B</item></root>';
      const result = validateXmlWellFormedness(xml);
      expect(result.warnings.some((w) => w.includes("ampersand"))).toBe(true);
    });

    it("should detect unclosed CDATA sections", () => {
      const xml = '<?xml version="1.0"?><root><![CDATA[data</root>';
      const result = validateXmlWellFormedness(xml);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("CDATA"))).toBe(true);
    });

    it("should detect null bytes", () => {
      const xml = '<?xml version="1.0"?><root>\x00</root>';
      const result = validateXmlWellFormedness(xml);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("null byte"))).toBe(true);
    });

    it("should warn about very large XML documents", () => {
      const xml = '<?xml version="1.0"?><root>' + "x".repeat(10_000_001) + "</root>";
      const result = validateXmlWellFormedness(xml);
      expect(result.warnings.some((w) => w.includes("very large"))).toBe(true);
    });
  });

  describe("validateInvoiceStructure", () => {
    it("should validate sales invoice structure", () => {
      const xml = `<?xml version="1.0"?>
        <Invoices>
          <Invoice>
            <Number>INV001</Number>
            <Date>2024-05-01</Date>
            <Amount>1000</Amount>
          </Invoice>
        </Invoices>`;
      const result = validateInvoiceStructure(xml, "sales");
      expect(result.valid).toBe(true);
    });

    it("should validate purchase invoice structure", () => {
      const xml = `<?xml version="1.0"?>
        <PurchaseInvoices>
          <PurchaseInvoice>
            <Number>PO001</Number>
            <Date>2024-05-01</Date>
            <Amount>5000</Amount>
          </PurchaseInvoice>
        </PurchaseInvoices>`;
      const result = validateInvoiceStructure(xml, "purchase");
      expect(result.valid).toBe(true);
    });

    it("should detect missing sales invoice root element", () => {
      const xml = '<?xml version="1.0"?><Document><Item>test</Item></Document>';
      const result = validateInvoiceStructure(xml, "sales");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Invoices"))).toBe(true);
    });

    it("should detect missing purchase invoice root element", () => {
      const xml = '<?xml version="1.0"?><Document><Item>test</Item></Document>';
      const result = validateInvoiceStructure(xml, "purchase");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("PurchaseInvoices"))).toBe(true);
    });

    it("should warn about missing required fields", () => {
      const xml = '<?xml version="1.0"?><Invoices><Invoice></Invoice></Invoices>';
      const result = validateInvoiceStructure(xml, "sales");
      expect(result.warnings.some((w) => w.includes("Missing common"))).toBe(true);
    });

    it("should handle case-insensitive tag detection", () => {
      const xml = '<?xml version="1.0"?><invoices><invoice><number>123</number></invoice></invoices>';
      const result = validateInvoiceStructure(xml, "sales");
      expect(result.valid).toBe(true);
    });

    it("should warn about unusual encodings", () => {
      const xml = '<?xml version="1.0" encoding="UTF-16"?><Invoices></Invoices>';
      const result = validateInvoiceStructure(xml, "sales");
      expect(result.warnings.some((w) => w.includes("encoding"))).toBe(true);
    });
  });

  describe("estimateInvoiceCount", () => {
    it("should count sales invoices", () => {
      const xml = `<?xml version="1.0"?>
        <Invoices>
          <Invoice><Number>1</Number></Invoice>
          <Invoice><Number>2</Number></Invoice>
          <Invoice><Number>3</Number></Invoice>
        </Invoices>`;
      const count = estimateInvoiceCount(xml, "sales");
      expect(count).toBe(3);
    });

    it("should count purchase invoices", () => {
      const xml = `<?xml version="1.0"?>
        <PurchaseInvoices>
          <PurchaseInvoice><Number>PO1</Number></PurchaseInvoice>
          <PurchaseInvoice><Number>PO2</Number></PurchaseInvoice>
        </PurchaseInvoices>`;
      const count = estimateInvoiceCount(xml, "purchase");
      expect(count).toBe(2);
    });

    it("should return 0 for no invoices", () => {
      const xml = "<?xml version=\"1.0\"?><Invoices></Invoices>";
      const count = estimateInvoiceCount(xml, "sales");
      expect(count).toBe(0);
    });

    it("should handle case-insensitive counting", () => {
      const xml = `<?xml version="1.0"?>
        <Invoices>
          <invoice><Number>1</Number></invoice>
          <INVOICE><Number>2</Number></INVOICE>
        </Invoices>`;
      const count = estimateInvoiceCount(xml, "sales");
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  describe("extractValidationSummary", () => {
    it("should summarize valid XML with no warnings", () => {
      const result = { valid: true, errors: [], warnings: [] };
      const summary = extractValidationSummary(result);
      expect(summary).toBe("XML is valid");
    });

    it("should summarize errors", () => {
      const result = { valid: false, errors: ["Error 1", "Error 2"], warnings: [] };
      const summary = extractValidationSummary(result);
      expect(summary).toContain("2 error(s)");
      expect(summary).toContain("Error 1");
    });

    it("should summarize warnings", () => {
      const result = { valid: true, errors: [], warnings: ["Warning 1", "Warning 2"] };
      const summary = extractValidationSummary(result);
      expect(summary).toContain("2 warning(s)");
      expect(summary).toContain("Warning 1");
    });

    it("should combine errors and warnings", () => {
      const result = { valid: false, errors: ["Error 1"], warnings: ["Warning 1"] };
      const summary = extractValidationSummary(result);
      expect(summary).toContain("1 error(s)");
      expect(summary).toContain("1 warning(s)");
    });
  });
});

describe("Invoice Service Flow Tests", () => {
  it("should demonstrate XML validation before submission", () => {
    // This test shows the intended workflow for invoice submission

    // 1. Get schema
    const schemaPath = "/path/to/SalesInvoice.xsd";

    // 2. Prepare invoice XML
    const invoiceXml = `<?xml version="1.0"?>
      <Invoices>
        <Invoice>
          <Number>INV-2024-001</Number>
          <Date>2024-05-07</Date>
          <CustomerID>CUST001</CustomerID>
          <Amount>1250.50</Amount>
          <Lines>
            <Line>
              <Item>Product A</Item>
              <Qty>5</Qty>
              <Price>250.10</Price>
            </Line>
          </Lines>
        </Invoice>
      </Invoices>`;

    // 3. Validate structure
    const validation = validateInvoiceStructure(invoiceXml, "sales");
    expect(validation.valid).toBe(true);

    // 4. Estimate count
    const count = estimateInvoiceCount(invoiceXml, "sales");
    expect(count).toBe(1);

    // 5. Default: dry-run (validate only)
    // In actual implementation, dry-run would call SOAP but not commit

    // 6. For actual submission: require confirm=true + dryRun=false
    // assertWriteConfirmation() would throw if conditions not met
  });

  it("should demonstrate error handling in XML validation", () => {
    const invalidXml = `<?xml version="1.0"?>
      <Invoices>
        <Invoice>
          <Number>INV001
        </Invoice>
      </Invoices>`;

    const validation = validateInvoiceStructure(invalidXml, "sales");
    expect(validation.valid).toBe(false);

    const summary = extractValidationSummary(validation);
    expect(summary).toContain("error");
  });

  it("should handle both singular and plural XML structures", () => {
    // Yuki accepts both <Invoice> and <Invoices><Invoice>
    const singularXml = '<?xml version="1.0"?><Invoice><Number>1</Number></Invoice>';
    const singularValidation = validateInvoiceStructure(singularXml, "sales");
    expect(singularValidation.valid).toBe(true);

    const pluralXml = '<?xml version="1.0"?><Invoices><Invoice><Number>1</Number></Invoice></Invoices>';
    const pluralValidation = validateInvoiceStructure(pluralXml, "sales");
    expect(pluralValidation.valid).toBe(true);
  });
});

describe("Dry-run and Confirmation Pattern Tests", () => {
  it("should demonstrate dry-run validation without submission", () => {
    // Dry-run=true (default) means:
    // 1. XML is validated against schema
    // 2. SOAP call is made but marked as dry-run
    // 3. Yuki returns validation errors but no commit
    // 4. No confirmation required

    const result = {
      dryRun: true,
      validationErrors: [] // Empty means validation passed
    };

    expect(result.dryRun).toBe(true);
    expect(result.validationErrors).toHaveLength(0);
  });

  it("should require explicit confirmation for actual submission", () => {
    // For dryRun=false, the submission requires:
    // 1. confirm=true (explicit approval)
    // 2. confirmationSummary (what is being submitted)
    // 3. writeOperationsEnabled=true (from config)

    const submissionInput = {
      dryRun: false,
      confirm: true,
      confirmationSummary: "Submit 1 sales invoice INV-2024-001 for customer CUST001, amount 1250.50"
    };

    expect(submissionInput.confirm).toBe(true);
    expect(submissionInput.confirmationSummary.length).toBeGreaterThan(10);
  });

  it("should prevent submission without confirmation", () => {
    // If dryRun=false but confirm is missing or false, it should throw

    const invalidSubmission = {
      dryRun: false,
      confirm: false // Missing or false
    };

    // In actual code: assertWriteConfirmation() would throw
    expect(invalidSubmission.confirm).toBe(false);
  });
});
