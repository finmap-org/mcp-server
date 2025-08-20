# Finmap MCP Server

The finmap.org MCP server provides comprehensive historical data from the US, UK, Russian and Turkish stock exchanges. Access sectors, tickers, company profiles, market cap, volume, value, and trade counts, as well as treemap and histogram visualizations.

## Supported Exchanges

| Exchange | Code | Country | Earliest Data | Update Frequency |
|----------|------|---------|---------------|------------------|
| Moscow Exchange | `moex` | Russia | 2011-12-19 | Every 15 minutes (weekdays) |
| New York Stock Exchange | `nyse` | United States | 2024-12-09 | Hourly (weekdays) |
| NASDAQ Stock Market | `nasdaq` | United States | 2024-12-09 | Hourly (weekdays) |
| American Stock Exchange | `amex` | United States | 2024-12-09 | Hourly (weekdays) |
| US Combined (AMEX + NASDAQ + NYSE) | `us-all` | United States | 2024-12-09 | Hourly (weekdays) |
| London Stock Exchange | `lse` | United Kingdom | 2025-02-07 | Hourly (weekdays) |
| Borsa Istanbul | `bist` | Turkey | 2015-11-30 | Bi-monthly |

## Installation & Usage

### Option 1: Remote Server (Hosted)

Connect to our hosted MCP server without any installation:

**Server URL**: `https://mcp.finmap.org`

**Claude Desktop Configuration**:
```json
{
  "mcpServers": {
    "finmap": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.finmap.org"]
    }
  }
}
```

### Option 2: Local Package (npm)

Install and run locally for better performance and offline access:

```bash
# Install globally
npm install -g finmap-mcp

# Or use directly
npx finmap-mcp
```

**Claude Desktop Configuration**:
```json
{
  "mcpServers": {
    "finmap": {
      "command": "npx",
      "args": ["finmap-mcp"]
    }
  }
}
```

## Available Tools

### 1. `get-marketdata`
Get market overview with sector breakdown for any exchange.

**Parameters:**
- `stockExchange`: `"moex" | "nyse" | "nasdaq" | "amex" | "lse" | "bist" | "us-all"`
- `year`, `month`, `day` (optional): Specific date, defaults to latest

**Example Response:**
```json
{
  "date": "2025-08-19",
  "exchange": "MOEX",
  "marketTotal": {
    "name": "Moscow Exchange",
    "marketCap": 56179679584186.7,
    "marketCapChangePct": -0.62,
    "volume": 31210807020,
    "value": 138591002400,
    "numTrades": 3433146,
    "itemsPerSector": 460
  },
  "sectors": [
    {
      "name": "Finance",
      "marketCap": 11302744020274.61,
      "marketCapChangePct": -0.41,
      "volume": 246255138,
      "value": 30553933296,
      "numTrades": 465750,
      "itemsPerSector": 30
    }
  ],
  "charts": {
    "histogram": "https://finmap.org/?chartType=histogram&dataType=marketcap&exchange=moex",
    "treemap": "https://finmap.org/?chartType=treemap&dataType=marketcap&exchange=moex&date=2025-08-19"
  }
}
```

### 2. `get-tickers`
List all available company tickers for an exchange with optional sector filtering.

**Parameters:**
- `stockExchange`: Exchange identifier
- `englishNames`: `true` (default) | `false` - Use English or original company names
- `sector` (optional): Filter by specific sector

### 3. `get-marketdata-by-ticker`
Get detailed information for a specific company ticker.

**Parameters:**
- `stockExchange`: Exchange identifier  
- `ticker`: Company ticker symbol (case-sensitive)
- `year`, `month`, `day` (optional): Historical date

**Example Response:**
```json
{
  "exchange": "MOEX",
  "country": "",
  "type": "",
  "sector": "Finance",
  "industry": "",
  "currencyId": "",
  "ticker": "T",
  "nameEng": "IPJSC TCS Holding",
  "nameEngShort": "",
  "nameOriginal": "ТКС Холдинг МКПАО ао",
  "nameOriginalShort": "ТКСХолд ао",
  "priceOpen": 3406.2,
  "priceLastSale": 3404.8,
  "priceChangePct": -0.04,
  "volume": 3720294,
  "value": 12722573698,
  "numTrades": 96979,
  "marketCap": 914012195902,
  "listedFrom": "2024-11-27",
  "listedTill": "",
  "wikiPageIdEng": "51138388\r",
  "wikiPageIdOriginal": "3124277",
  "itemsPerSector": 0
}
```

### 4. `get-top-marketdata`
Get top performing companies sorted by various metrics.

**Parameters:**
- `stockExchange`: Exchange identifier
- `sortBy`: `"marketCap" | "priceChangePct" | "volume" | "value" | "numTrades"`
- `order`: `"desc" | "asc"` (default: desc)
- `limit`: Number of results (1-500, default: 10)

**Example Response:**

```json
{
  "date": "2025-08-19",
  "exchange": "NASDAQ",
  "sortBy": "marketCap",
  "order": "desc",
  "limit": 3,
  "count": 3,
  "filteredSecurities": [
    {
      "ticker": "NVDA",
      "name": "NVIDIA Corporation Common Stock",
      "sector": "Technology",
      "priceLastSale": 175.64,
      "priceChangePct": -3.5,
      "marketCap": 4285616000000,
      "volume": 183881555,
      "value": 0,
      "numTrades": 0
    },
    {
      "ticker": "MSFT",
      "name": "Microsoft Corporation Common Stock",
      "sector": "Technology",
      "priceLastSale": 509.77,
      "priceChangePct": -1.418,
      "marketCap": 3789205225023,
      "volume": 21116203,
      "value": 0,
      "numTrades": 0
    },
    {
      "ticker": "AAPL",
      "name": "Apple Inc. Common Stock",
      "sector": "Technology",
      "priceLastSale": 230.56,
      "priceChangePct": -0.143,
      "marketCap": 3421600318400,
      "volume": 37671194,
      "value": 0,
      "numTrades": 0
    }
  ]
}
```

### 5. `get-company-info`
Get detailed company information including business description (US market only).

**Parameters:**
- `stockExchange`: `"nasdaq" | "nyse" | "amex"`
- `ticker`: Company ticker symbol

**Example Response:**

```json
{
  {
    "ModuleTitle": {
      "label": "Module Title",
      "value": "Company Description"
    },
    "CompanyName": {
      "label": "Company Name",
      "value": "Sprouts Farmers Market, Inc."
    },
    "Symbol": {
      "label": "Symbol",
      "value": "SFM"
    },
    "Address": {
      "label": "Address",
      "value": "5455 EAST HIGH STREET,SUITE 111, PHOENIX, Arizona, 85054, United States"
    },
    "Phone": {
      "label": "Phone",
      "value": "+1 480 814-8016"
    },
    "Industry": {
      "label": "Industry",
      "value": "Food Chains"
    },
    "Sector": {
      "label": "Sector",
      "value": "Consumer Staples"
    },
    "Region": {
      "label": "Region",
      "value": "North America"
    },
    "CompanyDescription": {
      "label": "Company Description",
      "value": "Sprouts Farmers Market is an American specialty grocer offering an assortment highlighting fresh and naturally derived products. Its offerings are especially focused on produce, which constituted around 21% of sales in fiscal 2021. Founded in 2002, the chain is most heavily concentrated in California, which accounted for over one third of its 374 stores as of the end of fiscal 2021. All of the company's operations are in the United States, with its stores largely located in the southern half of the country. The firm sells roughly 20,000 products (of which around 70% are attribute driven, such as organic, plant-based, or catering to the keto or paleo diet), with private-label products accounting for about 16% of sales in fiscal 2021. Perishable items accounted for 58% of fiscal 2021 sales."
    },
    "CompanyUrl": {
      "label": "Company Url",
      "value": "https://www.sprouts.com"
    },
    "KeyExecutives": {
      "label": "Key Executives",
      "value": [
        {
          "name": "Jack Loudon Sinclair",
          "title": "Chief Executive Officer & Director"
        },
        {
          "name": "James Bahrenburg",
          "title": "Chief Technology Officer"
        },
        {
          "name": "Nicholas Konat",
          "title": "President & Chief Operating Officer"
        }
      ]
    }
  },
  "message": null,
  "status": {
    "rCode": 200,
    "bCodeMessage": null,
    "developerMessage": null
  }
}
```

## Example Prompts

### Market Analysis
> "Get the current market data for MOEX and show me the top 3 sectors by market cap"

> "Compare the top 10 companies by market cap on NYSE vs NASDAQ"

> "Show me all energy sector companies on MOEX with their current prices"

### Historical Data
> "Get GAZP stock data for December 15, 2024"

> "Show me the market performance of BIST for the last trading day of 2024"

### Sector Research
> "List all technology companies on NASDAQ and sort them by trading volume"

> "Get detailed information about Apple (AAPL) including company description"

### Interactive Exploration
> "Show me a treemap visualization of MOEX market cap by sector"

> "Get the histogram view of market cap distribution for US markets"


## Data Provider

Data is sourced from [finmap.org](https://finmap.org) - an interactive platform for financial market visualization and analysis.

- **Website**: https://finmap.org
- **GitHub**: https://github.com/finmap-org  
- **Donate**: [Patreon](https://patreon.com/finmap) | [Boosty](https://boosty.to/finmap)