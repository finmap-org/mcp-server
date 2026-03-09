import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
	companyProfileSchema,
	getCompanyProfile,
	getMarketOverview,
	getSectorsOverview,
	getStockData,
	listExchanges,
	listSectors,
	listSectorsSchema,
	listTickers,
	listTickersSchema,
	marketOverviewSchema,
	rankStocks,
	rankStocksSchema,
	searchCompanies,
	searchCompaniesSchema,
	sectorsOverviewSchema,
	stockDataSchema,
} from "./api.js";

function createResponse(data: unknown) {
	return {
		content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
	};
}

function createErrorResponse(error: unknown) {
	return createResponse(
		`ERROR: ${error instanceof Error ? error.message : String(error)}`,
	);
}

export function registerFinmapTools(server: McpServer) {
	server.registerTool(
		"list_supported_exchanges",
		{
			title: "List supported stock exchanges",
			description:
				"Return metadata for all supported stock exchanges in the Finmap dataset, including exchange ID, exchange name, country, currency, earliest available historical data date, and update frequency.",
			inputSchema: {},
		},
		async () => {
			try {
				return createResponse(listExchanges());
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);

	server.registerTool(
		"list_exchange_sectors",
		{
			title: "List sectors for a stock exchange",
			description:
				"Return all business sectors available on a specific exchange and trading date. Each sector includes the number of companies in that sector.",
			inputSchema: listSectorsSchema.shape,
		},
		async (input) => {
			try {
				return createResponse(
					await listSectors(listSectorsSchema.parse(input)),
				);
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);

	server.registerTool(
		"list_sector_companies",
		{
			title: "List companies by sector",
			description:
				"Return company tickers and names grouped by sector for an exchange on a specific trading date. Optionally filter results by a single sector.",
			inputSchema: listTickersSchema.shape,
		},
		async (input) => {
			try {
				return createResponse(
					await listTickers(listTickersSchema.parse(input)),
				);
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);

	server.registerTool(
		"search_exchange_companies",
		{
			title: "Search companies by name or ticker",
			description:
				"Search for companies on a specific exchange by partial ticker symbol or company name. Results are ranked by relevance using ticker and name similarity.",
			inputSchema: searchCompaniesSchema.shape,
		},
		async (input) => {
			try {
				return createResponse(
					await searchCompanies(searchCompaniesSchema.parse(input)),
				);
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);

	server.registerTool(
		"analyze_market_overview",
		{
			title: "Analyze market overview",
			description:
				"Return aggregated statistics for a stock exchange on a specific date, including total market capitalization, trading volume, total traded value, number of trades, and sector-level market breakdown.",
			inputSchema: marketOverviewSchema.shape,
		},
		async (input) => {
			try {
				return createResponse(
					await getMarketOverview(marketOverviewSchema.parse(input)),
				);
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);

	server.registerTool(
		"analyze_sector_performance",
		{
			title: "Analyze sector performance",
			description:
				"Return aggregated metrics for each sector in a stock exchange, including sector market capitalization, price change percentage, trading volume, traded value, number of trades, and number of companies in the sector. Optionally filter for a single sector.",
			inputSchema: sectorsOverviewSchema.shape,
		},
		async (input) => {
			try {
				return createResponse(
					await getSectorsOverview(sectorsOverviewSchema.parse(input)),
				);
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);

	server.registerTool(
		"get_stock_snapshot",
		{
			title: "Get stock market snapshot",
			description:
				"Return detailed trading metrics for a single stock ticker on a specific exchange and trading date, including price open, last sale price, price change percentage, trading volume, traded value, number of trades, and market capitalization.",
			inputSchema: stockDataSchema.shape,
		},
		async (input) => {
			try {
				return createResponse(await getStockData(stockDataSchema.parse(input)));
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);

	server.registerTool(
		"rank_exchange_companies",
		{
			title: "Rank companies by market metric",
			description:
				"Return companies ranked by a selected market metric on a specific exchange and date. Supported metrics: market capitalization, price change percentage, trading volume, traded value, and number of trades. Results can be limited and optionally filtered by sector.",
			inputSchema: rankStocksSchema.shape,
		},
		async (input) => {
			try {
				return createResponse(await rankStocks(rankStocksSchema.parse(input)));
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);

	server.registerTool(
		"get_company_profile_us",
		{
			title: "Get US company profile",
			description:
				"Return business description and background information for a US-listed company by ticker. Supported exchanges: NASDAQ, NYSE, and AMEX.",
			inputSchema: companyProfileSchema.shape,
		},
		async (input) => {
			try {
				return createResponse(
					await getCompanyProfile(companyProfileSchema.parse(input)),
				);
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);
}
