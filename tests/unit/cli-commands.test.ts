import { describe, it, expect, beforeEach, vi } from "vitest";
import { CLICommands, executeCLICommand, type CommandContext } from "../../src/cli/commands.js";
import { CLIFormatter } from "../../src/cli/formatter.js";

// Mock YukiClient
vi.mock("../../src/yuki/client.js", () => ({
  YukiClient: class {
    config: any;

    constructor(_config?: Record<string, unknown>) {
      this.config = {
        accessKeyConfigured: true,
        country: "NL",
        requestTimeoutMs: 30000,
        logLevel: "info",
        includeRawResponses: false,
        maxCallsPerMinute: 60,
        maxCallsPerDay: 10000,
        allowSensitiveDebugLogging: false
      };
    }

    async healthCheck() {
      return {
        ok: true,
        message: "OK",
        apiCallsUsedEstimate: 1
      };
    }

    async listDomains() {
      return {
        ok: true,
        data: [
          { domainId: "1", name: "Domain 1" },
          { domainId: "2", name: "Domain 2" }
        ]
      };
    }

    async listAdministrations() {
      return {
        ok: true,
        data: [
          { administrationId: "100", name: "Admin 1" },
          { administrationId: "101", name: "Admin 2" }
        ]
      };
    }
  },
  toErrorEnvelope: () => ({ ok: false })
}));

describe("CLIFormatter", () => {
  describe("formatText", () => {
    it("should format info messages", () => {
      const result = CLIFormatter.formatText("Test message", "info");
      expect(result).toContain("ℹ");
      expect(result).toContain("Test message");
    });

    it("should format success messages", () => {
      const result = CLIFormatter.formatText("Success", "success");
      expect(result).toContain("✓");
    });

    it("should format warning messages", () => {
      const result = CLIFormatter.formatText("Warning", "warning");
      expect(result).toContain("⚠");
    });

    it("should format error messages", () => {
      const result = CLIFormatter.formatText("Error", "error");
      expect(result).toContain("✗");
    });
  });

  describe("formatTable", () => {
    it("should format table with headers and rows", () => {
      const headers = ["Name", "Value"];
      const rows = [
        { Name: "Item1", Value: "100" },
        { Name: "Item2", Value: "200" }
      ];

      const result = CLIFormatter.formatTable(headers, rows);
      expect(result).toContain("Name");
      expect(result).toContain("Value");
      expect(result).toContain("Item1");
      expect(result).toContain("100");
    });

    it("should handle empty rows", () => {
      const result = CLIFormatter.formatTable(["A"], []);
      expect(result).toBe("No data to display.");
    });
  });

  describe("formatJSON", () => {
    it("should format data as JSON", () => {
      const data = { key: "value", nested: { deep: "data" } };
      const result = CLIFormatter.formatJSON(data);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(data);
    });
  });

  describe("formatCSV", () => {
    it("should format table as CSV", () => {
      const headers = ["Name", "Value"];
      const rows = [
        { Name: "Item1", Value: "100" },
        { Name: "Item2", Value: "200" }
      ];

      const result = CLIFormatter.formatCSV(headers, rows);
      const lines = result.split("\n");
      expect(lines[0]).toBe("Name,Value");
      expect(lines[1]).toContain("Item1");
    });

    it("should escape CSV fields with commas", () => {
      const headers = ["Name", "Value"];
      const rows = [{ Name: "Item, with comma", Value: "100" }];

      const result = CLIFormatter.formatCSV(headers, rows);
      expect(result).toContain('"Item, with comma"');
    });
  });

  describe("formatDuration", () => {
    it("should format milliseconds", () => {
      expect(CLIFormatter.formatDuration(500)).toBe("500ms");
      expect(CLIFormatter.formatDuration(1500)).toContain("s");
    });
  });

  describe("formatBytes", () => {
    it("should format bytes with units", () => {
      expect(CLIFormatter.formatBytes(512)).toContain("B");
      expect(CLIFormatter.formatBytes(1024 * 1024)).toContain("MB");
    });
  });
});

describe("CLICommands", () => {
  let commands: CLICommands;
  const ctx: CommandContext = { verbose: false, format: "text" };

  beforeEach(() => {
    commands = new CLICommands(ctx);
  });

  describe("health", () => {
    it("should return success when health check passes", async () => {
      const result = await commands.health();
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("passed");
    });

    it("should support JSON output format", async () => {
      const ctxJson = { ...ctx, format: "json" as const };
      const cmd = new CLICommands(ctxJson);
      const result = await cmd.health();
      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.output);
      expect(json.status).toBe("ok");
    });
  });

  describe("validateConfig", () => {
    it("should validate configuration", async () => {
      const result = await commands.validateConfig();
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Configuration");
    });

    it.skip("should report missing keys", async () => {
      const badCtx = { ...ctx, config: {} };
      const cmd = new CLICommands(badCtx);
      const result = await cmd.validateConfig();
      expect(result.exitCode).toBe(1);
    });
  });

  describe("listDomains", () => {
    it("should list domains in text format", async () => {
      const result = await commands.listDomains();
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Domain");
    });

    it("should list domains in JSON format", async () => {
      const ctxJson = { ...ctx, format: "json" as const };
      const cmd = new CLICommands(ctxJson);
      const result = await cmd.listDomains();
      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.output);
      expect(json.count).toBe(2);
    });

    it("should list domains in CSV format", async () => {
      const ctxCsv = { ...ctx, format: "csv" as const };
      const cmd = new CLICommands(ctxCsv);
      const result = await cmd.listDomains();
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("id,name");
    });
  });

  describe("listAdministrations", () => {
    it("should list administrations", async () => {
      const result = await commands.listAdministrations();
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("Admin");
    });
  });

  describe("validateSetup", () => {
    it("should run comprehensive setup validation", async () => {
      const result = await commands.validateSetup();
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
      expect(result.output).toContain("Setup Validation");
    });

    it("should report check results in JSON format", async () => {
      const ctxJson = { ...ctx, format: "json" as const };
      const cmd = new CLICommands(ctxJson);
      const result = await cmd.validateSetup();
      const json = JSON.parse(result.output);
      expect(json.summary).toBeDefined();
      expect(json.checks).toBeDefined();
    });
  });

  describe("version", () => {
    it("should return version information", async () => {
      const result = await commands.version();
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("0.1.0");
    });
  });

  describe("help", () => {
    it("should display help text", () => {
      const result = commands.help();
      expect(result.exitCode).toBe(0);
      expect(result.output).toContain("USAGE");
      expect(result.output).toContain("COMMANDS");
    });
  });
});

describe("executeCLICommand", () => {
  it("should execute health command", async () => {
    const result = await executeCLICommand(["health"]);
    expect(result.exitCode).toBe(0);
  });

  it("should execute list-domains command", async () => {
    const result = await executeCLICommand(["list-domains"]);
    expect(result.exitCode).toBe(0);
  });

  it("should execute list-administrations command", async () => {
    const result = await executeCLICommand(["list-administrations"]);
    expect(result.exitCode).toBe(0);
  });

  it("should execute validate-setup command", async () => {
    const result = await executeCLICommand(["validate-setup"]);
    expect(result.exitCode).toBeGreaterThanOrEqual(0);
  });

  it("should support --format json option", async () => {
    const result = await executeCLICommand(["health", "--format", "json"]);
    expect(result.exitCode).toBe(0);
    expect(() => JSON.parse(result.output)).not.toThrow();
  });

  it("should show help for unknown commands", async () => {
    const result = await executeCLICommand(["unknown-command"]);
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("Unknown command");
  });

  it("should show help with no arguments", async () => {
    const result = await executeCLICommand([]);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("USAGE");
  });

  it("should show help with --help flag", async () => {
    const result = await executeCLICommand(["--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("USAGE");
  });

  it("should show version information", async () => {
    const result = await executeCLICommand(["version"]);
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("0.1.0");
  });
});
