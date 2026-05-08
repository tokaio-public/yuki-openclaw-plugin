import type { TSchema } from "@sinclair/typebox";

export interface OpenClawToolResult {
  content: Array<{ type: "text"; text: string }>;
}

export interface OpenClawToolRegistration {
  name: string;
  description: string;
  parameters: TSchema;
  execute: (toolCallId: string, params: any) => Promise<OpenClawToolResult>;
}

export interface OpenClawPluginApi {
  pluginConfig: Record<string, unknown>;
  registerTool: (tool: OpenClawToolRegistration) => void;
}

export interface OpenClawPluginEntry {
  id: string;
  name: string;
  description?: string;
  register: (api: OpenClawPluginApi) => void;
}

export function definePluginEntry(entry: OpenClawPluginEntry): OpenClawPluginEntry {
  return entry;
}
