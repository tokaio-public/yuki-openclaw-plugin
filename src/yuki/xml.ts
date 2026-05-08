function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    return xmlEscape(value);
  }
  return xmlEscape(JSON.stringify(value));
}

export function buildSoapEnvelope(method: string, args: Record<string, unknown>): string {
  const params = Object.entries(args)
    .map(([key, value]) => `<${key}>${renderValue(value)}</${key}>`)
    .join("");

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    ' xmlns:xsd="http://www.w3.org/2001/XMLSchema"',
    ' xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">',
    "<soap:Body>",
    `<${method} xmlns="http://www.theyukicompany.com/">${params}</${method}>`,
    "</soap:Body>",
    "</soap:Envelope>"
  ].join("");
}
