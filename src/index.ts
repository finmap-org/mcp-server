import { registerFinmapTools } from "./core.js";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export class FinmapMcpServer extends McpAgent {
	server = new McpServer({
		name: "finmap-mcp",
		version: "1.2.1",
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
					"Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
					"Access-Control-Allow-Headers":
						"Content-Type, Accept, Authorization, mcp-session-id, mcp-protocol-version, Last-Event-ID",
					"Access-Control-Max-Age": "86400",
				},
			});
		}

		if (url.pathname === "/") {
			// Handle GET requests for SSE stream
			if (request.method === "GET") {
				const acceptHeader = request.headers.get("Accept");
				if (acceptHeader?.includes("text/event-stream")) {
					// Create a transform stream to handle SSE events
					const { readable, writable } = new TransformStream();
					const writer = writable.getWriter();
					const encoder = new TextEncoder();

					// Handle server side event stream
					ctx.waitUntil(
						(async () => {
							const server = await FinmapMcpServer.serve("/");

							// Keep connection alive and allow server to send events
							while (true) {
								await new Promise((resolve) => setTimeout(resolve, 1000));
								try {
									await writer.write(encoder.encode(":\n\n")); // Keep-alive ping
								} catch (e) {
									break; // Client disconnected
								}
							}
						})(),
					);

					return new Response(readable, {
						headers: {
							"Content-Type": "text/event-stream",
							"Cache-Control": "no-cache",
							Connection: "keep-alive",
							"Access-Control-Allow-Origin": "*",
							"Access-Control-Expose-Headers":
								"Content-Type, Authorization, Mcp-Session-Id, mcp-protocol-version",
						},
					});
				}

				// If Accept header doesn't include text/event-stream, return 405
				return new Response(
					JSON.stringify({
						jsonrpc: "2.0",
						error: {
							code: -32000,
							message: "Method not allowed",
						},
						id: null,
					}),
					{
						status: 405,
						headers: {
							"Content-Type": "application/json",
							"Access-Control-Allow-Origin": "*",
						},
					},
				);
			}

			const response = await FinmapMcpServer.serve("/").fetch(
				request,
				env,
				ctx,
			);

			// Add CORS headers to response
			const newHeaders = new Headers(response.headers);
			newHeaders.set("Access-Control-Allow-Origin", "*");
			newHeaders.set(
				"Access-Control-Allow-Methods",
				"GET, POST, DELETE, OPTIONS",
			);
			newHeaders.set(
				"Access-Control-Allow-Headers",
				"Content-Type, Accept, Authorization, mcp-session-id, mcp-protocol-version, Last-Event-ID",
			);
			newHeaders.set(
				"Access-Control-Expose-Headers",
				"Content-Type, Authorization, Mcp-Session-Id, mcp-protocol-version",
			);

			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: newHeaders,
			});
		}

		return new Response("Not found", { status: 404 });
	},
};
