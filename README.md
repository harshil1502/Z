# Z - Financial Intel

> A comprehensive financial intelligence platform for the Indian stock market, inspired by Unusual Whales. Built by Magnificent Company.

## Executive Summary

**Z - Financial Intel** is an innovative fintech platform designed to democratize access to advanced options flow analytics, institutional trading insights, and market intelligence for Indian traders. By focusing on NSE (National Stock Exchange) and BSE (Bombay Stock Exchange), we deliver real-time tracking of unusual options activity, FII/DII flows, open interest changes, and bulk/block deals.

### Vision
Empower Indian retail and institutional traders with affordable, real-time market intelligence tools that were previously accessible only to sophisticated institutional players.

### Unique Value Proposition
- **Zero External API Costs**: Custom-built scrapers ensure full data control and no recurring API fees
- **India-First Design**: Tailored for NIFTY 50, BANKNIFTY, and Indian stock options
- **Regulatory Compliance**: Built with SEBI guidelines and DPDP Act compliance in mind
- **Affordable Access**: Freemium model to democratize market intelligence

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Core Features](#core-features)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Getting Started](#getting-started)
6. [Development Phases](#development-phases)
7. [Directory Structure](#directory-structure)
8. [Contributing](#contributing)
9. [License](#license)

---

## Project Overview

### Target Market
The Indian derivatives market has seen exponential growth, with NSE being the world's largest derivatives exchange by volume. Yet, retail traders lack access to sophisticated flow analysis tools available in western markets.

### User Personas

| Persona | Description | Key Needs |
|---------|-------------|-----------|
| **Retail Day Trader** | Active F&O trader, trades daily | Real-time options flow, quick alerts |
| **Swing Trader** | Holds positions 2-7 days | OI analysis, trend identification |
| **Institutional Analyst** | Works at funds/brokerages | Deep analytics, historical data |
| **Algo Developer** | Builds trading systems | API access, raw data feeds |

### Subscription Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Free** | ₹0/month | Delayed data (15 min), basic flow, limited alerts |
| **Pro** | ₹999/month | Real-time data, unlimited alerts, full analytics |
| **Elite** | ₹2,999/month | API access, historical data, priority support |
| **Institutional** | Custom | White-label, dedicated infrastructure |

---

## Core Features

### MVP Features (Phase 1)
- [ ] Real-time Options Flow Dashboard (NIFTY, BANKNIFTY)
- [ ] Unusual Activity Detection (OI spikes >3x average)
- [ ] Basic charting with price/OI correlation
- [ ] FII/DII daily flow summary

### Full Platform Features (Phase 2+)
- [ ] Custom Alert System (Telegram, Email, Push)
- [ ] Gamma Exposure (GEX) Calculator for indices
- [ ] Put/Call Ratio trends and heatmaps
- [ ] Bulk/Block deal tracker
- [ ] News integration with sentiment analysis
- [ ] Options chain with Greeks visualization
- [ ] Historical backtesting tools
- [ ] Mobile-responsive PWA

---

## Tech Stack

### Frontend
| Technology | Purpose | Reasoning |
|------------|---------|-----------|
| **React 18** | UI Framework | Component-based, excellent ecosystem |
| **Vite** | Build Tool | Lightning-fast HMR, optimal bundles |
| **Tailwind CSS** | Styling | Rapid UI development, utility-first |
| **TanStack Query** | Data Fetching | Caching, background updates |
| **Recharts** | Charting | React-native, customizable |
| **Zustand** | State Management | Lightweight, simple API |

### Backend
| Technology | Purpose | Reasoning |
|------------|---------|-----------|
| **Python 3.11+** | Primary Language | Excellent for data processing |
| **FastAPI** | API Framework | Async, auto-docs, type hints |
| **PostgreSQL** | Primary Database | ACID, time-series extensions |
| **Redis** | Caching/Queue | Real-time pub/sub, caching |
| **Celery** | Task Queue | Distributed task processing |

### Data Acquisition
| Technology | Purpose | Reasoning |
|------------|---------|-----------|
| **Playwright** | Browser Automation | Modern, reliable scraping |
| **BeautifulSoup4** | HTML Parsing | Simple, effective parsing |
| **Pandas** | Data Processing | Industry standard for analytics |
| **APScheduler** | Job Scheduling | Flexible cron-like scheduling |

### Infrastructure
| Technology | Purpose | Reasoning |
|------------|---------|-----------|
| **Docker** | Containerization | Consistent environments |
| **Nginx** | Reverse Proxy | Load balancing, SSL |
| **GitHub Actions** | CI/CD | Free for public repos |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Z - Financial Intel                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   NSE.india  │    │  BSE India   │    │  SEBI/News   │                   │
│  │   Website    │    │   Website    │    │   Sources    │                   │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                   │
│         │                   │                   │                            │
│         └─────────────────┬─┴───────────────────┘                            │
│                           │                                                  │
│                           ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                    DATA ACQUISITION LAYER                    │            │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │            │
│  │  │  Playwright │  │ BeautifulSoup│  │    APScheduler     │  │            │
│  │  │  Scrapers   │  │   Parsers   │  │   (Cron Jobs)      │  │            │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │            │
│  └─────────────────────────────┬───────────────────────────────┘            │
│                                │                                             │
│                                ▼                                             │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                    DATA PROCESSING LAYER                     │            │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │            │
│  │  │   Pandas    │  │  Unusual    │  │   Gamma/Greeks     │  │            │
│  │  │  Pipeline   │  │  Detector   │  │   Calculator       │  │            │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │            │
│  └─────────────────────────────┬───────────────────────────────┘            │
│                                │                                             │
│                                ▼                                             │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                      STORAGE LAYER                           │            │
│  │  ┌─────────────────────┐        ┌─────────────────────────┐ │            │
│  │  │     PostgreSQL      │        │        Redis            │ │            │
│  │  │  - Options Data     │        │  - Real-time Cache     │ │            │
│  │  │  - Historical       │        │  - Pub/Sub             │ │            │
│  │  │  - User Data        │        │  - Session Store       │ │            │
│  │  └─────────────────────┘        └─────────────────────────┘ │            │
│  └─────────────────────────────┬───────────────────────────────┘            │
│                                │                                             │
│                                ▼                                             │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                       API LAYER                              │            │
│  │  ┌─────────────────────────────────────────────────────────┐│            │
│  │  │                    FastAPI                               ││            │
│  │  │  - REST Endpoints    - WebSocket Server                 ││            │
│  │  │  - JWT Auth          - Rate Limiting                    ││            │
│  │  └─────────────────────────────────────────────────────────┘│            │
│  └─────────────────────────────┬───────────────────────────────┘            │
│                                │                                             │
│                                ▼                                             │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │                    FRONTEND LAYER                            │            │
│  │  ┌─────────────────────────────────────────────────────────┐│            │
│  │  │              React + Vite + Tailwind                    ││            │
│  │  │  - Dashboard       - Options Flow      - Alerts         ││            │
│  │  │  - Charts          - User Settings     - Analytics      ││            │
│  │  └─────────────────────────────────────────────────────────┘│            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker (recommended)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/magnificent-company/z-financial-intel.git
cd z-financial-intel

# Using Docker (Recommended)
docker-compose up -d

# Manual Setup
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
cp .env.example .env.local
npm run dev

# Scraper
cd scraper
pip install -r requirements.txt
python -m scraper.main
```

---

## Development Phases

### Phase 1: MVP Foundation (Weeks 1-4)
- [x] Project setup and architecture
- [ ] Core NSE options scraper
- [ ] Basic PostgreSQL schema
- [ ] FastAPI endpoints for options flow
- [ ] React dashboard with basic charts
- [ ] NIFTY/BANKNIFTY real-time flow display

### Phase 2: Feature Expansion (Weeks 5-10)
- [ ] WebSocket real-time updates
- [ ] Custom alert system
- [ ] User authentication (JWT)
- [ ] FII/DII flow integration
- [ ] Unusual activity detection algorithm
- [ ] Historical data storage

### Phase 3: Polish & Scale (Weeks 11-14)
- [ ] Performance optimization
- [ ] Security audit
- [ ] Load testing
- [ ] Mobile responsiveness
- [ ] Documentation

### Phase 4: Launch (Week 15+)
- [ ] Beta release
- [ ] User feedback integration
- [ ] Payment integration
- [ ] Production deployment

---

## Directory Structure

```
z-financial-intel/
├── README.md
├── docker-compose.yml
├── .github/
│   └── workflows/
│       └── ci.yml
├── docs/
│   ├── architecture.md
│   ├── api-reference.md
│   └── development-plan.md
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── routes/
│   │   │   └── dependencies.py
│   │   ├── core/
│   │   │   ├── security.py
│   │   │   └── database.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── options.py
│   │   ├── schemas/
│   │   │   └── options.py
│   │   └── services/
│   │       └── options_service.py
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── scraper/
│   ├── scraper/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── sources/
│   │   │   ├── nse.py
│   │   │   └── bse.py
│   │   ├── parsers/
│   │   │   └── options_parser.py
│   │   ├── processors/
│   │   │   └── unusual_detector.py
│   │   └── utils/
│   │       └── helpers.py
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── components/
    │   │   ├── Dashboard/
    │   │   ├── OptionsFlow/
    │   │   └── common/
    │   ├── hooks/
    │   ├── services/
    │   ├── store/
    │   └── types/
    ├── public/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── Dockerfile
```

---

## Non-Functional Requirements

### Performance
- Dashboard load time: < 2 seconds
- Data refresh latency: < 5 seconds during market hours
- API response time: < 200ms (p95)
- Support 10,000 concurrent users

### Security
- HTTPS only (TLS 1.3)
- JWT-based authentication
- Rate limiting (100 req/min per user)
- Input validation and sanitization
- DPDP Act compliance for user data

### Scalability
- Horizontal scaling via containerization
- Database read replicas for analytics
- CDN for static assets
- Microservices-ready architecture

### Availability
- 99.9% uptime during market hours (9:00 AM - 3:30 PM IST)
- Graceful degradation if data sources unavailable
- Health monitoring and alerting

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines.

---

## License

Proprietary - Magnificent Company. All rights reserved.

---

## Contact

- **Project Lead**: Magnificent Company Engineering Team
- **Email**: engineering@magnificentcompany.com
- **Documentation**: [docs/](./docs/)

---

*Built with dedication for the Indian trading community by Magnificent Company*
