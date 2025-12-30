# Z - Financial Intel: System Architecture

## 1. Architecture Overview

Z - Financial Intel follows a modular, microservices-ready architecture designed for scalability, maintainability, and cost-efficiency. The system is organized into distinct layers, each with clear responsibilities.

## 2. System Components

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENTS                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Web App   │  │ Mobile PWA  │  │  API Users  │  │  Webhook Subscribers    │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
└─────────┼────────────────┼────────────────┼─────────────────────┼───────────────┘
          │                │                │                     │
          └────────────────┴────────────────┴─────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              LOAD BALANCER / CDN                                 │
│                         (Nginx / Cloudflare - Optional)                          │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
┌───────────────────────────────────┐   ┌───────────────────────────────────────┐
│         FRONTEND SERVICE          │   │            API GATEWAY                 │
│  ┌─────────────────────────────┐  │   │  ┌───────────────────────────────────┐│
│  │    React + Vite + Tailwind  │  │   │  │           FastAPI                 ││
│  │                             │  │   │  │  - Authentication                 ││
│  │  - Dashboard                │  │   │  │  - Rate Limiting                  ││
│  │  - Options Flow             │  │   │  │  - Request Routing                ││
│  │  - Analytics                │  │   │  │  - Response Caching               ││
│  │  - User Settings            │  │   │  └───────────────────────────────────┘│
│  └─────────────────────────────┘  │   └───────────────────────────────────────┘
└───────────────────────────────────┘                   │
                                                        │
                    ┌───────────────────────────────────┼───────────────────────┐
                    │                                   │                       │
                    ▼                                   ▼                       ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐ ┌─────────────────────┐
│      OPTIONS SERVICE          │ │     ANALYTICS SERVICE         │ │    ALERT SERVICE    │
│  - Flow data queries          │ │  - Unusual detection          │ │  - User alerts      │
│  - Chain data                 │ │  - GEX calculations           │ │  - Notifications    │
│  - Historical data            │ │  - Statistics                 │ │  - Webhooks         │
└───────────────────────────────┘ └───────────────────────────────┘ └─────────────────────┘
                    │                         │                             │
                    └─────────────────────────┼─────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                          │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────┐  │
│  │      PostgreSQL         │  │         Redis           │  │   File Storage  │  │
│  │  - Options data         │  │  - Cache layer          │  │  - Logs         │  │
│  │  - User data            │  │  - Pub/Sub              │  │  - Backups      │  │
│  │  - Historical           │  │  - Sessions             │  │  - Reports      │  │
│  └─────────────────────────┘  └─────────────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                              ▲
                                              │
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DATA ACQUISITION LAYER                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                         Scraper Service (Python)                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │ NSE Scraper │  │ BSE Scraper │  │ News Scraper│  │ FII/DII Scraper │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘   │  │
│  │                              │                                            │  │
│  │                              ▼                                            │  │
│  │  ┌─────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    Data Processing Pipeline                         │  │  │
│  │  │  Validate → Transform → Enrich → Detect Unusual → Store             │  │  │
│  │  └─────────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                              │                                                   │
│                              ▼                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                         APScheduler / Celery                              │  │
│  │  - Cron jobs for data fetching                                           │  │
│  │  - Task queue for async processing                                       │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL DATA SOURCES                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  NSE India  │  │  BSE India  │  │    SEBI     │  │   News Sources          │ │
│  │  Website    │  │  Website    │  │  Disclosures│  │  (Moneycontrol, ET)     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 3. Component Details

### 3.1 Frontend Service

**Technology**: React 18 + Vite + Tailwind CSS + TanStack Query

**Responsibilities**:
- Render dashboard and analytics views
- Handle user interactions
- Manage client-side state
- WebSocket connection for real-time updates

**Key Features**:
```
Frontend Architecture:
├── Pages/
│   ├── Dashboard (main flow view)
│   ├── OptionsChain (detailed chain view)
│   ├── Analytics (GEX, statistics)
│   ├── Alerts (user alert management)
│   └── Settings (user preferences)
├── Components/
│   ├── FlowTable (real-time flow display)
│   ├── Charts (various chart types)
│   ├── AlertBuilder (alert configuration)
│   └── Common (buttons, modals, etc.)
├── Hooks/
│   ├── useOptionsFlow (data fetching)
│   ├── useWebSocket (real-time connection)
│   └── useAuth (authentication)
└── Store/
    └── Zustand stores for state
```

### 3.2 API Gateway / Backend

**Technology**: Python 3.11 + FastAPI

**Responsibilities**:
- RESTful API endpoints
- WebSocket server for real-time
- Authentication & authorization
- Rate limiting
- Request validation

**API Structure**:
```
/api/v1/
├── /auth
│   ├── POST /register
│   ├── POST /login
│   ├── POST /refresh
│   └── POST /logout
├── /flow
│   ├── GET / (list with filters)
│   ├── GET /unusual
│   └── GET /stream (WebSocket upgrade)
├── /options
│   ├── GET /chain/{symbol}
│   └── GET /expiries/{symbol}
├── /analytics
│   ├── GET /gex/{symbol}
│   ├── GET /pcr/{symbol}
│   └── GET /statistics
├── /fii-dii
│   ├── GET /today
│   └── GET /historical
├── /alerts
│   ├── GET /
│   ├── POST /
│   ├── PUT /{id}
│   └── DELETE /{id}
└── /user
    ├── GET /profile
    ├── PUT /profile
    └── GET /watchlists
```

### 3.3 Data Acquisition Service

**Technology**: Python + Playwright + BeautifulSoup + APScheduler

**Responsibilities**:
- Fetch data from NSE/BSE websites
- Parse and validate scraped data
- Transform to standard format
- Detect unusual activity
- Store in database

**Scraper Architecture**:
```
Scraper Service:
├── Sources/
│   ├── NSESource
│   │   ├── OptionsChainScraper
│   │   ├── MarketStatusScraper
│   │   └── FIIDIIScraper
│   └── BSESource
│       └── OptionsChainScraper
├── Parsers/
│   ├── OptionsChainParser
│   ├── FIIDIIParser
│   └── BulkDealParser
├── Processors/
│   ├── ValidationProcessor
│   ├── TransformProcessor
│   ├── EnrichmentProcessor
│   └── UnusualDetector
├── Storage/
│   ├── PostgresWriter
│   └── RedisPublisher
└── Scheduler/
    └── APScheduler jobs
```

### 3.4 Database Layer

#### PostgreSQL (Primary Database)
- **Purpose**: Persistent storage for all structured data
- **Tables**: symbols, options_contracts, options_flow, fii_dii_data, users, alerts
- **Optimization**: TimescaleDB extension for time-series data (optional)

#### Redis (Cache & Pub/Sub)
- **Purpose**: Real-time caching and message passing
- **Use Cases**:
  - Cache frequently accessed data (options chains)
  - Session storage
  - Pub/Sub for real-time updates to clients
  - Rate limiting counters

## 4. Data Flow

### 4.1 Scraping Flow (Every 1-5 minutes)

```
1. APScheduler triggers scrape job
           │
           ▼
2. Scraper fetches NSE/BSE pages
   - Uses Playwright for dynamic content
   - Applies rate limiting
           │
           ▼
3. Parser extracts structured data
   - Validates data integrity
   - Handles missing fields
           │
           ▼
4. Processor enriches data
   - Calculates Greeks (if needed)
   - Detects unusual activity
   - Adds historical context
           │
           ▼
5. Writer stores data
   - PostgreSQL for persistence
   - Redis for cache update
           │
           ▼
6. Publisher broadcasts updates
   - Redis Pub/Sub to connected clients
   - Trigger alerts if conditions met
```

### 4.2 Client Request Flow

```
1. Client makes API request
           │
           ▼
2. API Gateway receives request
   - Validate JWT token
   - Check rate limits
   - Parse request parameters
           │
           ▼
3. Check Redis cache
   ├─ HIT: Return cached data
   │
   └─ MISS: Query PostgreSQL
              │
              ▼
           4. Query database
              - Execute optimized query
              - Transform results
                     │
                     ▼
           5. Update cache
              - Store in Redis with TTL
                     │
                     ▼
           6. Return response to client
```

### 4.3 Real-time WebSocket Flow

```
1. Client opens WebSocket connection
   - Authenticates with JWT
   - Subscribes to channels (e.g., "flow:NIFTY")
           │
           ▼
2. Server registers subscription
   - Maps client to Redis channels
   - Maintains connection state
           │
           ▼
3. Scraper publishes new data to Redis
           │
           ▼
4. WebSocket server receives from Redis
   - Filters by subscription
           │
           ▼
5. Server pushes to subscribed clients
   - Formats message
   - Sends via WebSocket
```

## 5. Security Architecture

### 5.1 Authentication Flow

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│ Client  │                    │   API   │                    │   DB    │
└────┬────┘                    └────┬────┘                    └────┬────┘
     │                              │                              │
     │  POST /auth/login            │                              │
     │  {email, password}           │                              │
     │─────────────────────────────>│                              │
     │                              │                              │
     │                              │  Verify credentials          │
     │                              │─────────────────────────────>│
     │                              │<─────────────────────────────│
     │                              │                              │
     │                              │  Generate JWT                │
     │                              │  (access + refresh tokens)   │
     │                              │                              │
     │  {access_token,              │                              │
     │   refresh_token}             │                              │
     │<─────────────────────────────│                              │
     │                              │                              │
     │  GET /flow                   │                              │
     │  Authorization: Bearer xxx   │                              │
     │─────────────────────────────>│                              │
     │                              │                              │
     │                              │  Validate JWT                │
     │                              │  Check permissions           │
     │                              │                              │
     │  {flow_data}                 │                              │
     │<─────────────────────────────│                              │
     │                              │                              │
```

### 5.2 Security Measures

```
Security Layers:
├── Transport Security
│   ├── HTTPS only (TLS 1.3)
│   ├── HSTS headers
│   └── Certificate pinning (mobile)
├── Authentication
│   ├── JWT with short expiry (15 min)
│   ├── Refresh token rotation
│   ├── Password hashing (bcrypt)
│   └── Optional 2FA (TOTP)
├── Authorization
│   ├── Role-based access control
│   ├── Subscription tier checks
│   └── Resource ownership validation
├── Input Validation
│   ├── Pydantic models for all inputs
│   ├── SQL injection prevention (ORM)
│   └── XSS prevention (output encoding)
├── Rate Limiting
│   ├── Per-IP limits
│   ├── Per-user limits
│   └── Tier-based quotas
└── Monitoring
    ├── Failed login tracking
    ├── Anomaly detection
    └── Audit logging
```

## 6. Scalability Considerations

### 6.1 Horizontal Scaling

```
Current (MVP):
┌─────────────────────────────────────┐
│           Single Server             │
│  ┌─────────┐ ┌─────────┐ ┌───────┐ │
│  │ Frontend│ │ Backend │ │Scraper│ │
│  └─────────┘ └─────────┘ └───────┘ │
│  ┌─────────────────────────────────┐│
│  │  PostgreSQL + Redis (local)    ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘

Future (Scaled):
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                          │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  API Server 1 │     │  API Server 2 │     │  API Server N │
└───────────────┘     └───────────────┘     └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ PostgreSQL    │     │ Redis Cluster │     │ Scraper       │
│ Primary/Read  │     │               │     │ Service       │
└───────────────┘     └───────────────┘     └───────────────┘
```

### 6.2 Performance Optimization Strategies

```
Database:
├── Connection pooling (SQLAlchemy)
├── Read replicas for queries
├── Proper indexing
├── Query optimization
└── Partitioning for historical data

Caching:
├── Multi-level caching
│   ├── L1: In-memory (application)
│   └── L2: Redis (distributed)
├── Cache-aside pattern
├── Intelligent TTLs
└── Cache warming on startup

API:
├── Response compression (gzip)
├── Pagination for large results
├── Field selection (GraphQL-like)
└── Background task offloading

Frontend:
├── CDN for static assets
├── Code splitting
├── Lazy loading
├── Service worker caching
└── Virtual scrolling for large lists
```

## 7. Monitoring & Observability

```
Monitoring Stack:
├── Metrics (Prometheus)
│   ├── Request latency
│   ├── Error rates
│   ├── Scraper success rates
│   └── Database query times
├── Logging (Structured JSON)
│   ├── Application logs
│   ├── Access logs
│   └── Error logs
├── Tracing (Optional: Jaeger)
│   └── Request flow tracing
└── Alerting
    ├── Scraper failures
    ├── High error rates
    ├── Database connection issues
    └── Memory/CPU thresholds
```

## 8. Deployment Architecture

### 8.1 Docker Compose (Development/MVP)

```yaml
services:
  frontend:
    build: ./frontend
    ports: ["3000:3000"]

  backend:
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [postgres, redis]

  scraper:
    build: ./scraper
    depends_on: [postgres, redis]

  postgres:
    image: postgres:15
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine

volumes:
  postgres_data:
```

### 8.2 Production Deployment (Future)

```
Production Stack:
├── Container Orchestration: Docker Swarm / K8s
├── Database: Managed PostgreSQL (RDS / Cloud SQL)
├── Cache: Managed Redis (ElastiCache / Memorystore)
├── Object Storage: S3 / GCS for backups
├── CDN: Cloudflare for static assets
├── SSL: Let's Encrypt / Cloudflare
└── Monitoring: Grafana + Prometheus
```

---

*Architecture document maintained by Magnificent Company Engineering Team*
