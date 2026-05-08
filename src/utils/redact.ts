const REDACTION_TOKEN = "[REDACTED]";

const SECRET_PATTERNS: RegExp[] = [
  /([A-Za-z0-9]{5,}-){2,}[A-Za-z0-9]{3,}/g, // Hyphenated tokens (old pattern)
  /\b(sessionid|accesskey|apikey|token|password)\b\s*[:=]\s*[^\s<\"']+/gi, // Key=value secrets
  /\b[A-Z]{2}\d{2}[A-Z0-9]{8,30}\b/g, // IBAN numbers
  /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g // UUID/GUID session IDs
];

export function redactText(input: string): string {
  let out = input;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, REDACTION_TOKEN);
  }
  return out;
}

export function redactObject<T>(value: T): T {
  const serialized = JSON.stringify(value);
  if (!serialized) {
    return value;
  }
  return JSON.parse(redactText(serialized)) as T;
}

export function hashForAudit(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `fnv32:${(hash >>> 0).toString(16)}`;
}
