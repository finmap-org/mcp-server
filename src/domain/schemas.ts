import { z } from "zod";
import { SORT_FIELDS, SORT_ORDERS, STOCK_EXCHANGES, US_EXCHANGES } from "./constants.js";

const exchangeSchema = z.enum(STOCK_EXCHANGES);

const dateSchema = {
	year: z.number().int().min(2012).optional(),
	month: z.number().int().min(1).max(12).optional(),
	day: z.number().int().min(1).max(31).optional(),
};

export const listSectorsSchema = z.object({
	stockExchange: exchangeSchema,
	...dateSchema,
});

export const listTickersSchema = z.object({
	stockExchange: exchangeSchema,
	...dateSchema,
	sector: z.string().optional(),
	englishNames: z.boolean().default(true),
});

export const searchCompaniesSchema = z.object({
	stockExchange: exchangeSchema,
	...dateSchema,
	query: z.string().min(1),
	limit: z.number().int().min(1).max(50).default(10),
});

export const marketOverviewSchema = z.object({
	stockExchange: exchangeSchema,
	...dateSchema,
});

export const sectorsOverviewSchema = z.object({
	stockExchange: exchangeSchema,
	...dateSchema,
	sector: z.string().optional(),
});

export const rankStocksSchema = z.object({
	stockExchange: exchangeSchema,
	...dateSchema,
	sortBy: z.enum(SORT_FIELDS),
	order: z.enum(SORT_ORDERS).default("desc"),
	limit: z.number().int().min(1).max(100).default(10),
	sector: z.string().optional(),
});

export const stockDataSchema = z.object({
	stockExchange: exchangeSchema,
	...dateSchema,
	ticker: z.string().min(1),
});

export const companyProfileSchema = z.object({
	exchange: z.enum(US_EXCHANGES),
	ticker: z.string().min(1),
});
