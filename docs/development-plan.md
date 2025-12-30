# Z - Financial Intel: Development Plan

## Document Information
- **Version**: 1.0
- **Last Updated**: December 2024
- **Status**: Active Development

---

## 1. Executive Summary

### 1.1 Project Vision
Z - Financial Intel aims to become the premier options flow and market intelligence platform for Indian traders, providing Unusual Whales-level analytics tailored specifically for NSE and BSE markets.

### 1.2 Goals
1. **MVP Launch**: Deliver core options flow dashboard within 4 weeks
2. **Zero API Costs**: Custom scrapers for all data acquisition
3. **Market Fit**: Serve 10,000+ active users within 6 months
4. **Revenue**: Achieve ₹10L MRR within 12 months

### 1.3 Success Metrics
| Metric | Target (MVP) | Target (6 months) |
|--------|--------------|-------------------|
| Daily Active Users | 500 | 5,000 |
| Data Latency | <10 sec | <3 sec |
| Uptime | 95% | 99.9% |
| Paid Conversions | - | 5% |

---

## 2. Core Features Specification

### 2.1 Options Flow Dashboard

#### Major Details
The dashboard displays real-time options flow for NIFTY 50, BANKNIFTY, and top stock options. Each flow entry shows strike, expiry, type (CE/PE), premium, volume, OI change, and categorization (bullish/bearish/neutral).

#### Minor Details
```
Data Points per Flow Entry:
├── Symbol (e.g., NIFTY, BANKNIFTY, RELIANCE)
├── Strike Price (e.g., 21500)
├── Expiry Date (e.g., 28-Dec-2024)
├── Option Type (CE/PE)
├── Trade Time (HH:MM:SS IST)
├── LTP (Last Traded Price)
├── Volume (contracts traded)
├── OI (Open Interest)
├── OI Change (vs previous)
├── Premium Value (in ₹)
├── IV (Implied Volatility)
├── Delta (Greek)
└── Classification (Unusual/Normal)
```

**Unusual Activity Criteria**:
- Volume > 3x 20-day average
- Premium > ₹1 crore single trade
- OI spike > 50% in 30 minutes
- Block deals > 500 lots

### 2.2 Unusual Activity Detection Algorithm

#### Major Details
Custom algorithms detect statistically significant deviations in options trading patterns that may indicate informed trading or institutional activity.

#### Minor Details
```python
# Pseudocode for Unusual Detection
def detect_unusual_activity(current_data, historical_baseline):
    unusual_flags = []

    # Volume Spike Detection
    avg_volume = historical_baseline.volume_20d_avg
    if current_data.volume > (avg_volume * VOLUME_SPIKE_THRESHOLD):  # 3x
        unusual_flags.append({
            'type': 'VOLUME_SPIKE',
            'severity': calculate_severity(current_data.volume, avg_volume),
            'zscore': (current_data.volume - avg_volume) / historical_baseline.volume_std
        })

    # Premium Size Detection
    if current_data.premium_value > PREMIUM_THRESHOLD:  # ₹1 crore
        unusual_flags.append({
            'type': 'LARGE_PREMIUM',
            'severity': 'HIGH',
            'value': current_data.premium_value
        })

    # OI Spike Detection
    oi_change_pct = (current_data.oi - historical_baseline.prev_oi) / historical_baseline.prev_oi
    if abs(oi_change_pct) > OI_SPIKE_THRESHOLD:  # 50%
        unusual_flags.append({
            'type': 'OI_SPIKE',
            'direction': 'LONG_BUILD' if oi_change_pct > 0 else 'LONG_UNWINDING',
            'change_pct': oi_change_pct
        })

    return unusual_flags
```

### 2.3 FII/DII Flow Integration

#### Major Details
Display daily and historical Foreign Institutional Investor (FII) and Domestic Institutional Investor (DII) activity across cash and derivatives segments.

#### Minor Details
```
Data Sources:
├── NSE Daily FII/DII Reports (https://www.nseindia.com/reports)
├── NSDL FPI Data
└── Provisional figures (intraday) vs Final (EOD)

Metrics Tracked:
├── Cash Segment (Buy/Sell/Net)
├── Index Futures (Long/Short/Net)
├── Index Options (Long/Short/Net)
├── Stock Futures
└── Stock Options
```

### 2.4 Gamma Exposure (GEX) Calculator

#### Major Details
Calculate and visualize dealer gamma exposure for NIFTY and BANKNIFTY to identify potential support/resistance levels and volatility inflection points.

#### Minor Details
```
GEX Calculation:
1. Fetch entire options chain for underlying
2. For each strike:
   - Calculate gamma using Black-Scholes
   - Estimate dealer positioning (assume dealers short options)
   - GEX at strike = Gamma × OI × 100 × Spot Price × 0.01
3. Aggregate to find:
   - Total GEX (positive = dampening, negative = amplifying)
   - Key gamma levels (strikes with highest absolute GEX)
   - Zero gamma point (flip level)
```

---

## 3. Data Acquisition System

### 3.1 Data Sources

| Source | Data Type | Frequency | Method |
|--------|-----------|-----------|--------|
| NSE India | Options Chain | 1 min | Web Scraping |
| NSE India | Market Stats | 5 min | API/Scraping |
| NSE India | FII/DII | Daily | Report Scraping |
| BSE India | Options Data | 1 min | Web Scraping |
| SEBI | Bulk/Block Deals | Daily | Report Scraping |
| Moneycontrol | News | 15 min | RSS/Scraping |

### 3.2 NSE Options Scraper Architecture

#### Major Details
Build a robust, fault-tolerant scraper using Playwright for dynamic content rendering, with intelligent rate limiting and anti-detection measures.

#### Minor Details

```python
# NSE Scraper Flow
"""
1. Session Management
   - Rotate user agents
   - Manage cookies/sessions
   - Handle CAPTCHA (rare on NSE)

2. Request Strategy
   - Primary: Direct API endpoints (if discovered)
   - Fallback: Full page scraping
   - Rate: 1 request per 2 seconds (avoid blocks)

3. Data Extraction
   - Options chain JSON from embedded scripts
   - Parse strike data, OI, volumes
   - Handle missing/null values

4. Error Handling
   - Retry with exponential backoff
   - Alert on consecutive failures
   - Fallback to cached data
"""

# NSE Known Endpoints (subject to change)
NSE_ENDPOINTS = {
    'options_chain': 'https://www.nseindia.com/api/option-chain-indices?symbol={symbol}',
    'quote': 'https://www.nseindia.com/api/quote-derivative?symbol={symbol}',
    'market_status': 'https://www.nseindia.com/api/marketStatus',
    'fii_dii': 'https://www.nseindia.com/api/fiidiiTradeReact',
}

# Headers required for NSE
REQUIRED_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.nseindia.com/',
}
```

### 3.3 Rate Limiting & Anti-Detection

#### Major Details
Implement sophisticated request management to avoid IP blocks while maintaining data freshness.

#### Minor Details
```
Rate Limiting Strategy:
├── Base rate: 1 request/2 seconds per endpoint
├── Burst allowance: 5 requests/10 seconds
├── Cool-down on 429: Exponential backoff (4s, 8s, 16s, 32s)
└── Daily reset: Clear counters at midnight IST

Anti-Detection Measures:
├── User-Agent rotation (pool of 20+ real browsers)
├── Session persistence (mimic real user behavior)
├── Request timing jitter (±500ms randomization)
├── Referer chain (visit homepage first)
└── Cookie management (accept and persist cookies)

Proxy Strategy (if needed):
├── Residential proxies for production
├── Rotate every 100 requests
└── Geographic: India-based IPs preferred
```

### 3.4 Data Processing Pipeline

```
Raw Data → Validation → Transformation → Enrichment → Storage

Validation:
├── Schema validation (required fields present)
├── Type checking (numeric fields are numbers)
├── Range validation (strike prices realistic)
└── Timestamp validation (market hours data)

Transformation:
├── Normalize field names
├── Convert to standard types
├── Calculate derived fields (premium = LTP × lot size)
└── Standardize timestamps to IST

Enrichment:
├── Add historical baseline
├── Calculate Z-scores
├── Flag unusual activity
├── Compute Greeks (if not available)
└── Add sector/industry tags
```

---

## 4. Database Schema

### 4.1 PostgreSQL Schema

```sql
-- Core Tables

CREATE TABLE symbols (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100),
    exchange VARCHAR(10) NOT NULL, -- NSE, BSE
    segment VARCHAR(20), -- INDEX, EQUITY
    lot_size INTEGER,
    tick_size DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE options_contracts (
    id SERIAL PRIMARY KEY,
    symbol_id INTEGER REFERENCES symbols(id),
    strike_price DECIMAL(12, 2) NOT NULL,
    expiry_date DATE NOT NULL,
    option_type CHAR(2) NOT NULL, -- CE, PE
    contract_symbol VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol_id, strike_price, expiry_date, option_type)
);

CREATE TABLE options_flow (
    id BIGSERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES options_contracts(id),
    timestamp TIMESTAMP NOT NULL,
    ltp DECIMAL(12, 2),
    volume BIGINT,
    oi BIGINT,
    oi_change BIGINT,
    bid_price DECIMAL(12, 2),
    ask_price DECIMAL(12, 2),
    bid_qty BIGINT,
    ask_qty BIGINT,
    iv DECIMAL(8, 4),
    delta DECIMAL(8, 6),
    gamma DECIMAL(12, 10),
    theta DECIMAL(8, 4),
    vega DECIMAL(8, 4),
    underlying_price DECIMAL(12, 2),
    is_unusual BOOLEAN DEFAULT false,
    unusual_flags JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast queries
CREATE INDEX idx_options_flow_timestamp ON options_flow(timestamp DESC);
CREATE INDEX idx_options_flow_contract ON options_flow(contract_id);
CREATE INDEX idx_options_flow_unusual ON options_flow(is_unusual) WHERE is_unusual = true;

CREATE TABLE fii_dii_data (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    category VARCHAR(10) NOT NULL, -- FII, DII
    segment VARCHAR(20) NOT NULL, -- CASH, INDEX_FUTURES, etc.
    buy_value DECIMAL(18, 2),
    sell_value DECIMAL(18, 2),
    net_value DECIMAL(18, 2),
    is_provisional BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, category, segment)
);

CREATE TABLE bulk_block_deals (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    symbol_id INTEGER REFERENCES symbols(id),
    deal_type VARCHAR(10) NOT NULL, -- BULK, BLOCK
    client_name VARCHAR(200),
    buy_sell CHAR(1), -- B, S
    quantity BIGINT,
    price DECIMAL(12, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Management Tables

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    subscription_tier VARCHAR(20) DEFAULT 'free',
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(100),
    symbol VARCHAR(20),
    alert_type VARCHAR(50), -- VOLUME_SPIKE, PREMIUM_THRESHOLD, etc.
    conditions JSONB,
    notification_channels JSONB, -- ['email', 'telegram']
    is_active BOOLEAN DEFAULT true,
    last_triggered TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_watchlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(100),
    symbols JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 Redis Schema

```
# Real-time Data Cache
options:flow:{symbol}:{expiry}:{strike}:{type} -> JSON (TTL: 60s)
options:chain:{symbol} -> JSON (TTL: 30s)
market:status -> JSON (TTL: 10s)
fii:dii:today -> JSON (TTL: 300s)

# User Sessions
session:{session_id} -> JSON (TTL: 24h)
user:{user_id}:alerts -> SET of alert_ids

# Rate Limiting
ratelimit:{ip} -> counter (TTL: 60s)
ratelimit:{user_id} -> counter (TTL: 60s)

# Pub/Sub Channels
channel:flow:{symbol} -> Real-time flow updates
channel:alerts:{user_id} -> User-specific alerts
channel:market:status -> Market open/close events
```

---

## 5. API Specification

### 5.1 REST Endpoints

```yaml
# Options Flow API
GET /api/v1/flow
  Query Params:
    - symbol: string (optional, e.g., "NIFTY")
    - expiry: date (optional)
    - type: string (optional, "CE" or "PE")
    - unusual_only: boolean (default: false)
    - limit: integer (default: 100, max: 500)
    - offset: integer (default: 0)
  Response: List of OptionsFlow objects

GET /api/v1/flow/unusual
  Query Params:
    - symbol: string (optional)
    - severity: string (optional, "LOW", "MEDIUM", "HIGH")
    - limit: integer (default: 50)
  Response: List of UnusualActivity objects

GET /api/v1/options/chain/{symbol}
  Response: Full options chain with Greeks

GET /api/v1/analytics/gex/{symbol}
  Response: Gamma exposure analysis

# Institutional Flow API
GET /api/v1/fii-dii
  Query Params:
    - date: date (optional, default: today)
    - range: string (optional, "1W", "1M", "3M")
  Response: FII/DII data

GET /api/v1/bulk-deals
GET /api/v1/block-deals

# User API
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET /api/v1/user/profile
PUT /api/v1/user/profile

# Alerts API
GET /api/v1/alerts
POST /api/v1/alerts
PUT /api/v1/alerts/{id}
DELETE /api/v1/alerts/{id}

# Watchlist API
GET /api/v1/watchlists
POST /api/v1/watchlists
PUT /api/v1/watchlists/{id}
DELETE /api/v1/watchlists/{id}
```

### 5.2 WebSocket Events

```yaml
# Client -> Server
subscribe:
  - channel: "flow:NIFTY"
  - channel: "flow:BANKNIFTY"
  - channel: "alerts"

unsubscribe:
  - channel: "flow:NIFTY"

# Server -> Client
flow_update:
  - symbol: "NIFTY"
  - data: OptionsFlow object

unusual_alert:
  - type: "VOLUME_SPIKE"
  - data: UnusualActivity object

market_status:
  - status: "OPEN" | "CLOSED" | "PRE_OPEN"
  - next_event: timestamp
```

---

## 6. Development Phases

### Phase 1: MVP Foundation (Weeks 1-4)

#### Week 1: Project Setup
| Task | Owner | Status |
|------|-------|--------|
| Initialize monorepo structure | Lead | Done |
| Set up development environment | Lead | Done |
| Configure Docker Compose | DevOps | Pending |
| Create database schemas | Backend | Pending |
| Set up CI/CD pipeline | DevOps | Pending |

#### Week 2: Data Acquisition
| Task | Owner | Status |
|------|-------|--------|
| Build NSE options chain scraper | Backend | Pending |
| Implement data validation | Backend | Pending |
| Create APScheduler jobs | Backend | Pending |
| Initial data population | Backend | Pending |

#### Week 3: Backend API
| Task | Owner | Status |
|------|-------|--------|
| FastAPI project structure | Backend | Pending |
| Options flow endpoints | Backend | Pending |
| Database models with SQLAlchemy | Backend | Pending |
| Basic error handling | Backend | Pending |

#### Week 4: Frontend Dashboard
| Task | Owner | Status |
|------|-------|--------|
| React/Vite project setup | Frontend | Pending |
| Dashboard layout | Frontend | Pending |
| Options flow table component | Frontend | Pending |
| Basic charting | Frontend | Pending |
| API integration | Frontend | Pending |

#### MVP Deliverables
- [ ] Working NSE scraper for NIFTY/BANKNIFTY options
- [ ] PostgreSQL with options flow data
- [ ] REST API for options data retrieval
- [ ] Basic dashboard displaying real-time flow
- [ ] Docker deployment

### Phase 2: Feature Expansion (Weeks 5-10)

#### Key Features
1. WebSocket real-time updates
2. User authentication system
3. Custom alert creation
4. Unusual activity detection
5. FII/DII data integration
6. Historical data views

#### Technical Milestones
- [ ] WebSocket server implementation
- [ ] JWT authentication flow
- [ ] Alert engine with notifications
- [ ] Email/Telegram integration
- [ ] Expanded scraper coverage (more symbols)
- [ ] Performance optimization

### Phase 3: Polish & Scale (Weeks 11-14)

#### Focus Areas
1. Security hardening
2. Performance optimization
3. Mobile responsiveness
4. Load testing
5. Documentation

### Phase 4: Launch (Week 15+)

#### Launch Checklist
- [ ] Security audit complete
- [ ] Load tested for 10,000 users
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery tested
- [ ] Legal/compliance review
- [ ] Marketing materials ready
- [ ] Support documentation complete

---

## 7. Risk Assessment

### 7.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| NSE blocks scraping | Medium | High | Multiple IP strategy, rate limiting, fallback sources |
| Data accuracy issues | Medium | High | Validation pipelines, reconciliation with EOD data |
| Scalability bottlenecks | Low | Medium | Early load testing, horizontal scaling design |
| Real-time latency | Medium | Medium | Redis caching, optimized queries |

### 7.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Regulatory changes | Low | High | SEBI compliance monitoring, legal review |
| Competition | High | Medium | Differentiation through UX and unique features |
| Low user adoption | Medium | High | Freemium model, community building |

### 7.3 Legal Considerations

```
Web Scraping Legality (India):
├── Terms of Service review for NSE/BSE websites
├── Data is publicly available (not behind login)
├── No personal data being scraped
├── Rate limiting to avoid service disruption
└── Legal opinion recommended before launch

DPDP Act Compliance:
├── User consent for data collection
├── Data minimization principle
├── Secure storage of user data
├── Right to deletion implementation
└── Privacy policy documentation
```

---

## 8. Assumptions & Clarifications

### Assumptions Made
1. NSE/BSE websites will continue to provide public access to options data
2. No immediate regulatory restrictions on options flow analytics
3. Team has access to development infrastructure
4. Budget available for minimal hosting costs (Docker, small VPS)

### Clarifications Needed
1. Specific feature prioritization beyond MVP?
2. Target launch date constraints?
3. Team size and skill distribution?
4. Budget for infrastructure and legal review?
5. Preferred notification channels (Telegram, Email, SMS)?

---

## 9. Conclusion

This development plan provides a comprehensive roadmap for building Z - Financial Intel. The phased approach ensures we deliver value quickly with the MVP while building toward a full-featured platform. Our custom data acquisition system eliminates external API dependencies, giving us full control over costs and data quality.

The focus on Indian market specifics, combined with modern technology choices, positions Z - Financial Intel to become a leading options analytics platform for the growing Indian derivatives trading community.

---

*Document maintained by Magnificent Company Engineering Team*
