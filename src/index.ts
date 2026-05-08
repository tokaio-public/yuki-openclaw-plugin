import { definePluginEntry } from "./types/openclaw-plugin-sdk.js";
import { registerTools } from "./tools/index.js";

export default definePluginEntry({
  id: "openclaw-yuki",
  name: "OpenClaw Yuki",
  description: "Secure Yuki SOAP tools for accounting workflows",
  register(api) {
    registerTools(api);
  }
});
