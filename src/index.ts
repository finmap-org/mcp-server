import { registerFinmapTools } from "./core.js";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class FinmapMcpServer extends McpAgent {
	server = new McpServer({
		name: "finmap-mcp",
		version: "1.1.0",
	});

	async init() {
		registerFinmapTools(this.server);
	}
}

type Env = {};

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		// Handle CORS preflight requests
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 200,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
					"Access-Control-Allow-Headers":
						"Content-Type, Authorization, mcp-session-id",
					"Access-Control-Max-Age": "86400",
				},
			});
		}

		if (url.pathname === "/") {
			const response = await FinmapMcpServer.serve("/").fetch(
				request,
				env,
				ctx,
			);

			// Add CORS headers to response
			const newHeaders = new Headers(response.headers);
			newHeaders.set("Access-Control-Allow-Origin", "*");
			newHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
			newHeaders.set(
				"Access-Control-Allow-Headers",
				"Content-Type, Authorization, mcp-session-id",
			);
			newHeaders.set("Access-Control-Expose-Headers", "Mcp-Session-Id");

			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: newHeaders,
			});
		}

		return new Response("Not found", { status: 404 });
	},
};
