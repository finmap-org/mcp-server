#!/usr/bin/env node
import { registerFinmapTools } from "./core.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
	name: "finmap-mcp",
	version: "1.4.0",
});

registerFinmapTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
