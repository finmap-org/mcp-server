import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const BASE_URL = "https://finmap.org";
const DATA_BASE_URL = "https://raw.githubusercontent.com/finmap-org";

const INFO = {
	provider: "finmap.org",
	description:
		"Discover interactive stock charts and curated news at finmap.org",
	github: "https://github.com/finmap-org",
	donate: {
		patreon: "https://patreon.com/finmap",
		boosty: "https://boosty.to/finmap",
	},
	issues: "https://github.com/finmap-org/mcp-server/issues",
	feedback: "contact@finmap.org",
};

const STOCK_EXCHANGES = [
	"amex",
	"nasdaq",
	"nyse",
	"us-all",
	"lse",
	"moex",
	"bist",
] as const;
const US_EXCHANGES = ["amex", "nasdaq", "nyse"] as const;
const SORT_FIELDS = [
	"priceChangePct",
	"marketCap",
	"value",
	"volume",
	"numTrades",
] as const;
const SORT_ORDERS = ["asc", "desc"] as const;

type StockExchange = (typeof STOCK_EXCHANGES)[number];
type USExchange = (typeof US_EXCHANGES)[number];
type SortField = (typeof SORT_FIELDS)[number];
type SortOrder = (typeof SORT_ORDERS)[number];

const INDICES = {
	EXCHANGE: 0,
	COUNTRY: 1,
	TYPE: 2,
	SECTOR: 3,
	INDUSTRY: 4,
	CURRENCY_ID: 5,
	TICKER: 6,
	NAME_ENG: 7,
	NAME_ENG_SHORT: 8,
	NAME_ORIGINAL: 9,
	NAME_ORIGINAL_SHORT: 10,
	PRICE_OPEN: 11,
	PRICE_LAST_SALE: 12,
	PRICE_CHANGE_PCT: 13,
	VOLUME: 14,
	VALUE: 15,
	NUM_TRADES: 16,
	MARKET_CAP: 17,
	LISTED_FROM: 18,
	LISTED_TILL: 19,
	WIKI_PAGE_ID_ENG: 20,
	WIKI_PAGE_ID_ORIGINAL: 21,
	ITEMS_PER_SECTOR: 22,
} as const;

const EXCHANGE_TO_COUNTRY_MAP: Record<StockExchange, string> = {
	amex: "us",
	nasdaq: "us",
	nyse: "us",
	"us-all": "us",
	lse: "uk",
	moex: "russia",
	bist: "turkey",
};

function createResponse(data: any) {
	return {
		content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
	};
}

function createErrorResponse(error: unknown) {
	return createResponse(
		`ERROR: ${error instanceof Error ? error.message : String(error)}`,
	);
}

function createCharts(exchange: string, date?: string) {
	return {
		histogram: `${BASE_URL}/?chartType=histogram&dataType=marketcap&exchange=${exchange}`,
		treemap: `${BASE_URL}/?chartType=treemap&dataType=marketcap&exchange=${exchange}${date ? `&date=${date}` : ""}`,
	};
}

function calculateMatchScore(
	ticker: string,
	name: string,
	searchTerm: string,
): number {
	const tickerLower = ticker.toLowerCase();
	const nameLower = name.toLowerCase();

	if (tickerLower === searchTerm) return 100;
	if (tickerLower.startsWith(searchTerm)) return 90;
	if (tickerLower.includes(searchTerm)) return 80;
	if (nameLower.includes(searchTerm)) return 70;

	return 0;
}

const EXCHANGE_INFO: Record<
	StockExchange,
	{
		name: string;
		country: string;
		currency: string;
		availableSince: string;
		updateFrequency: string;
	}
> = {
	amex: {
		name: "American Stock Exchange",
		country: "United States",
		currency: "USD",
		availableSince: "2024-12-09",
		updateFrequency: "Hourly (weekdays)",
	},
	nasdaq: {
		name: "NASDAQ Stock Market",
		country: "United States",
		currency: "USD",
		availableSince: "2024-12-09",
		updateFrequency: "Hourly (weekdays)",
	},
	nyse: {
		name: "New York Stock Exchange",
		country: "United States",
		currency: "USD",
		availableSince: "2024-12-09",
		updateFrequency: "Hourly (weekdays)",
	},
	"us-all": {
		name: "US Combined (AMEX + NASDAQ + NYSE)",
		country: "United States",
		currency: "USD",
		availableSince: "2024-12-09",
		updateFrequency: "Hourly (weekdays)",
	},
	lse: {
		name: "London Stock Exchange",
		country: "United Kingdom",
		currency: "GBP",
		availableSince: "2025-02-07",
		updateFrequency: "Hourly (weekdays)",
	},
	moex: {
		name: "Moscow Exchange",
		country: "Russia",
		currency: "RUB",
		availableSince: "2011-12-19",
		updateFrequency: "Every 15 minutes (weekdays)",
	},
	bist: {
		name: "Borsa Istanbul",
		country: "Turkey",
		currency: "TRY",
		availableSince: "2015-11-30",
		updateFrequency: "Every two months",
	},
};

const exchangeSchema = z
	.enum(STOCK_EXCHANGES)
	.describe("Stock exchange: amex, nasdaq, nyse, us-all, lse, moex, bist");
const dateSchema = {
	year: z.number().int().min(2012).optional(),
	month: z.number().int().min(1).max(12).optional(),
	day: z.number().int().min(1).max(31).optional(),
};

function buildDateString(year?: number, month?: number, day?: number): string {
	const currentDate = new Date();
	const y = year ?? currentDate.getFullYear();
	const m = month ?? currentDate.getMonth() + 1;
	const d = day ?? currentDate.getDate();
	return `${y.toString()}/${m.toString().padStart(2, "0")}/${d.toString().padStart(2, "0")}`;
}

function validateAndFormatDate(dateString: string): string {
	const date = dateString.replaceAll("/", "-");
	z.string().date().parse(date);

	const dayOfWeek = new Date(date).getDay();
	if (dayOfWeek === 0 || dayOfWeek === 6) {
		throw new Error("Data is only available for work days (Monday to Friday)");
	}

	return date;
}

function getDate(year?: number, month?: number, day?: number): string {
	const dateString = buildDateString(year, month, day);
	return validateAndFormatDate(dateString);
}

async function fetchMarketData(
	stockExchange: StockExchange,
	formattedDate: string,
): Promise<{ securities: { data: any[][] } }> {
	const country = EXCHANGE_TO_COUNTRY_MAP[stockExchange];
	const date = formattedDate.replaceAll("-", "/");
	const url = `${DATA_BASE_URL}/data-${country}/refs/heads/main/marketdata/${date}/${stockExchange}.json`;

	const response = await fetch(url);
	if (response.status === 404) {
		throw new Error(
			`Not found, try another date. The date must be on or after ${EXCHANGE_INFO[stockExchange].availableSince} for ${stockExchange}`,
		);
	}

	return response.json();
}

async function fetchSecurityInfo(
	exchange: USExchange,
	ticker: string,
): Promise<Record<string, any>> {
	const firstLetter = ticker.charAt(0).toUpperCase();
	const url = `${DATA_BASE_URL}/data-us/refs/heads/main/securities/${exchange}/${firstLetter}/${ticker}.json`;

	const response = await fetch(url);
	if (response.status === 404) {
		throw new Error(`Security ${ticker} not found on ${exchange}`);
	}

	const data = (await response.json()) as any;
	return data;
}

export function registerFinmapTools(server: McpServer) {
	server.registerTool(
		"list_exchanges",
		{
			title: "List exchanges",
			description:
				"Return supported exchanges with IDs, names, country, currency, earliest available date, and update frequency.",
			inputSchema: {},
		},
		async () => {
			try {
				const exchanges = Object.entries(EXCHANGE_INFO).map(([id, info]) => ({
					id,
					...info,
				}));
				return createResponse({ info: INFO, exchanges });
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);

	server.registerTool(
		"list_sectors",
		{
			title: "List sectors",
			description:
				"List available business sectors for an exchange on a specific date, including item counts.",
			inputSchema: { stockExchange: exchangeSchema, ...dateSchema },
		},
		async ({
			stockExchange,
			year,
			month,
			day,
		}: {
			stockExchange: StockExchange;
			year?: number;
			month?: number;
			day?: number;
		}) => {
			try {
				const formattedDate = getDate(year, month, day);
				const marketDataResponse = await fetchMarketData(
					stockExchange,
					formattedDate,
				);

				const sectorCounts: Record<string, number> = {};
				marketDataResponse.securities.data.forEach((item: any[]) => {
					if (item[INDICES.TYPE] !== "sector" && item[INDICES.SECTOR]) {
						sectorCounts[item[INDICES.SECTOR]] =
							(sectorCounts[item[INDICES.SECTOR]] || 0) + 1;
					}
				});

				const sectors = Object.entries(sectorCounts).map(([name, count]) => ({
					name,
					itemsPerSector: count,
				}));
				return createResponse({
					info: INFO,
					date: formattedDate,
					exchange: stockExchange.toUpperCase(),
					currency: EXCHANGE_INFO[stockExchange as StockExchange].currency,
					sectors,
				});
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);

	server.registerTool(
		"list_tickers",
		{
			title: "List tickers by sector",
			description:
				"Return company tickers and names for an exchange on a specific date, grouped by sector.",
			inputSchema: {
				stockExchange: exchangeSchema,
				...dateSchema,
				sector: z.string().optional().describe("Filter by specific sector"),
				englishNames: z
					.boolean()
					.default(true)
					.describe("Use English names if available"),
			},
		},
		async ({
			stockExchange,
			year,
			month,
			day,
			sector,
			englishNames,
		}: {
			stockExchange: StockExchange;
			year?: number;
			month?: number;
			day?: number;
			sector?: string;
			englishNames?: boolean;
		}) => {
			try {
				const formattedDate = getDate(year, month, day);
				const marketDataResponse = await fetchMarketData(
					stockExchange,
					formattedDate,
				);

				const sectorGroups: Record<
					string,
					Array<{ ticker: string; name: string }>
				> = {};

				marketDataResponse.securities.data.forEach((item: any[]) => {
					if (
						item[INDICES.TYPE] !== "sector" &&
						item[INDICES.SECTOR] &&
						(!sector || item[INDICES.SECTOR] === sector)
					) {
						const sectorName = item[INDICES.SECTOR];
						const ticker = item[INDICES.TICKER];
						const name = englishNames
							? item[INDICES.NAME_ENG]
							: item[INDICES.NAME_ORIGINAL_SHORT] || item[INDICES.NAME_ENG];

						if (ticker && name) {
							if (!sectorGroups[sectorName]) sectorGroups[sectorName] = [];
							sectorGroups[sectorName].push({ ticker, name });
						}
					}
				});

				Object.values(sectorGroups).forEach((companies) => {
					companies.sort((a, b) => a.ticker.localeCompare(b.ticker));
				});

				return createResponse({
					info: INFO,
					date: formattedDate,
					exchange: stockExchange.toUpperCase(),
					currency: EXCHANGE_INFO[stockExchange as StockExchange].currency,
					sectors: sectorGroups,
				});
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);

	server.registerTool(
		"search_companies",
		{
			title: "Search companies",
			description:
				"Find companies by partial name or ticker on an exchange and return best matches",
			inputSchema: {
				stockExchange: exchangeSchema,
				...dateSchema,
				query: z
					.string()
					.describe("Search term (partial ticker or company name)"),
				limit: z
					.number()
					.int()
					.min(1)
					.max(50)
					.default(10)
					.describe("Maximum results"),
			},
		},
		async ({
			stockExchange,
			year,
			month,
			day,
			query,
			limit,
		}: {
			stockExchange: StockExchange;
			year?: number;
			month?: number;
			day?: number;
			query: string;
			limit?: number;
		}) => {
			try {
				const formattedDate = getDate(year, month, day);
				const marketDataResponse = await fetchMarketData(
					stockExchange,
					formattedDate,
				);
				const searchTerm = query.toLowerCase();

				const matches = marketDataResponse.securities.data
					.filter(
						(item: any[]) =>
							item[INDICES.TYPE] !== "sector" && item[INDICES.SECTOR],
					)
					.map((item: any[]) => ({
						ticker: item[INDICES.TICKER],
						name: item[INDICES.NAME_ENG],
						sector: item[INDICES.SECTOR],
						score: calculateMatchScore(
							item[INDICES.TICKER],
							item[INDICES.NAME_ENG],
							searchTerm,
						),
					}))
					.filter((match) => match.score > 0)
					.sort((a, b) => b.score - a.score)
					.slice(0, limit);

				return createResponse({
					info: INFO,
					date: formattedDate,
					exchange: stockExchange.toUpperCase(),
					currency: EXCHANGE_INFO[stockExchange as StockExchange].currency,
					query,
					matches,
				});
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);

	server.registerTool(
		"get_market_overview",
		{
			title: "Market overview",
			description:
				"Get total market cap, volume, value, and performance for an exchange on a specific date with a sector breakdown.",
			inputSchema: { stockExchange: exchangeSchema, ...dateSchema },
		},
		async ({
			stockExchange,
			year,
			month,
			day,
		}: {
			stockExchange: StockExchange;
			year?: number;
			month?: number;
			day?: number;
		}) => {
			try {
				const formattedDate = getDate(year, month, day);
				const marketDataResponse = await fetchMarketData(
					stockExchange,
					formattedDate,
				);

				const sectorItems = marketDataResponse.securities.data.filter(
					(item: any) => item[INDICES.TYPE] === "sector",
				);

				let marketTotal = {};
				const sectors: any[] = [];

				sectorItems.forEach((item: any) => {
					const sectorData = {
						name: item[INDICES.TICKER],
						marketCap: item[INDICES.MARKET_CAP],
						marketCapChangePct: item[INDICES.PRICE_CHANGE_PCT],
						volume: item[INDICES.VOLUME],
						value: item[INDICES.VALUE],
						numTrades: item[INDICES.NUM_TRADES],
						itemsPerSector: item[INDICES.ITEMS_PER_SECTOR],
					};

					if (item[INDICES.SECTOR] === "") {
						marketTotal = sectorData;
					} else {
						sectors.push(sectorData);
					}
				});

				return createResponse({
					info: INFO,
					charts: createCharts(stockExchange, formattedDate),
					date: formattedDate,
					exchange: stockExchange.toUpperCase(),
					currency: EXCHANGE_INFO[stockExchange as StockExchange].currency,
					marketTotal,
					sectors,
				});
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);

	server.registerTool(
		"get_sectors_overview",
		{
			title: "Sector performance",
			description:
				"Get aggregated performance metrics by sector for an exchange on a specific date.",
			inputSchema: {
				stockExchange: exchangeSchema,
				...dateSchema,
				sector: z
					.string()
					.optional()
					.describe("Get data for specific sector only"),
			},
		},
		async ({
			stockExchange,
			year,
			month,
			day,
			sector,
		}: {
			stockExchange: StockExchange;
			year?: number;
			month?: number;
			day?: number;
			sector?: string;
		}) => {
			try {
				const formattedDate = getDate(year, month, day);
				const marketDataResponse = await fetchMarketData(
					stockExchange,
					formattedDate,
				);

				const sectors = marketDataResponse.securities.data
					.filter(
						(item: any) =>
							item[INDICES.TYPE] === "sector" && item[INDICES.SECTOR] !== "",
					)
					.filter((item: any) => !sector || item[INDICES.TICKER] === sector)
					.map((item: any) => ({
						name: item[INDICES.TICKER],
						marketCap: item[INDICES.MARKET_CAP],
						marketCapChangePct: item[INDICES.PRICE_CHANGE_PCT],
						volume: item[INDICES.VOLUME],
						value: item[INDICES.VALUE],
						numTrades: item[INDICES.NUM_TRADES],
						itemsPerSector: item[INDICES.ITEMS_PER_SECTOR],
					}));

				return createResponse({
					info: INFO,
					charts: createCharts(stockExchange, formattedDate),
					date: formattedDate,
					exchange: stockExchange.toUpperCase(),
					currency: EXCHANGE_INFO[stockExchange as StockExchange].currency,
					sectors,
				});
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);

	server.registerTool(
		"get_stock_data",
		{
			title: "Stock data by ticker",
			description:
				"Get detailed market data for a specific ticker on an exchange and date, including price, change, volume, value, market cap, and trades.",
			inputSchema: {
				stockExchange: exchangeSchema,
				...dateSchema,
				ticker: z.string().describe("Stock ticker symbol (case-sensitive)"),
			},
		},
		async ({
			stockExchange,
			year,
			month,
			day,
			ticker,
		}: {
			stockExchange: StockExchange;
			year?: number;
			month?: number;
			day?: number;
			ticker: string;
		}) => {
			try {
				const formattedDate = getDate(year, month, day);
				const marketDataResponse = await fetchMarketData(
					stockExchange,
					formattedDate,
				);

				const stockData = marketDataResponse.securities.data.find(
					(item: any[]) =>
						item[INDICES.TYPE] !== "sector" && item[INDICES.TICKER] === ticker,
				);

				if (!stockData) {
					throw new Error(
						`Ticker ${ticker} not found on ${stockExchange} for date ${formattedDate}`,
					);
				}

				return createResponse({
					info: INFO,
					charts: createCharts(stockExchange, formattedDate),
					exchange: stockData[INDICES.EXCHANGE],
					country: stockData[INDICES.COUNTRY],
					currency: EXCHANGE_INFO[stockExchange as StockExchange].currency,
					sector: stockData[INDICES.SECTOR],
					ticker: stockData[INDICES.TICKER],
					nameEng: stockData[INDICES.NAME_ENG],
					nameOriginal: stockData[INDICES.NAME_ORIGINAL],
					priceOpen: stockData[INDICES.PRICE_OPEN],
					priceLastSale: stockData[INDICES.PRICE_LAST_SALE],
					priceChangePct: stockData[INDICES.PRICE_CHANGE_PCT],
					volume: stockData[INDICES.VOLUME],
					value: stockData[INDICES.VALUE],
					numTrades: stockData[INDICES.NUM_TRADES],
					marketCap: stockData[INDICES.MARKET_CAP],
					listedFrom: stockData[INDICES.LISTED_FROM],
					listedTill: stockData[INDICES.LISTED_TILL],
				});
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);

	server.registerTool(
		"rank_stocks",
		{
			title: "Rank stocks",
			description:
				"Rank stocks on an exchange by a chosen metric (marketCap, priceChangePct, volume, value, numTrades) for a specific date with order and limit.",
			inputSchema: {
				stockExchange: exchangeSchema,
				...dateSchema,
				sortBy: z
					.enum(SORT_FIELDS)
					.describe(
						"Sort by: marketCap, priceChangePct, volume, value, numTrades",
					),
				order: z
					.enum(SORT_ORDERS)
					.default("desc")
					.describe("Sort order: asc or desc"),
				limit: z
					.number()
					.int()
					.min(1)
					.max(500)
					.default(10)
					.describe("Number of results"),
				sector: z.string().optional().describe("Filter by specific sector"),
			},
		},
		async ({
			stockExchange,
			year,
			month,
			day,
			sortBy,
			order,
			limit,
			sector,
		}: {
			stockExchange: StockExchange;
			year?: number;
			month?: number;
			day?: number;
			sortBy: SortField;
			order?: SortOrder;
			limit?: number;
			sector?: string;
		}) => {
			try {
				const formattedDate = getDate(year, month, day);
				const marketDataResponse = await fetchMarketData(
					stockExchange,
					formattedDate,
				);

				const stocks = marketDataResponse.securities.data
					.filter(
						(item: any[]) =>
							item[INDICES.TYPE] !== "sector" && item[INDICES.SECTOR] !== "",
					)
					.filter((item: any[]) => !sector || item[INDICES.SECTOR] === sector)
					.map((item: any[]) => ({
						ticker: item[INDICES.TICKER],
						name: item[INDICES.NAME_ENG],
						sector: item[INDICES.SECTOR],
						priceLastSale: item[INDICES.PRICE_LAST_SALE],
						priceChangePct: item[INDICES.PRICE_CHANGE_PCT],
						marketCap: item[INDICES.MARKET_CAP],
						volume: item[INDICES.VOLUME],
						value: item[INDICES.VALUE],
						numTrades: item[INDICES.NUM_TRADES],
					}))
					.sort((a: any, b: any) => {
						const aVal = a[sortBy],
							bVal = b[sortBy];
						return order === "desc" ? bVal - aVal : aVal - bVal;
					})
					.slice(0, limit);

				return createResponse({
					info: INFO,
					charts: createCharts(stockExchange, formattedDate),
					date: formattedDate,
					exchange: stockExchange.toUpperCase(),
					currency: EXCHANGE_INFO[stockExchange as StockExchange].currency,
					sortBy,
					order,
					limit,
					count: stocks.length,
					stocks,
				});
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);

	server.registerTool(
		"get_company_profile",
		{
			title: "Company profile (US)",
			description:
				"Get business description, industry, and background for a US-listed company by ticker.",
			inputSchema: {
				exchange: z
					.enum(US_EXCHANGES)
					.describe("US exchange: amex, nasdaq, nyse"),
				ticker: z.string().describe("Stock ticker symbol (case-sensitive)"),
			},
		},
		async ({ exchange, ticker }: { exchange: USExchange; ticker: string }) => {
			try {
				const securityInfo = await fetchSecurityInfo(exchange, ticker);
				return createResponse({
					info: INFO,
					charts: createCharts(exchange),
					...securityInfo,
				});
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);
}
