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

interface SectorTickerData {
	count: number;
	tickers: Record<string, string>;
}

interface TickersResult {
	date: string;
	exchange: string;
	sector: string;
	englishNames: boolean;
	itemsPerSector: number;
	sectors: Record<string, SectorTickerData>;
}

interface MarketDataItem {
	ticker: string;
	name: string;
	sector: string;
	priceLastSale: number;
	priceChangePct: number;
	marketCap: number;
	volume: number;
	value: number;
	numTrades: number;
}

const STOCK_EXCHANGES = ["amex", "nasdaq", "nyse", "us-all", "lse", "moex", "bist"] as const;
const US_EXCHANGES = ["amex", "nasdaq", "nyse"] as const;
const SORT_FIELDS = ["priceChangePct", "marketCap", "value", "volume", "numTrades"] as const;
const SORT_ORDERS = ["asc", "desc"] as const;

type StockExchange = typeof STOCK_EXCHANGES[number];
type USExchange = typeof US_EXCHANGES[number];
type SortField = typeof SORT_FIELDS[number];
type SortOrder = typeof SORT_ORDERS[number];

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
		content: [
			{
				type: "text",
				text: JSON.stringify(data, null, 2),
			},
		],
	};
}

function createErrorResponse(error: unknown) {
	return createResponse(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
}

function createCharts(exchange: string, date?: string) {
	return {
		histogram: `${BASE_URL}/?chartType=histogram&dataType=marketcap&exchange=${exchange}`,
		treemap: `${BASE_URL}/?chartType=treemap&dataType=marketcap&exchange=${exchange}${date ? `&date=${date}` : ''}`,
	};
}

function createBaseResult(exchange: string, date?: string) {
	return {
		info: INFO,
		charts: createCharts(exchange, date),
	};
}

const EXCHANGE_INFO: Record<StockExchange, {
	name: string;
	country: string;
	availableSince: string;
	updateFrequency: string;
}> = {
	amex: {
		name: "American Stock Exchange",
		country: "United States",
		availableSince: "2024-12-09",
		updateFrequency: "Hourly (weekdays)",
	},
	nasdaq: {
		name: "NASDAQ Stock Market",
		country: "United States", 
		availableSince: "2024-12-09",
		updateFrequency: "Hourly (weekdays)",
	},
	nyse: {
		name: "New York Stock Exchange",
		country: "United States",
		availableSince: "2024-12-09", 
		updateFrequency: "Hourly (weekdays)",
	},
	"us-all": {
		name: "US Combined (AMEX + NASDAQ + NYSE)",
		country: "United States",
		availableSince: "2024-12-09",
		updateFrequency: "Hourly (weekdays)",
	},
	lse: {
		name: "London Stock Exchange",
		country: "United Kingdom",
		availableSince: "2025-02-07",
		updateFrequency: "Hourly (weekdays)",
	},
	moex: {
		name: "Moscow Exchange",
		country: "Russia",
		availableSince: "2011-12-19",
		updateFrequency: "Every 15 minutes (weekdays)",
	},
	bist: {
		name: "Borsa Istanbul",
		country: "Turkey",
		availableSince: "2015-11-30",
		updateFrequency: "Bi-monthly",
	},
};

const commonInputSchema = {
	stockExchange: z
		.enum(STOCK_EXCHANGES)
		.describe(`Stock exchange identifier:
      amex - American Stock Exchange;
      nasdaq - Nasdaq;
      nyse - New York Stock Exchange;
      us-all - AmEx, Nasdaq and NYSE combined;
      lse - London Stock Exchange;
      moex - Moscow Exchange;
      bist - Borsa Istanbul (Turkish Stock Exchange)`),
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
	const formattedDate = dateString.replaceAll("/", "-");
	z.string().date().parse(formattedDate);

	const dayOfWeek = new Date(formattedDate).getDay();
	if (dayOfWeek === 0 || dayOfWeek === 6) {
		throw new Error("Data is only available for work days (Monday to Friday)");
	}

	return formattedDate;
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
	server.registerResource(
		"exchanges-info",
		"finmap://exchanges-info",
		{
			title: "Stock exchanges information",
			description: "Available stock exchanges with details about data availability and update frequency",
			mimeType: "application/json",
		},
		async () => {
			return {
				contents: [
					{
						uri: "finmap://exchanges-info",
						text: JSON.stringify(EXCHANGE_INFO, null, 2),
					},
				],
			};
		},
	);

	server.registerTool(
		"get-marketdata",
		{
			title: "Get Marketdata",
			description:
				"Get the market capitalization, volume, value and number of trades for the entire market and for each sector on a given date. If date is not provided, returns the latest available data",
			inputSchema: commonInputSchema,
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
				const dateString = buildDateString(year, month, day);
				const formattedDate = validateAndFormatDate(dateString);
				const marketDataResponse = await fetchMarketData(
					stockExchange,
					formattedDate,
				);

				const sectorItems = marketDataResponse.securities.data.filter(
					(securityItem: any) => securityItem[INDICES.TYPE] === "sector",
				);

				interface SectorData {
					name: string;
					marketCap: number;
					marketCapChangePct: number;
					volume: number;
					value: number;
					numTrades: number;
					itemsPerSector: number;
				}

				const result = {
					...createBaseResult(stockExchange, formattedDate),
					date: formattedDate,
					exchange: stockExchange.toUpperCase(),
					descriptions: {
						marketCap:
							"Market capitalization - total value of all shares outstanding",
						marketCapChangePct:
							"Percentage change in market capitalization from previous period",
						volume: "Trading volume - total number of shares traded",
						value: "Trading value - total monetary value of shares traded",
						numTrades: "Number of trades - total count of executed trades",
						itemsPerSector: "Number of items in the sector",
					},
					marketTotal: {} as SectorData,
					sectors: [] as SectorData[],
				};

				sectorItems.forEach((sectorItem: any) => {
					const sectorData: SectorData = {
						name: sectorItem[INDICES.TICKER],
						marketCap: sectorItem[INDICES.MARKET_CAP],
						marketCapChangePct: sectorItem[INDICES.PRICE_CHANGE_PCT],
						volume: sectorItem[INDICES.VOLUME],
						value: sectorItem[INDICES.VALUE],
						numTrades: sectorItem[INDICES.NUM_TRADES],
						itemsPerSector: sectorItem[INDICES.ITEMS_PER_SECTOR],
					};

					if (sectorItem[INDICES.SECTOR] === "") {
						result.marketTotal = sectorData;
					} else {
						result.sectors.push(sectorData);
					}
				});

				return createResponse(result);
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);

	server.registerTool(
		"get-tickers",
		{
			title: "Get Tickers",
			description:
				"Get tickers and company names on a given date. If date is not provided, returns the latest available data",
			inputSchema: {
				...commonInputSchema,
				englishNames: z
					.boolean()
					.default(true)
					.optional()
					.describe(
						`If false, returns the original company names instead of the English ones`,
					),
				sector: z
					.string()
					.optional()
					.describe(`If provided, filters the results to the specified sector`),
			},
		},
		async ({
			stockExchange,
			year,
			month,
			day,
			englishNames,
			sector,
		}: {
			stockExchange: StockExchange;
			year?: number;
			month?: number;
			day?: number;
			englishNames?: boolean;
			sector?: string;
		}) => {
			try {
				const dateString = buildDateString(year, month, day);
				const formattedDate = validateAndFormatDate(dateString);
				const marketDataResponse = await fetchMarketData(
					stockExchange,
					formattedDate,
				);

				const tickersResult: TickersResult = {
					date: formattedDate,
					exchange: stockExchange.toUpperCase(),
					sector: sector || "all",
					englishNames: englishNames ?? true,
					itemsPerSector: 0,
					sectors: {},
				};

				const result = {
					...createBaseResult(stockExchange, formattedDate),
					...tickersResult,
				};

				const filteredSecurities = marketDataResponse.securities.data.filter(
					(securityItem: any[]) =>
						securityItem[INDICES.TYPE] !== "sector" &&
						securityItem[INDICES.SECTOR] !== "" &&
						(!sector || securityItem[INDICES.SECTOR] === sector),
				);

				const groupedBySector = filteredSecurities.reduce(
					(accumulator: Record<string, any[]>, securityItem: any[]) => {
						const sectorName = securityItem[INDICES.SECTOR];
						if (!accumulator[sectorName]) accumulator[sectorName] = [];
						accumulator[sectorName].push(securityItem);
						return accumulator;
					},
					{},
				);

				for (const [sectorName, sectorSecurities] of Object.entries(
					groupedBySector,
				)) {
					const validTickerPairs = (sectorSecurities as any[])
						.map((securityItem: any[]) => {
							const ticker = securityItem[INDICES.TICKER];
							const companyName = englishNames
								? securityItem[INDICES.NAME_ENG]
								: securityItem[INDICES.NAME_ORIGINAL_SHORT] ||
									securityItem[INDICES.NAME_ENG];
							return ticker && companyName
								? ([ticker, companyName] as [string, string])
								: null;
						})
						.filter((entry): entry is [string, string] => entry !== null)
						.sort(([a], [b]) => a.localeCompare(b));

					const tickersMap = Object.fromEntries(validTickerPairs);

					if (Object.keys(tickersMap).length > 0) {
						result.sectors[sectorName] = {
							count: Object.keys(tickersMap).length,
							tickers: tickersMap,
						};
						result.itemsPerSector += Object.keys(tickersMap).length;
					}
				}

				return createResponse(result);
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);

	server.registerTool(
		"get-marketdata-by-ticker",
		{
			title: "Get Market Data by Ticker",
			description: "Get market data for a specific ticker on a given date",
			inputSchema: {
				...commonInputSchema,
				ticker: z
					.string()
					.describe("The ticker symbol to get market data for. Case-sensitive"),
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
				const dateString = buildDateString(year, month, day);
				const formattedDate = validateAndFormatDate(dateString);
				const marketDataResponse = await fetchMarketData(
					stockExchange,
					formattedDate,
				);

				const marketData = marketDataResponse.securities.data.find(
					(securityItem: any[]) =>
						securityItem[INDICES.TYPE] !== "sector" &&
						securityItem[INDICES.TICKER] === ticker,
				);

				if (!marketData) {
					throw new Error(
						`Ticker ${ticker} not found on ${stockExchange} for date ${formattedDate}`,
					);
				}

				const result = {
					...createBaseResult(stockExchange, formattedDate),
					exchange: marketData[INDICES.EXCHANGE],
					country: marketData[INDICES.COUNTRY],
					type: marketData[INDICES.TYPE],
					sector: marketData[INDICES.SECTOR],
					industry: marketData[INDICES.INDUSTRY],
					currencyId: marketData[INDICES.CURRENCY_ID],
					ticker: marketData[INDICES.TICKER],
					nameEng: marketData[INDICES.NAME_ENG],
					nameEngShort: marketData[INDICES.NAME_ENG_SHORT],
					nameOriginal: marketData[INDICES.NAME_ORIGINAL],
					nameOriginalShort: marketData[INDICES.NAME_ORIGINAL_SHORT],
					priceOpen: marketData[INDICES.PRICE_OPEN],
					priceLastSale: marketData[INDICES.PRICE_LAST_SALE],
					priceChangePct: marketData[INDICES.PRICE_CHANGE_PCT],
					volume: marketData[INDICES.VOLUME],
					value: marketData[INDICES.VALUE],
					numTrades: marketData[INDICES.NUM_TRADES],
					marketCap: marketData[INDICES.MARKET_CAP],
					listedFrom: marketData[INDICES.LISTED_FROM],
					listedTill: marketData[INDICES.LISTED_TILL],
					wikiPageIdEng: marketData[INDICES.WIKI_PAGE_ID_ENG],
					wikiPageIdOriginal: marketData[INDICES.WIKI_PAGE_ID_ORIGINAL],
					itemsPerSector: marketData[INDICES.ITEMS_PER_SECTOR],
				};

				return createResponse(result);
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);

	server.registerTool(
		"get-top-marketdata",
		{
			title: "Get Top Market Data",
			description:
				"Get top N market data items sorted by specified field and order. Excludes sector-level data",
			inputSchema: {
				...commonInputSchema,
				sortBy: z
					.enum(SORT_FIELDS)
					.describe(`marketCap: Market capitalization - total value of all shares outstanding;
              priceChangePct: Percentage change in share price from previous trading session;
              volume: Trading volume - total number of shares traded;
              value: Trading value - total monetary value of shares traded;
              numTrades: Number of trades - total count of executed trades;
              itemsPerSector: Number of items in the sector`),
				order: z.enum(SORT_ORDERS).default("desc").describe("Sort order"),
				limit: z
					.number()
					.int()
					.min(1)
					.max(500)
					.default(10)
					.describe("Number of items to return"),
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
		}: {
			stockExchange: StockExchange;
			year?: number;
			month?: number;
			day?: number;
			sortBy: SortField;
			order?: SortOrder;
			limit?: number;
		}) => {
			try {
				const dateString = buildDateString(year, month, day);
				const formattedDate = validateAndFormatDate(dateString);
				const marketDataResponse = await fetchMarketData(
					stockExchange,
					formattedDate,
				);

				const filteredSecurities = marketDataResponse.securities.data
					.filter(
						(securityItem: any[]) =>
							securityItem[INDICES.TYPE] !== "sector" &&
							securityItem[INDICES.SECTOR] !== "",
					)
					.map((securityItem: any[]) => ({
						ticker: securityItem[INDICES.TICKER],
						name: securityItem[INDICES.NAME_ENG],
						sector: securityItem[INDICES.SECTOR],
						priceLastSale: securityItem[INDICES.PRICE_LAST_SALE],
						priceChangePct: securityItem[INDICES.PRICE_CHANGE_PCT],
						marketCap: securityItem[INDICES.MARKET_CAP],
						volume: securityItem[INDICES.VOLUME],
						value: securityItem[INDICES.VALUE],
						numTrades: securityItem[INDICES.NUM_TRADES],
					}))
					.sort((a: MarketDataItem, b: MarketDataItem) => {
						const aVal = a[sortBy];
						const bVal = b[sortBy];
						return order === "desc" ? bVal - aVal : aVal - bVal;
					})
					.slice(0, limit || 10);

				const result = {
					...createBaseResult(stockExchange, formattedDate),
					date: formattedDate,
					exchange: stockExchange.toUpperCase(),
					sortBy: sortBy,
					order: order || "desc",
					limit: limit || 10,
					count: filteredSecurities.length,
					filteredSecurities,
				};

				return createResponse(result);
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);

	server.registerTool(
		"get-company-info",
		{
			title: "Get Company Description",
			description:
				"Get detailed information for a US company by provided ticker (NASDAQ, NYSE, AMEX only)",
			inputSchema: {
				exchange: z
					.enum(US_EXCHANGES)
					.describe("US exchange identifier"),
				ticker: z
					.string()
					.describe("The ticker symbol to get information for. Case-sensitive"),
			},
		},
		async ({
			exchange,
			ticker,
		}: {
			exchange: USExchange;
			ticker: string;
		}) => {
			try {
				const securityInfo = await fetchSecurityInfo(exchange, ticker);

				const result = {
					...createBaseResult(exchange),
					...securityInfo,
				};

				return createResponse(result);
			} catch (error) {
				return createErrorResponse(error);
			}
		},
	);
}
