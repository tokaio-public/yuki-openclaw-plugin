import { YukiConfigError } from "./yuki/errors.js";
import type { YukiConfig, YukiCountry } from "./yuki/types.js";
import { asBoolean, asPositiveInt, ensureRequiredString } from "./utils/validation.js";

interface PluginConfigInput {
  accessKey?: unknown;
  country?: unknown;
  defaultDomainId?: unknown;
  defaultAdministrationId?: unknown;
  requestTimeoutMs?: unknown;
  maxCallsPerMinute?: unknown;
  maxCallsPerDay?: unknown;
  writeOperationsEnabled?: unknown;
  defaultDryRun?: unknown;
  logLevel?: unknown;
  includeRawResponses?: unknown;
  allowSensitiveDebugLogging?: unknown;
}

function parseCountry(value: unknown): YukiCountry {
  const normalized = typeof value === "string" ? value.toLowerCase().trim() : "";
  if (normalized === "be" || normalized === "nl") {
    return normalized;
  }
  return "be";
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new YukiConfigError("Optional numeric config values must be positive integers.");
  }
  return num;
}

export function loadYukiConfig(pluginConfig: PluginConfigInput = {}): YukiConfig {
  const accessKey = ensureRequiredString(
    "YUKI_ACCESS_KEY",
    pluginConfig.accessKey ?? process.env.YUKI_ACCESS_KEY
  );

  const country = parseCountry(pluginConfig.country ?? process.env.YUKI_COUNTRY);

  const logLevel = (pluginConfig.logLevel ?? process.env.YUKI_LOG_LEVEL ?? "info").toString() as
    | "error"
    | "warn"
    | "info"
    | "debug";

  if (!["error", "warn", "info", "debug"].includes(logLevel)) {
    throw new YukiConfigError("YUKI_LOG_LEVEL must be one of: error, warn, info, debug.");
  }

  return {
    accessKey,
    country,
    defaultDomainId: parseOptionalNumber(pluginConfig.defaultDomainId ?? process.env.YUKI_DEFAULT_DOMAIN_ID),
    defaultAdministrationId: parseOptionalNumber(
      pluginConfig.defaultAdministrationId ?? process.env.YUKI_DEFAULT_ADMINISTRATION_ID
    ),
    requestTimeoutMs: asPositiveInt(
      "YUKI_REQUEST_TIMEOUT_MS",
      pluginConfig.requestTimeoutMs ?? process.env.YUKI_REQUEST_TIMEOUT_MS,
      15_000
    ),
    maxCallsPerMinute: asPositiveInt(
      "YUKI_MAX_CALLS_PER_MINUTE",
      pluginConfig.maxCallsPerMinute ?? process.env.YUKI_MAX_CALLS_PER_MINUTE,
      120
    ),
    maxCallsPerDay: asPositiveInt(
      "YUKI_MAX_CALLS_PER_DAY",
      pluginConfig.maxCallsPerDay ?? process.env.YUKI_MAX_CALLS_PER_DAY,
      900
    ),
    writeOperationsEnabled: asBoolean(
      pluginConfig.writeOperationsEnabled ?? process.env.YUKI_WRITE_OPERATIONS_ENABLED,
      false
    ),
    defaultDryRun: asBoolean(pluginConfig.defaultDryRun ?? process.env.YUKI_DEFAULT_DRY_RUN, true),
    logLevel,
    includeRawResponses: asBoolean(
      pluginConfig.includeRawResponses ?? process.env.YUKI_INCLUDE_RAW_RESPONSES,
      false
    ),
    allowSensitiveDebugLogging: asBoolean(
      pluginConfig.allowSensitiveDebugLogging ?? process.env.YUKI_ALLOW_SENSITIVE_DEBUG_LOGGING,
      false
    )
  };
}

export function serviceBaseUrl(country: YukiCountry): string {
  return `https://api.yukiworks.${country}/ws`;
}
