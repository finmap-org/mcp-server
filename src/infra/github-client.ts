import {
	DATA_BASE_URL,
	EXCHANGE_INFO,
	EXCHANGE_TO_COUNTRY_MAP,
	type StockExchange,
	type USExchange,
} from "../domain/constants.js";

export type MarketDataResponse = {
	securities: {
		data: unknown[][];
	};
};

export async function fetchMarketData(stockExchange: StockExchange, formattedDate: string) {
	const country = EXCHANGE_TO_COUNTRY_MAP[stockExchange];
	const date = formattedDate.replaceAll("-", "/");
	const url = `${DATA_BASE_URL}/data-${country}/refs/heads/main/marketdata/${date}/${stockExchange}.json`;
	const response = await fetch(url, {
		cf: { cacheTtl: 300, cacheEverything: true },
	} as unknown as RequestInit);
	if (response.status === 404) {
		throw new Error(
			`Not found, try another date. The date must be on or after ${EXCHANGE_INFO[stockExchange].availableSince} for ${stockExchange}`,
		);
	}
	if (!response.ok) {
		throw new Error(`Upstream fetch failed (${response.status})`);
	}
	return (await response.json()) as MarketDataResponse;
}

export async function fetchSecurityInfo(exchange: USExchange, ticker: string) {
	const firstLetter = ticker.charAt(0).toUpperCase();
	const url = `${DATA_BASE_URL}/data-us/refs/heads/main/securities/${exchange}/${firstLetter}/${ticker}.json`;
	const response = await fetch(url, {
		cf: { cacheTtl: 1800, cacheEverything: true },
	} as unknown as RequestInit);
	if (response.status === 404) {
		throw new Error(`Security ${ticker} not found on ${exchange}`);
	}
	if (!response.ok) {
		throw new Error(`Upstream fetch failed (${response.status})`);
	}
	return response.json();
}
