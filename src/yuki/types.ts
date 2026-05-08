export type YukiCountry = "be" | "nl";

export type LogLevel = "error" | "warn" | "info" | "debug";

export interface YukiConfig {
  accessKey: string;
  country: YukiCountry;
  defaultDomainId?: number;
  defaultAdministrationId?: number;
  requestTimeoutMs: number;
  maxCallsPerMinute: number;
  maxCallsPerDay: number;
  writeOperationsEnabled: boolean;
  defaultDryRun: boolean;
  logLevel: LogLevel;
  includeRawResponses: boolean;
  allowSensitiveDebugLogging: boolean;
}

export interface YukiSession {
  sessionId: string;
  expiresAtEpochMs: number;
}

export interface YukiSoapCallOptions {
  service: string;
  method: string;
  args: Record<string, unknown>;
  timeoutMs?: number;
}

export interface YukiResponseEnvelope<T = unknown> {
  ok: boolean;
  service: string;
  method: string;
  requestId: string;
  administrationId?: string;
  domainId?: string;
  data?: T;
  warnings: string[];
  rawIncluded: boolean;
  apiCallsUsedEstimate: number;
}

export interface YukiErrorEnvelope {
  ok: false;
  service: string;
  method: string;
  errorCode: string;
  message: string;
  recoverable: boolean;
  nextSteps: string[];
}

export interface YukiDomain {
  id: number;
  name?: string;
  raw?: unknown;
}

export interface YukiAdministration {
  id: number;
  name?: string;
  internalCustomerCode?: string;
  raw?: unknown;
}
