import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { captureForAI } from "./captureForAI.js";
import { OVERLAY_SELECTORS } from "./utils/cleanPage.js";

const server = new McpServer({
  name: "vision-mcp",
  version: "1.0.0",
});

// Tool 1: capture_clean_view
server.registerTool(
  "capture_clean_view",
  {
    description: "Captures a clean, noise-free screenshot for AI Vision analysis.",
    inputSchema: z.object({
      url: z.string().describe("The URL to capture"),
      fullPage: z.boolean().default(false).describe("Capture the entire scrollable page")
    })
  },
  async ({ url, fullPage }) => {
    try {
      const result = await captureForAI({ url, fullPage, skipClean: false });

      return {
        content: [
          { 
            type: "text", 
            text: `Capture successful: ${result.pageTitle || url}\nDimensions: ${result.width}x${result.height}\nTime taken: ${result.captureTimeMs}ms` 
          },
          { 
            type: "image", 
            data: result.buffer.toString('base64'), 
            mimeType: "image/jpeg" 
          }
        ]
      };
    } catch (error: any) {
      console.error(`Error capturing ${url}:`, error);
      return {
        isError: true,
        content: [
          { type: "text", text: `Capture failed: ${error.message}` }
        ]
      };
    }
  }
);

// Tool 2: list_clean_selectors
server.registerTool(
  "list_clean_selectors",
  {
    description: "Returns the CSS selectors used by the Janitor script to clean overlays.",
    inputSchema: z.object({}) // No inputs required
  },
  async () => {
    return {
      content: [
        { 
          type: "text", 
          text: `Overlay Selectors used for cleanup:\n\n${OVERLAY_SELECTORS.join('\n')}` 
        }
      ]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr because stdout is used for MCP protocol
  console.error("[vision-mcp] ready (stdio)");
}

main().catch((error) => {
  console.error("Fatal error running MCP server:", error);
  process.exit(1);
});
