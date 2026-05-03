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
		version: "3.2.4",
	});

	async init() {
		registerFinmapTools(this.server);
	}
}

type Env = object;

const apiAllowHeaders = "Content-Type, Accept, Authorization";
const mcpAllowHeaders =
	"Content-Type, Accept, Authorization, mcp-session-id, mcp-protocol-version, last-event-id";
const mcpExposeHeaders = "Content-Type, Authorization, mcp-session-id, mcp-protocol-version";

const serverPromise = FinmapMcpServer.serve("/", {
	corsOptions: {
		origin: "*",
		methods: "GET, POST, DELETE, OPTIONS",
		headers: mcpAllowHeaders,
		maxAge: 86400,
		exposeHeaders: mcpExposeHeaders,
	},
});

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		// Handle CORS preflight requests for REST API endpoints
		if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
			return new Response(null, {
				status: 200,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
					"Access-Control-Allow-Headers": apiAllowHeaders,
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
			const server = await serverPromise;
			const response = await server.fetch(request, env, ctx);

			return response;
		}

		return new Response("Not found", { status: 404 });
	},
};
