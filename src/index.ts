import { registerFinmapTools } from "./core.js";
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
	companyProfileSchema,
	getApiOpenApiSpec,
	getCompanyProfile,
	getMarketOverview,
	getSectorsOverview,
	getStockData,
	listExchanges,
	listSectors,
	listTickers,
	marketOverviewSchema,
	rankStocks,
	rankStocksSchema,
	searchCompanies,
	searchCompaniesSchema,
	sectorsOverviewSchema,
	stockDataSchema,
	listSectorsSchema,
	listTickersSchema,
} from "./api.js";

export class FinmapMcpServer extends McpAgent {
	server = new McpServer({
		name: "finmap-mcp",
		version: "3.0.0",
	});

	async init() {
		registerFinmapTools(this.server);
	}
}

type Env = object;

const serverPromise = FinmapMcpServer.serve("/");

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

		if (url.pathname === "/api/openapi.json") {
			return Response.json(getApiOpenApiSpec(url.origin), {
				headers: { "Access-Control-Allow-Origin": "*" },
			});
		}

		if (url.pathname.startsWith("/api/")) {
			const method = request.method.toUpperCase();
			const parseBody = async () => request.json().catch(() => ({}));
			try {
				if (url.pathname === "/api/list-exchanges" && method === "GET") {
					return Response.json(listExchanges(), {
						headers: { "Access-Control-Allow-Origin": "*" },
					});
				}
				if (url.pathname === "/api/list-sectors" && method === "POST") {
					const input = listSectorsSchema.parse(await parseBody());
					return Response.json(await listSectors(input), {
						headers: { "Access-Control-Allow-Origin": "*" },
					});
				}
				if (url.pathname === "/api/list-sector-companies" && method === "POST") {
					const input = listTickersSchema.parse(await parseBody());
					return Response.json(await listTickers(input), {
						headers: { "Access-Control-Allow-Origin": "*" },
					});
				}
				if (url.pathname === "/api/search-companies" && method === "POST") {
					const input = searchCompaniesSchema.parse(await parseBody());
					return Response.json(await searchCompanies(input), {
						headers: { "Access-Control-Allow-Origin": "*" },
					});
				}
				if (url.pathname === "/api/market-overview" && method === "POST") {
					const input = marketOverviewSchema.parse(await parseBody());
					return Response.json(await getMarketOverview(input), {
						headers: { "Access-Control-Allow-Origin": "*" },
					});
				}
				if (url.pathname === "/api/sector-performance" && method === "POST") {
					const input = sectorsOverviewSchema.parse(await parseBody());
					return Response.json(await getSectorsOverview(input), {
						headers: { "Access-Control-Allow-Origin": "*" },
					});
				}
				if (url.pathname === "/api/rank-stocks" && method === "POST") {
					const input = rankStocksSchema.parse(await parseBody());
					return Response.json(await rankStocks(input), {
						headers: { "Access-Control-Allow-Origin": "*" },
					});
				}
				if (url.pathname === "/api/stock-snapshot" && method === "POST") {
					const input = stockDataSchema.parse(await parseBody());
					return Response.json(await getStockData(input), {
						headers: { "Access-Control-Allow-Origin": "*" },
					});
				}
				if (url.pathname === "/api/company-profile" && method === "POST") {
					const input = companyProfileSchema.parse(await parseBody());
					return Response.json(await getCompanyProfile(input), {
						headers: { "Access-Control-Allow-Origin": "*" },
					});
				}
				return Response.json(
					{ error: "Not found" },
					{ status: 404, headers: { "Access-Control-Allow-Origin": "*" } },
				);
			} catch (error) {
				return Response.json(
					{ error: error instanceof Error ? error.message : String(error) },
					{ status: 400, headers: { "Access-Control-Allow-Origin": "*" } },
				);
			}
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
							const handleAbort = () => {
								try {
									writer.close();
								} catch (_e) {
									// Ignore errors from closing the stream
								}
							};
							request.signal.addEventListener("abort", handleAbort);

							// Keep connection alive and allow server to send events
							while (!request.signal.aborted) {
								await new Promise((resolve) => setTimeout(resolve, 20000));
								try {
									await writer.write(encoder.encode(":\n\n")); // Keep-alive ping
								} catch (_e) {
									break; // Client disconnected
								}
							}

							request.signal.removeEventListener("abort", handleAbort);
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

			const server = await serverPromise;
			const response = await server.fetch(request, env, ctx);

			// Add CORS headers to response
			const newHeaders = new Headers(response.headers);
			newHeaders.set("Access-Control-Allow-Origin", "*");
			newHeaders.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
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
