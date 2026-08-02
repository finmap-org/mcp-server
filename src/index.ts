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
		version: "3.3.2",
	});

	async init() {
		registerFinmapTools(this.server);
	}
}

type Env = object;

const mcpAllowHeaders =
	"Content-Type, Accept, Authorization, mcp-session-id, mcp-protocol-version, last-event-id, X-Requested-With";
const mcpExposeHeaders =
	"Content-Type, Authorization, mcp-session-id, mcp-protocol-version, Location";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
	"Access-Control-Allow-Headers": mcpAllowHeaders,
	"Access-Control-Expose-Headers": mcpExposeHeaders,
	"Access-Control-Max-Age": "86400",
};

const serverPromise = FinmapMcpServer.serve("/", {
	corsOptions: {
		origin: "*",
		methods: "GET, POST, PUT, DELETE, OPTIONS, HEAD",
		headers: mcpAllowHeaders,
		maxAge: 86400,
		exposeHeaders: mcpExposeHeaders,
	},
});

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		// Handle global CORS preflight requests for all endpoints
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: corsHeaders,
			});
		}

		// Handle OAuth discovery and registration endpoints with explicit 404 + CORS headers
		if (
			url.pathname.startsWith("/.well-known/") ||
			url.pathname === "/register"
		) {
			return Response.json(
				{ error: "OAuth authentication not required" },
				{ status: 404, headers: corsHeaders },
			);
		}

		if (url.pathname === "/api/openapi.json") {
			return Response.json(getApiOpenApiSpec(url.origin), {
				headers: corsHeaders,
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

		return new Response("Not found", { status: 404, headers: corsHeaders });
	},
};
