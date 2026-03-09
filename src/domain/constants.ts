export const BASE_URL = "https://finmap.org";
export const DATA_BASE_URL = "https://raw.githubusercontent.com/finmap-org";

export const INFO = {
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

export const STOCK_EXCHANGES = [
	"amex",
	"nasdaq",
	"nyse",
	"us-all",
	"lse",
	"moex",
	"bist",
	"hkex",
] as const;

export const US_EXCHANGES = ["amex", "nasdaq", "nyse"] as const;

export const SORT_FIELDS = [
	"priceChangePct",
	"marketCap",
	"value",
	"volume",
	"numTrades",
] as const;

export const SORT_ORDERS = ["asc", "desc"] as const;

export type StockExchange = (typeof STOCK_EXCHANGES)[number];
export type USExchange = (typeof US_EXCHANGES)[number];
export type SortField = (typeof SORT_FIELDS)[number];

export const INDICES = {
	EXCHANGE: 0,
	COUNTRY: 1,
	TYPE: 2,
	SECTOR: 3,
	TICKER: 6,
	NAME_ENG: 7,
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
	ITEMS_PER_SECTOR: 22,
} as const;

export const EXCHANGE_TO_COUNTRY_MAP: Record<StockExchange, string> = {
	amex: "us",
	nasdaq: "us",
	nyse: "us",
	"us-all": "us",
	lse: "uk",
	moex: "russia",
	bist: "turkey",
	hkex: "hongkong",
};

export const EXCHANGE_INFO: Record<
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
		updateFrequency: "Daily",
	},
	nasdaq: {
		name: "NASDAQ Stock Market",
		country: "United States",
		currency: "USD",
		availableSince: "2024-12-09",
		updateFrequency: "Daily",
	},
	nyse: {
		name: "New York Stock Exchange",
		country: "United States",
		currency: "USD",
		availableSince: "2024-12-09",
		updateFrequency: "Daily",
	},
	"us-all": {
		name: "US Combined (AMEX + NASDAQ + NYSE)",
		country: "United States",
		currency: "USD",
		availableSince: "2024-12-09",
		updateFrequency: "Daily",
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
	hkex: {
		name: "Hong Kong Stock Exchange",
		country: "Hong Kong",
		currency: "HKD",
		availableSince: "2025-09-29",
		updateFrequency: "Every 30 minutes (weekdays)",
	},
};
