/**
 * CLI Entry Point - Standalone executable for OpenClaw Yuki diagnostics
 * Can be invoked as: npx yuki-cli <command> [options]
 * Or programmatically: import { CLICommands } from './cli/commands'
 */

import { executeCLICommand } from "./commands.js";
import { loadYukiConfig } from "../config.js";

/**
 * Main CLI entry point for Node.js execution
 */
export async function runCLI(): Promise<void> {
  // Skip first two args (node + script path)
  const args = process.argv.slice(2);

  // Load config from environment
  let config: Record<string, unknown> = {};
  try {
    config = loadYukiConfig({});
  } catch (error) {
    // Config loading may fail if env vars not set, but CLI should still work
    if (process.argv.includes("--verbose")) {
      console.warn("Warning: Could not load config from environment");
    }
  }

  const result = await executeCLICommand(args, config as any);

  // Output result
  console.log(result.output);

  // Exit with appropriate code
  process.exit(result.exitCode);
}

// Execute if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runCLI().catch((error) => {
    console.error("Fatal error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

export { CLICommands, executeCLICommand, type CommandContext, type CommandResult } from "./commands.js";
export { CLIFormatter, type OutputFormat } from "./formatter.js";
