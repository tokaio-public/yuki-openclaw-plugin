/**
 * CLI Command definitions and handlers
 * Provides diagnostic commands for plugin validation and troubleshooting
 */

import { YukiClient, toErrorEnvelope } from "../yuki/client.js";
import { CLIFormatter } from "./formatter.js";
import type { YukiConfig } from "../yuki/types.js";

export interface CommandContext {
  verbose?: boolean;
  format?: "text" | "json" | "table" | "csv";
  config?: Record<string, unknown>;
}

export interface CommandResult {
  exitCode: number;
  output: string;
}

export class CLICommands {
  private client: YukiClient;
  private ctx: CommandContext;

  constructor(ctx: CommandContext = {}) {
    this.ctx = ctx;
    this.client = new YukiClient(ctx.config || {});
  }

  /**
   * Health check - Validates plugin connectivity and authentication
   */
  async health(): Promise<CommandResult> {
    try {
      const startTime = Date.now();
      const result = await this.client.healthCheck();
      const duration = Date.now() - startTime;

      if (result.ok) {
        const output = this.ctx.format === "json"
          ? CLIFormatter.formatJSON({
              status: "ok",
              message: "Plugin health check passed",
              duration,
              apiCallsUsedEstimate: result.apiCallsUsedEstimate,
              timestamp: new Date().toISOString()
            })
          : [
              CLIFormatter.formatText("Plugin health check passed", "success"),
              `Duration: ${CLIFormatter.formatDuration(duration)}`,
              `API calls: ${result.apiCallsUsedEstimate}`,
              `Timestamp: ${new Date().toISOString()}`
            ].join("\n");

        return { exitCode: 0, output };
      } else {
        const warningSummary = Array.isArray(result.warnings) && result.warnings.length > 0
          ? ` (${result.warnings[0]})`
          : "";
        return {
          exitCode: 1,
          output: CLIFormatter.formatText(`Health check failed${warningSummary}`, "error")
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        exitCode: 1,
        output: CLIFormatter.formatText(`Health check failed: ${message}`, "error")
      };
    }
  }

  /**
   * Config validation - Checks configuration setup
   */
  async validateConfig(): Promise<CommandResult> {
    try {
      const config = this.client.config;
      const checks = {
        accessKeySet: config.accessKeyConfigured ? "✓" : "✗",
        countryValid: config.country ? "✓" : "✗",
        timeoutConfigured: config.requestTimeoutMs > 0 ? "✓" : "✗",
        logLevel: config.logLevel || "info",
        includeRaw: config.includeRawResponses ? "yes" : "no",
        country: config.country,
        requestTimeoutMs: config.requestTimeoutMs,
        maxCallsPerMinute: config.maxCallsPerMinute,
        maxCallsPerDay: config.maxCallsPerDay
      };

      const hasErrors = !config.accessKeyConfigured || !config.country;

      if (this.ctx.format === "json") {
        return {
          exitCode: hasErrors ? 1 : 0,
          output: CLIFormatter.formatJSON({
            status: hasErrors ? "error" : "ok",
            checks
          })
        };
      }

      const output = [
        CLIFormatter.formatText("Configuration Validation", "info"),
        "",
        `  Access Key: ${checks.accessKeySet}`,
        `  Country: ${checks.countryValid} (${checks.country})`,
        `  Timeout: ${checks.timeoutConfigured} (${checks.requestTimeoutMs}ms)`,
        `  Log Level: ${checks.logLevel}`,
        `  Include Raw: ${checks.includeRaw}`,
        `  Rate Limit: ${checks.maxCallsPerMinute}/min, ${checks.maxCallsPerDay}/day`,
        "",
        hasErrors
          ? CLIFormatter.formatText("Configuration incomplete - check ACCESS_KEY and COUNTRY env vars", "error")
          : CLIFormatter.formatText("Configuration valid", "success")
      ];

      return {
        exitCode: hasErrors ? 1 : 0,
        output: output.join("\n")
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        exitCode: 1,
        output: CLIFormatter.formatText(`Config validation failed: ${message}`, "error")
      };
    }
  }

  /**
   * List domains - Shows available domains
   */
  async listDomains(): Promise<CommandResult> {
    try {
      const result = await this.client.listDomains();

      if (!result.ok || !Array.isArray(result.data)) {
        return { exitCode: 1, output: CLIFormatter.formatText("Failed to list domains", "error") };
      }

      const domains = result.data as Array<{ domainId?: string; name?: string }>;

      if (this.ctx.format === "json") {
        return {
          exitCode: 0,
          output: CLIFormatter.formatJSON({
            count: domains.length,
            domains,
            timestamp: new Date().toISOString()
          })
        };
      }

      if (this.ctx.format === "csv") {
        const rows = domains.map((d) => ({ id: d.domainId || "", name: d.name || "" }));
        return {
          exitCode: 0,
          output: CLIFormatter.formatCSV(["id", "name"], rows)
        };
      }

      const rows = domains.map((d) => ({ id: d.domainId || "", name: d.name || "" }));
      const table = CLIFormatter.formatTable(["id", "name"], rows);

      return {
        exitCode: 0,
        output: [CLIFormatter.formatText(`Found ${domains.length} domain(s)`, "success"), "", table].join("\n")
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        exitCode: 1,
        output: CLIFormatter.formatText(`Failed to list domains: ${message}`, "error")
      };
    }
  }

  /**
   * List administrations - Shows accessible administrations
   */
  async listAdministrations(): Promise<CommandResult> {
    try {
      const result = await this.client.listAdministrations();

      if (!result.ok || !Array.isArray(result.data)) {
        return {
          exitCode: 1,
          output: CLIFormatter.formatText("Failed to list administrations", "error")
        };
      }

      const admins = result.data as Array<{ administrationId?: string; name?: string }>;

      if (this.ctx.format === "json") {
        return {
          exitCode: 0,
          output: CLIFormatter.formatJSON({
            count: admins.length,
            administrations: admins,
            timestamp: new Date().toISOString()
          })
        };
      }

      if (this.ctx.format === "csv") {
        const rows = admins.map((a) => ({ id: a.administrationId || "", name: a.name || "" }));
        return {
          exitCode: 0,
          output: CLIFormatter.formatCSV(["id", "name"], rows)
        };
      }

      const rows = admins.map((a) => ({ id: a.administrationId || "", name: a.name || "" }));
      const table = CLIFormatter.formatTable(["id", "name"], rows);

      return {
        exitCode: 0,
        output: [CLIFormatter.formatText(`Found ${admins.length} administration(s)`, "success"), "", table].join("\n")
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        exitCode: 1,
        output: CLIFormatter.formatText(`Failed to list administrations: ${message}`, "error")
      };
    }
  }

  /**
   * Comprehensive setup validation
   */
  async validateSetup(): Promise<CommandResult> {
    const checks: Record<string, { status: "pass" | "fail" | "warn"; message: string; duration?: number }> = {};

    // Check 1: Configuration
    try {
      const configResult = await this.validateConfig();
      checks.configuration = {
        status: configResult.exitCode === 0 ? "pass" : "fail",
        message: "Configuration validation"
      };
    } catch (error) {
      checks.configuration = {
        status: "fail",
        message: String(error)
      };
    }

    // Check 2: Health
    try {
      const start = Date.now();
      const healthResult = await this.health();
      const duration = Date.now() - start;
      checks.connectivity = {
        status: healthResult.exitCode === 0 ? "pass" : "fail",
        message: "Yuki API connectivity",
        duration
      };
    } catch (error) {
      checks.connectivity = {
        status: "fail",
        message: String(error)
      };
    }

    // Check 3: Domains accessible
    try {
      const start = Date.now();
      const domainsResult = await this.listDomains();
      const duration = Date.now() - start;
      checks.domains = {
        status: domainsResult.exitCode === 0 ? "pass" : "warn",
        message: "Domain enumeration",
        duration
      };
    } catch (error) {
      checks.domains = {
        status: "warn",
        message: String(error)
      };
    }

    // Check 4: Administrations accessible
    try {
      const start = Date.now();
      const adminsResult = await this.listAdministrations();
      const duration = Date.now() - start;
      checks.administrations = {
        status: adminsResult.exitCode === 0 ? "pass" : "warn",
        message: "Administration enumeration",
        duration
      };
    } catch (error) {
      checks.administrations = {
        status: "warn",
        message: String(error)
      };
    }

    const passCount = Object.values(checks).filter((c) => c.status === "pass").length;
    const failCount = Object.values(checks).filter((c) => c.status === "fail").length;
    const warnCount = Object.values(checks).filter((c) => c.status === "warn").length;
    const totalChecks = Object.keys(checks).length;

    const overallStatus = failCount > 0 ? "error" : warnCount > 0 ? "warning" : "ok";
    const exitCode = failCount > 0 ? 1 : 0;

    if (this.ctx.format === "json") {
      return {
        exitCode,
        output: CLIFormatter.formatJSON({
          summary: {
            total: totalChecks,
            passed: passCount,
            failed: failCount,
            warned: warnCount,
            status: overallStatus
          },
          checks,
          timestamp: new Date().toISOString()
        })
      };
    }

    const checkLines = Object.entries(checks).map(([name, check]) => {
      const statusSymbol = check.status === "pass" ? "✓" : check.status === "fail" ? "✗" : "⚠";
      const duration = check.duration ? ` (${CLIFormatter.formatDuration(check.duration)})` : "";
      return `  ${statusSymbol} ${name}: ${check.message}${duration}`;
    });

    const output = [
      CLIFormatter.formatText("Setup Validation Report", "info"),
      "",
      ...checkLines,
      "",
      `Summary: ${passCount} passed, ${failCount} failed, ${warnCount} warned (${totalChecks} total)`,
      CLIFormatter.formatStatus(overallStatus, `Setup validation ${overallStatus}`)
    ];

    return {
      exitCode,
      output: output.join("\n")
    };
  }

  /**
   * Version information
   */
  async version(): Promise<CommandResult> {
    const pkg = await import("../../package.json", { with: { type: "json" } }).catch(() => ({
      default: { version: "0.1.0" }
    }));
    const version = pkg.default?.version ?? "0.1.0";

    const output = this.ctx.format === "json"
      ? CLIFormatter.formatJSON({ version, name: "openclaw-yuki" })
      : `OpenClaw Yuki v${version}`;

    return { exitCode: 0, output };
  }

  /**
   * Help text
   */
  help(): CommandResult {
    const help = `
OpenClaw Yuki Plugin - CLI Diagnostics

USAGE
  yuki-cli <command> [options]

COMMANDS
  health                  Test connectivity and authentication to Yuki
  validate-config         Check plugin configuration setup
  list-domains            Show accessible domains
  list-administrations    Show accessible administrations
  validate-setup          Comprehensive setup validation (all checks)
  version                 Show plugin version
  help                    Show this help text

OPTIONS
  --verbose, -v          Enable verbose output
  --format <fmt>         Output format: text, json, table, csv (default: text)
  --config <path>        Path to config file (optional)

EXAMPLES
  yuki-cli health
  yuki-cli validate-setup --format json
  yuki-cli list-administrations --format table
  yuki-cli health --verbose

For more information, see: https://github.com/tokaio-public/yuki-openclaw-plugin
    `.trim();

    return { exitCode: 0, output: help };
  }
}

/**
 * Parse CLI arguments and execute command
 */
export async function executeCLICommand(args: string[], config?: Record<string, unknown>): Promise<CommandResult> {
  const [command, ...restArgs] = args;
  const formatArg = restArgs.find((arg, i) => restArgs[i - 1] === "--format")?.toLowerCase();
  const format: CommandContext["format"] =
    formatArg === "json" || formatArg === "table" || formatArg === "csv" || formatArg === "text"
      ? formatArg
      : "text";

  const ctx: CommandContext = {
    verbose: restArgs.includes("--verbose") || restArgs.includes("-v"),
    format,
    ...(config !== undefined ? { config } : {})
  };

  const commands = new CLICommands(ctx);

  switch (command?.toLowerCase()) {
    case "health":
      return await commands.health();
    case "validate-config":
      return await commands.validateConfig();
    case "list-domains":
      return await commands.listDomains();
    case "list-administrations":
      return await commands.listAdministrations();
    case "validate-setup":
      return await commands.validateSetup();
    case "version":
      return await commands.version();
    case "help":
    case "--help":
    case "-h":
      return commands.help();
    default:
      if (!command) {
        return commands.help();
      }
      return {
        exitCode: 1,
        output: `Unknown command: ${command}\n\nRun 'yuki-cli help' for usage information.`
      };
  }
}
