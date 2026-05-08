import type { OpenClawPluginApi } from "../types/openclaw-plugin-sdk.js";
import { YukiClient } from "../yuki/client.js";
import { buildReadTools } from "./readTools.js";
import { buildWriteTools } from "./writeTools.js";

export function registerTools(api: OpenClawPluginApi): void {
  let client: YukiClient | undefined;

  const getClient = (): YukiClient => {
    if (!client) {
      client = new YukiClient(api.pluginConfig);
    }
    return client;
  };

  for (const tool of [...buildReadTools(getClient), ...buildWriteTools(getClient)]) {
    api.registerTool(tool);
  }
}
