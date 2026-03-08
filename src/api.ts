import { z } from "zod";
import {
	BASE_URL,
	EXCHANGE_INFO,
	INDICES,
	INFO,
	type SortField,
} from "./domain/constants.js";
import {
	companyProfileSchema,
	listSectorsSchema,
	listTickersSchema,
	marketOverviewSchema,
	rankStocksSchema,
	searchCompaniesSchema,
	sectorsOverviewSchema,
	stockDataSchema,
} from "./domain/schemas.js";
import { fetchMarketData, fetchSecurityInfo } from "./infra/github-client.js";

export {
	companyProfileSchema,
	listSectorsSchema,
	listTickersSchema,
	marketOverviewSchema,
	rankStocksSchema,
	searchCompaniesSchema,
	sectorsOverviewSchema,
	stockDataSchema,
};

type RankedStock = {
	ticker: string;
	name: string;
	sector: string;
	priceLastSale: number;
	priceChangePct: number;
	marketCap: number;
	volume: number;
	value: number;
	numTrades: number;
};

type SearchMatch = {
	ticker: string;
	name: string;
	sector: string;
	score: number;
};

function createCharts(exchange: string, date?: string) {
	return {
		histogram: `${BASE_URL}/?chart=histogram&data=marketcap&currency=USD&exchange=${exchange}`,
		treemap: `${BASE_URL}/?chart=treemap&data=marketcap&currency=USD&exchange=${exchange}${date ? `&date=${date.replaceAll("-", "/")}` : ""}`,
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
	return validateAndFormatDate(buildDateString(year, month, day));
}

function keepTopK<T>(
	items: Iterable<T>,
	limit: number,
	isBetter: (candidate: T, current: T) => boolean,
): T[] {
	if (limit <= 0) return [];

	const heap: T[] = [];
	const isWorse = (a: T, b: T) => isBetter(b, a);

	const swap = (i: number, j: number) => {
		const tmp = heap[i];
		heap[i] = heap[j];
		heap[j] = tmp;
	};

	const bubbleUp = (index: number) => {
		let idx = index;
		while (idx > 0) {
			const parent = Math.floor((idx - 1) / 2);
			if (!isWorse(heap[idx], heap[parent])) break;
			swap(idx, parent);
			idx = parent;
		}
	};

	const bubbleDown = (index: number) => {
		let idx = index;
		while (true) {
			const left = idx * 2 + 1;
			const right = left + 1;
			let smallest = idx;

			if (left < heap.length && isWorse(heap[left], heap[smallest])) {
				smallest = left;
			}
			if (right < heap.length && isWorse(heap[right], heap[smallest])) {
				smallest = right;
			}
			if (smallest === idx) break;
			swap(idx, smallest);
			idx = smallest;
		}
	};

	for (const item of items) {
		if (heap.length < limit) {
			heap.push(item);
			bubbleUp(heap.length - 1);
			continue;
		}

		if (isBetter(item, heap[0])) {
			heap[0] = item;
			bubbleDown(0);
		}
	}

	heap.sort((a, b) => (isBetter(a, b) ? -1 : isBetter(b, a) ? 1 : 0));
	return heap;
}

export function listExchanges() {
	const exchanges = Object.entries(EXCHANGE_INFO).map(([id, info]) => ({
		id,
		...info,
	}));
	return { info: INFO, exchanges };
}

export async function listSectors(input: z.infer<typeof listSectorsSchema>) {
	const formattedDate = getDate(input.year, input.month, input.day);
	const marketDataResponse = await fetchMarketData(
		input.stockExchange,
		formattedDate,
	);
	const sectorCounts: Record<string, number> = {};
	for (const item of marketDataResponse.securities.data) {
		if (item[INDICES.TYPE] !== "sector" && item[INDICES.SECTOR]) {
			sectorCounts[item[INDICES.SECTOR] as string] =
				(sectorCounts[item[INDICES.SECTOR] as string] || 0) + 1;
		}
	}
	const sectors = Object.entries(sectorCounts).map(([name, count]) => ({
		name,
		itemsPerSector: count,
	}));
	return {
		info: INFO,
		date: formattedDate,
		exchange: input.stockExchange.toUpperCase(),
		currency: EXCHANGE_INFO[input.stockExchange].currency,
		sectors,
	};
}

export async function listTickers(input: z.infer<typeof listTickersSchema>) {
	const formattedDate = getDate(input.year, input.month, input.day);
	const marketDataResponse = await fetchMarketData(
		input.stockExchange,
		formattedDate,
	);
	const sectorGroups: Record<
		string,
		Array<{ ticker: string; name: string }>
	> = {};
	for (const item of marketDataResponse.securities.data) {
		if (
			item[INDICES.TYPE] !== "sector" &&
			item[INDICES.SECTOR] &&
			(!input.sector || item[INDICES.SECTOR] === input.sector)
		) {
			const sectorName = item[INDICES.SECTOR] as string;
			const ticker = item[INDICES.TICKER] as string;
			const name = input.englishNames
				? (item[INDICES.NAME_ENG] as string)
				: ((item[INDICES.NAME_ORIGINAL_SHORT] ||
						item[INDICES.NAME_ENG]) as string);
			if (ticker && name) {
				if (!sectorGroups[sectorName]) sectorGroups[sectorName] = [];
				sectorGroups[sectorName].push({ ticker, name });
			}
		}
	}
	for (const companies of Object.values(sectorGroups)) {
		companies.sort((a, b) => a.ticker.localeCompare(b.ticker));
	}
	return {
		info: INFO,
		date: formattedDate,
		exchange: input.stockExchange.toUpperCase(),
		currency: EXCHANGE_INFO[input.stockExchange].currency,
		sectors: sectorGroups,
	};
}

export async function searchCompanies(
	input: z.infer<typeof searchCompaniesSchema>,
) {
	const formattedDate = getDate(input.year, input.month, input.day);
	const marketDataResponse = await fetchMarketData(
		input.stockExchange,
		formattedDate,
	);
	const searchTerm = input.query.toLowerCase();
	const matches: SearchMatch[] = [];
	for (const item of marketDataResponse.securities.data) {
		if (item[INDICES.TYPE] === "sector" || !item[INDICES.SECTOR]) continue;
		const ticker = item[INDICES.TICKER] as string;
		const name = item[INDICES.NAME_ENG] as string;
		const score = calculateMatchScore(ticker, name, searchTerm);
		if (score <= 0) continue;
		matches.push({
			ticker,
			name,
			sector: item[INDICES.SECTOR] as string,
			score,
		});
	}

	const topMatches = keepTopK(matches, input.limit, (candidate, current) => {
		if (candidate.score !== current.score)
			return candidate.score > current.score;
		return candidate.ticker.localeCompare(current.ticker) < 0;
	});

	return {
		info: INFO,
		date: formattedDate,
		exchange: input.stockExchange.toUpperCase(),
		currency: EXCHANGE_INFO[input.stockExchange].currency,
		query: input.query,
		matches: topMatches,
	};
}

export async function getMarketOverview(
	input: z.infer<typeof marketOverviewSchema>,
) {
	const formattedDate = getDate(input.year, input.month, input.day);
	const marketDataResponse = await fetchMarketData(
		input.stockExchange,
		formattedDate,
	);

	const sectorItems = marketDataResponse.securities.data.filter(
		(item) => item[INDICES.TYPE] === "sector",
	);

	let marketTotal = {};
	const sectors: Array<Record<string, unknown>> = [];
	for (const item of sectorItems) {
		const sectorData = {
			name: item[INDICES.TICKER],
			marketCap: item[INDICES.MARKET_CAP],
			marketCapChangePct: item[INDICES.PRICE_CHANGE_PCT],
			volume: item[INDICES.VOLUME],
			value: item[INDICES.VALUE],
			numTrades: item[INDICES.NUM_TRADES],
			itemsPerSector: item[INDICES.ITEMS_PER_SECTOR],
		};
		if (item[INDICES.SECTOR] === "") marketTotal = sectorData;
		else sectors.push(sectorData);
	}

	return {
		info: INFO,
		charts: createCharts(input.stockExchange, formattedDate),
		date: formattedDate,
		exchange: input.stockExchange.toUpperCase(),
		currency: EXCHANGE_INFO[input.stockExchange].currency,
		marketTotal,
		sectors,
	};
}

export async function getSectorsOverview(
	input: z.infer<typeof sectorsOverviewSchema>,
) {
	const formattedDate = getDate(input.year, input.month, input.day);
	const marketDataResponse = await fetchMarketData(
		input.stockExchange,
		formattedDate,
	);

	const sectors = marketDataResponse.securities.data
		.filter(
			(item) => item[INDICES.TYPE] === "sector" && item[INDICES.SECTOR] !== "",
		)
		.filter((item) => !input.sector || item[INDICES.TICKER] === input.sector)
		.map((item) => ({
			name: item[INDICES.TICKER],
			marketCap: item[INDICES.MARKET_CAP],
			marketCapChangePct: item[INDICES.PRICE_CHANGE_PCT],
			volume: item[INDICES.VOLUME],
			value: item[INDICES.VALUE],
			numTrades: item[INDICES.NUM_TRADES],
			itemsPerSector: item[INDICES.ITEMS_PER_SECTOR],
		}));

	return {
		info: INFO,
		charts: createCharts(input.stockExchange, formattedDate),
		date: formattedDate,
		exchange: input.stockExchange.toUpperCase(),
		currency: EXCHANGE_INFO[input.stockExchange].currency,
		sectors,
	};
}

export async function rankStocks(input: z.infer<typeof rankStocksSchema>) {
	const formattedDate = getDate(input.year, input.month, input.day);
	const marketDataResponse = await fetchMarketData(
		input.stockExchange,
		formattedDate,
	);

	const stocks: RankedStock[] = [];
	for (const item of marketDataResponse.securities.data) {
		if (item[INDICES.TYPE] === "sector" || item[INDICES.SECTOR] === "")
			continue;
		if (input.sector && item[INDICES.SECTOR] !== input.sector) continue;
		stocks.push({
			ticker: item[INDICES.TICKER] as string,
			name: item[INDICES.NAME_ENG] as string,
			sector: item[INDICES.SECTOR] as string,
			priceLastSale: item[INDICES.PRICE_LAST_SALE] as number,
			priceChangePct: item[INDICES.PRICE_CHANGE_PCT] as number,
			marketCap: item[INDICES.MARKET_CAP] as number,
			volume: item[INDICES.VOLUME] as number,
			value: item[INDICES.VALUE] as number,
			numTrades: item[INDICES.NUM_TRADES] as number,
		});
	}

	const rankedStocks = keepTopK(stocks, input.limit, (candidate, current) => {
		const candidateValue = candidate[input.sortBy as SortField] as number;
		const currentValue = current[input.sortBy as SortField] as number;
		if (candidateValue !== currentValue) {
			return input.order === "desc"
				? candidateValue > currentValue
				: candidateValue < currentValue;
		}
		return candidate.ticker.localeCompare(current.ticker) < 0;
	});

	return {
		info: INFO,
		charts: createCharts(input.stockExchange, formattedDate),
		date: formattedDate,
		exchange: input.stockExchange.toUpperCase(),
		currency: EXCHANGE_INFO[input.stockExchange].currency,
		sortBy: input.sortBy,
		order: input.order,
		limit: input.limit,
		count: rankedStocks.length,
		stocks: rankedStocks,
	};
}

export async function getStockData(input: z.infer<typeof stockDataSchema>) {
	const formattedDate = getDate(input.year, input.month, input.day);
	const marketDataResponse = await fetchMarketData(
		input.stockExchange,
		formattedDate,
	);

	const stockData = marketDataResponse.securities.data.find(
		(item) =>
			item[INDICES.TYPE] !== "sector" && item[INDICES.TICKER] === input.ticker,
	);
	if (!stockData) {
		throw new Error(
			`Ticker ${input.ticker} not found on ${input.stockExchange} for date ${formattedDate}`,
		);
	}

	return {
		info: INFO,
		charts: createCharts(input.stockExchange, formattedDate),
		exchange: stockData[INDICES.EXCHANGE],
		country: stockData[INDICES.COUNTRY],
		currency: EXCHANGE_INFO[input.stockExchange].currency,
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
	};
}

export async function getCompanyProfile(
	input: z.infer<typeof companyProfileSchema>,
) {
	const securityInfo = (await fetchSecurityInfo(
		input.exchange,
		input.ticker,
	)) as Record<string, unknown>;
	return {
		info: INFO,
		charts: createCharts(input.exchange),
		...securityInfo,
	};
}

export function getApiOpenApiSpec(baseUrl: string) {
	return {
		openapi: "3.1.0",
		info: {
			title: "Finmap GPT API",
			description:
				"Compact HTTP API for GPT Actions backed by Finmap MCP logic",
			version: "1.0.0",
		},
		servers: [{ url: baseUrl }],
		paths: {
			"/api/list-exchanges": {
				get: {
					operationId: "list_supported_exchanges",
					"x-openai-isConsequential": false,
				},
			},
			"/api/list-sectors": {
				post: {
					operationId: "list_exchange_sectors",
					"x-openai-isConsequential": false,
				},
			},
			"/api/list-tickers": {
				post: {
					operationId: "list_sector_companies",
					"x-openai-isConsequential": false,
				},
			},
			"/api/search-companies": {
				post: {
					operationId: "search_exchange_companies",
					"x-openai-isConsequential": false,
				},
			},
			"/api/market-overview": {
				post: {
					operationId: "analyze_market_overview",
					"x-openai-isConsequential": false,
				},
			},
			"/api/sectors-overview": {
				post: {
					operationId: "analyze_sector_performance",
					"x-openai-isConsequential": false,
				},
			},
			"/api/rank-stocks": {
				post: {
					operationId: "rank_exchange_companies",
					"x-openai-isConsequential": false,
				},
			},
			"/api/stock-data": {
				post: {
					operationId: "get_stock_snapshot",
					"x-openai-isConsequential": false,
				},
			},
			"/api/company-profile": {
				post: {
					operationId: "get_company_profile_us",
					"x-openai-isConsequential": false,
				},
			},
		},
	};
}
