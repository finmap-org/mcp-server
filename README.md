# Finmap MCP Server

The finmap.org MCP server provides comprehensive historical data from the US, UK, Russian and Turkish stock exchanges. Access sectors, tickers, company profiles, market cap, volume, value, and trade counts, as well as treemap and histogram visualizations.

## Supported Exchanges

| Exchange | Code | Country | Earliest Data | Update Frequency |
|----------|------|---------|---------------|------------------|
| New York Stock Exchange | `nyse` | United States | 2024-12-09 | Daily |
| NASDAQ Stock Market | `nasdaq` | United States | 2024-12-09 | Daily |
| American Stock Exchange | `amex` | United States | 2024-12-09 | Daily |
| US Combined (AMEX + NASDAQ + NYSE) | `us-all` | United States | 2024-12-09 | Daily |
| London Stock Exchange | `lse` | United Kingdom | 2025-02-07 | Hourly (weekdays) |
| Hong Kong Stock Exchange | `hkex` | Hong Kong | 2025-09-26 | Every 30 minutes (weekdays) |
| Borsa Istanbul | `bist` | Turkey | 2015-11-30 | Every two months |
| Moscow Exchange | `moex` | Russia | 2011-12-19 | Every 15 minutes (weekdays) |

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
      "args": ["-y", "finmap-mcp"]
    }
  }
}
```

## Available Tools

### 1. `list_exchanges`
  - Title: List exchanges
  - Description: Return supported exchanges with IDs, names, country, currency, earliest available date, and update frequency.

  **Example Promt:** `#finmap-mcp list available stock exchanges`

  **Example Response:**
  ```json
  {
    "exchanges": [
      {
        "id": "amex",
        "name": "American Stock Exchange",
        "country": "United States",
        "currency": "USD",
        "availableSince": "2024-12-09",
        "updateFrequency": "Daily"
      },
      {
        "id": "nasdaq",
        "name": "NASDAQ Stock Market",
        "country": "United States",
        "currency": "USD",
        "availableSince": "2024-12-09",
        "updateFrequency": "Daily"
      },
      {
        "id": "nyse",
        "name": "New York Stock Exchange",
        "country": "United States",
        "currency": "USD",
        "availableSince": "2024-12-09",
        "updateFrequency": "Daily"
      },
      {
        "id": "us-all",
        "name": "US Combined (AMEX + NASDAQ + NYSE)",
        "country": "United States",
        "currency": "USD",
        "availableSince": "2024-12-09",
        "updateFrequency": "Daily"
      },
      {
        "id": "lse",
        "name": "London Stock Exchange",
        "country": "United Kingdom",
        "currency": "GBP",
        "availableSince": "2025-02-07",
        "updateFrequency": "Hourly (weekdays)"
      },
      {
        "id": "moex",
        "name": "Moscow Exchange",
        "country": "Russia",
        "currency": "RUB",
        "availableSince": "2011-12-19",
        "updateFrequency": "Every 15 minutes (weekdays)"
      },
      {
        "id": "bist",
        "name": "Borsa Istanbul",
        "country": "Turkey",
        "currency": "TRY",
        "availableSince": "2015-11-30",
        "updateFrequency": "Every two months"
      },
      {
        "id": "hkex",
        "name": "Hong Kong Stock Exchange",
        "country": "Hong Kong",
        "currency": "HKD",
        "availableSince": "2025-09-26",
        "updateFrequency": "Every 30 minutes (weekdays)"
      }
    ]
  }
  ```

### 2. `list_sectors`
  - Title: List sectors
  - Description: List available business sectors for an exchange on a specific date, including item counts.

  **Example Promt:** `#finmap-mcp List sectors for the Turkish stock exchange`
  
  **Example Response:**
  ```json
  {
    "date": "2024-08-28",
    "exchange": "BIST",
    "currency": "TRY",
    "sectors": [
      {
        "name": "Finance",
        "itemsPerSector": 164
      },
      {
        "name": "MSPOTECW",
        "itemsPerSector": 4669
      },
      {
        "name": "MSPOTEPW",
        "itemsPerSector": 3335
      },
      {
        "name": "Industrials",
        "itemsPerSector": 277
      },
      {
        "name": "MSPOTXCR",
        "itemsPerSector": 2
      },
      {
        "name": "Real Estate",
        "itemsPerSector": 4
      },
      {
        "name": "Agriculture",
        "itemsPerSector": 5
      },
      {
        "name": "Utilities",
        "itemsPerSector": 32
      },
      {
        "name": "MSPOTGMF",
        "itemsPerSector": 9
      },
      {
        "name": "Technology",
        "itemsPerSector": 39
      },
      {
        "name": "Basic Materials",
        "itemsPerSector": 7
      },
      {
        "name": "MSPOTEMS",
        "itemsPerSector": 1
      },
      {
        "name": "MSPOTETF",
        "itemsPerSector": 21
      },
      {
        "name": "MSPOTGSF",
        "itemsPerSector": 8
      },
      {
        "name": "Consumer Staples",
        "itemsPerSector": 27
      },
      {
        "name": "Consumer Discretionary",
        "itemsPerSector": 14
      },
      {
        "name": "Health Care",
        "itemsPerSector": 9
      },
      {
        "name": "Miscellaneous",
        "itemsPerSector": 13
      },
      {
        "name": "Telecommunications",
        "itemsPerSector": 7
      },
      {
        "name": "MSPOTEQT",
        "itemsPerSector": 4
      }
    ]
  }
  ```

### 3. `list_tickers`
  - Title: List tickers by sector
  - Description: Return company tickers and names for an exchange on a specific date, grouped by sector.

  **Example Promt:** `#finmap-mcp List companies in the Real Estate sector`
  
  **Example Response:**
  ```json
  {
    "date": "2024-08-28",
    "exchange": "BIST",
    "currency": "TRY",
    "sectors": {
      "Real Estate": [
        {
          "ticker": "ADESE.E",
          "name": "ADESE GAYRIMENKUL"
        },
        {
          "ticker": "IHLGM.E",
          "name": "IHLAS GAYRIMENKUL"
        },
        {
          "ticker": "RGYAS.E",
          "name": "RONESANS GAYRIMENKUL YAT."
        },
        {
          "ticker": "SONME.E",
          "name": "SONMEZ FILAMENT"
        }
      ]
    }
  }
  ```

### 4. `search_companies`
  - Title: Search companies
  - Description: Find companies by partial name or ticker on an exchange and return best matches.

  **Example Promt:** `#finmap-mcp Search for companies named 'Sprouts'`

  **Example Response:**
  ```json
  {
    "date": "2025-08-28",
    "exchange": "NASDAQ",
    "currency": "USD",
    "query": "Sprouts",
    "matches": [
      {
        "ticker": "SFM",
        "name": "Sprouts Farmers Market Inc. Common Stock",
        "sector": "Consumer Staples",
        "score": 70
      }
    ]
  }
  ```

### 5. `get_market_overview`
  - Title: Market overview
  - Description: Get total market cap, volume, value, and performance for an exchange on a specific date with a sector breakdown.

  **Example Promt:** `#finmap-mcp market overview for Nasdaq`
  
  **Example Response:**
  ```json
  {
    "date": "2025-08-28",
    "exchange": "NASDAQ",
    "currency": "USD",
    "marketTotal": {
      "name": "Market",
      "marketCap": 41238186996017,
      "marketCapChangePct": 0.6213636439596683,
      "volume": 7606048313,
      "value": 0,
      "numTrades": 0,
      "itemsPerSector": 7974
    },
    "sectors": [
      {
        "name": "Basic Materials",
        "marketCap": 248122454077,
        "marketCapChangePct": -0.19965738920998274,
        "volume": 40489423,
        "value": 0,
        "numTrades": 0,
        "itemsPerSector": 36
      },
      {
        "name": "Consumer Discretionary",
        "marketCap": 5313249666194,
        "marketCapChangePct": 0.5556221951442668,
        "volume": 1029152348,
        "value": 0,
        "numTrades": 0,
        "itemsPerSector": 580
      },
      {
        "name": "ETFS",
        "marketCap": 0,
        "marketCapChangePct": null,
        "volume": 0,
        "value": 0,
        "numTrades": 0,
        "itemsPerSector": 3976
      },
      ...
      {
        "name": "Utilities",
        "marketCap": 333109407104,
        "marketCapChangePct": -0.1881153782118469,
        "volume": 39232326,
        "value": 0,
        "numTrades": 0,
        "itemsPerSector": 48
      }
    ]
  }
  ```

### 6. `get_sectors_overview`
  - Title: Sector performance
  - Description: Get aggregated performance metrics by sector for an exchange on a specific date.

  **Example Promt:** `#finmap-mcp Get overview for the Utilities sector`
  
  **Example Response:**
  ```json
  {
    "date": "2025-08-28",
    "exchange": "NASDAQ",
    "currency": "USD",
    "sectors": [
      {
        "name": "Utilities",
        "marketCap": 333109407104,
        "marketCapChangePct": -0.1881153782118469,
        "volume": 39232326,
        "value": 0,
        "numTrades": 0,
        "itemsPerSector": 48
      }
    ]
  }
  ```

### 7. `get_stock_data`
  - Title: Stock data by ticker
  - Description: Get detailed market data for a specific ticker on an exchange and date, including price, change, volume, value, market cap, and trades.

  **Example Promt:** `#finmap-mcp Dominion Energy, stock data`
  
  **Example Response:**
  ```json
  {
    "exchange": "nyse",
    "country": "United States",
    "currency": "USD",
    "sector": "Utilities",
    "ticker": "D",
    "nameEng": "Dominion Energy Inc. Common Stock",
    "nameOriginal": "",
    "priceOpen": 60.34,
    "priceLastSale": 59.81,
    "priceChangePct": -0.878,
    "volume": 3771759,
    "value": 0,
    "numTrades": 0,
    "marketCap": 51043865111,
    "listedFrom": "",
    "listedTill": ""
  }
  ```

### 8. `rank_stocks`
  - Title: Rank stocks
  - Description: Rank stocks on an exchange by a chosen metric (marketCap, priceChangePct, volume, value, numTrades) for a specific date with order and limit.

  **Example Promt:** `#finmap-mcp UK, rank stocks by market cap`
  
  **Example Response:**
  ```json
  {
    "date": "2025-08-28",
    "exchange": "LSE",
    "currency": "GBP",
    "sortBy": "marketCap",
    "order": "desc",
    "limit": 5,
    "count": 5,
    "stocks": [
      {
        "ticker": "AZN",
        "name": "ASTRAZENECA PLC ORD SHS $0.25",
        "sector": "Health Care",
        "priceLastSale": 11810,
        "priceChangePct": -0.5557426743011115,
        "marketCap": 184159063201,
        "volume": 0,
        "value": 0,
        "numTrades": 0
      },
      {
        "ticker": "HSBA",
        "name": "HSBC HLDGS PLC ORD $0.50 (UK REG)",
        "sector": "Finance",
        "priceLastSale": 955.8,
        "priceChangePct": 0.1676797317124293,
        "marketCap": 165599631829,
        "volume": 0,
        "value": 0,
        "numTrades": 0
      },
      {
        "ticker": "SHEL",
        "name": "SHELL PLC ORD EUR0.07",
        "sector": "Energy",
        "priceLastSale": 2715.5,
        "priceChangePct": 0,
        "marketCap": 158779785181,
        "volume": 0,
        "value": 0,
        "numTrades": 0
      },
      {
        "ticker": "ULVR",
        "name": "UNILEVER PLC ORD 3 1/9P",
        "sector": "Consumer Staples",
        "priceLastSale": 4610,
        "priceChangePct": -0.2812026822409691,
        "marketCap": 113348756395,
        "volume": 0,
        "value": 0,
        "numTrades": 0
      },
      {
        "ticker": "BHP",
        "name": "BHP GROUP LIMITED ORD NPV (DI)",
        "sector": "Basic Materials",
        "priceLastSale": 2073,
        "priceChangePct": 0.6310679611650485,
        "marketCap": 104611160052,
        "volume": 0,
        "value": 0,
        "numTrades": 0
      }
    ]
  }
  ```

### 9. `get_company_profile`
  - Title: Company profile (US)
  - Description: Get business description, industry, and background for a US-listed company by ticker.

  **Example Promt:** `#finmap-mcp Sprouts Farmers Market, get company profile`
  
  **Example Response:**
  ```json
  {
    "data": {
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
        "value": "Sprouts Farmers Market is an American specialty grocer offering an assortment highlighting fresh and naturally derived products. Its offerings   are especially focused on produce, which constituted around 21% of sales in fiscal 2021. Founded in 2002, the chain is most heavily concentrated in   California, which accounted for over one third of its 374 stores as of the end of fiscal 2021. All of the company's operations are in the United States,   with its stores largely located in the southern half of the country. The firm sells roughly 20,000 products (of which around 70% are attribute driven,   such as organic, plant-based, or catering to the keto or paleo diet), with private-label products accounting for about 16% of sales in fiscal 2021.   Perishable items accounted for 58% of fiscal 2021 sales."
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


## Data Provider

Data is sourced from [finmap.org](https://finmap.org) - an interactive platform for financial market visualization and analysis.

- **Website**: https://finmap.org
- **GitHub**: https://github.com/finmap-org  
- **Donate**: [Patreon](https://patreon.com/finmap) | [Boosty](https://boosty.to/finmap)