# node-defenders-api

Main game API for [Node Defenders](https://defenders.blockchaingods.io) — the first title in the [Blockchain Gods](https://blockchaingods.io) cross-game Web3 universe.

## Philosophy

Node Defenders treats blockchain as backend infrastructure, not as a product hook. Players engage because the game is fun. Blockchain handles asset ownership, economy settlement, and player identity — invisibly.

This API is the game's backend brain. It manages session state, SOUL economy, leaderboards, and marketplace interactions. All on-chain actions are delegated to an isolated signing service ([node-defenders-signer](https://github.com/npanium/node-defenders-signer)) — this API never touches private keys.

---

## Architecture

```
Unity/WebGL Client
    │
    │  HTTP + JWT
    ▼
node-defenders-api  (this service)
    │
    ├── PostgreSQL        — players, sessions, leaderboard, marketplace, NFTs
    ├── Redis (Upstash)   — in-game SOUL tracking (fast writes during gameplay)
    │
    │  HTTP + X-Internal-Key
    ▼
node-defenders-signer
    │
    ├── Cloudflare D1     — custodial wallets (encrypted private keys)
    └── Avalanche C-Chain — on-chain settlement
```

### Key design decisions

**Guest play**
Players can start playing immediately without connecting a wallet. A guest player record and custodial wallet are created silently on "Play as Guest". Guest JWT is stored in localStorage and reused on return visits. Guests can upgrade to a full account via Web3Auth or SIWE at any time — progress merge is planned post-beta.

**Custodial wallets for beta**
Players never manage keys or pay gas. On first login, the API creates a player record and calls the signer to generate a custodial wallet. The custodial wallet address becomes the player's on-chain identity. The migration path post-beta is ERC-4337 account abstraction.

**SOUL tracked in DB, settled on-chain in batches**
During gameplay, SOUL earnings are written to Redis on every increment — sub-millisecond, no chain overhead. On session end, the balance is flushed to Postgres and a mint is queued in the signer's D1. The signer's cron job settles the batch on-chain every 5 minutes. Marketplace actions trigger an immediate on-chain mint before proceeding.

**Signing service isolation**
This API never holds or sees private keys. All on-chain writes go through the signer via authenticated HTTP (`X-Internal-Key`). The signer is the only component with access to the wallets database.

**Dual auth**
Custodial players authenticate via Web3Auth (social login). Self-custody players authenticate via SIWE. Both paths issue the same API JWT — auth method is transparent to the rest of the system.

**Blockchain invisible to the client**
The game client talks to this API using standard REST — sessions, balances, listings. It has no knowledge of wallets, private keys, gas, or token contracts.

---

## Token economy

| Token | Type | How earned | How spent |
|---|---|---|---|
| Shards | In-session only | Gameplay | Turret placement (session-scoped) |
| SOUL | ERC-20 + EIP-2612 | Gameplay (settled post-session) | Marketplace upgrades |
| GODS | ERC-20 + EIP-2612 | External acquire only | Marketplace upgrades (premium) |

SOUL balance in Postgres is the source of truth during gameplay. On-chain balance is the settlement layer.

---

## Modules

| Module | Responsibility |
|---|---|
| `AuthModule` | Web3Auth JWT validation, SIWE verification, API JWT issuance |
| `PlayerModule` | Player creation, custodial wallet provisioning, profile reads |
| `SessionModule` | Game session lifecycle, Redis SOUL tracking, session settlement |
| `SoulModule` | SOUL balance reads |
| `LeaderboardModule` | Score submission and ranked reads by gameId/modeId |
| `MarketplaceModule` | Listing reads, buy/rent flows delegated to signer |
| `ChainModule` | WebSocket event listener, read-only RPC helpers |
| `SignerClientModule` | Internal HTTP client for all signer calls (global) |
| `PrismaModule` | PostgreSQL client via Prisma v7 (global) |
| `RedisModule` | Redis client via ioredis (global) |

---

## Tech stack

- **Runtime**: Node.js / NestJS
- **Database**: PostgreSQL via Prisma v7 (`@prisma/adapter-pg`)
- **Cache**: Redis via ioredis — Upstash recommended for zero-cost hosting
- **Auth**: `jose` for Web3Auth JWKS validation, `siwe` for SIWE, `@nestjs/jwt` for API tokens
- **Blockchain**: ethers v6 + TypeChain typed bindings, WebSocket provider for contract event listening
- **Deployment**: Render.com

---

## Database schema

```
Player             — identity, custodial wallet address, SOUL/GODS balance, guest flag
Session            — game session lifecycle, SOUL earned per session
LeaderboardEntry   — cumulative per-player per-mode stats
MarketplaceItem    — upgrade type registry (synced from contracts)
MarketplaceListing — price listings (synced from contracts)
PlayerNFT          — owned/rented upgrade NFTs
SbtAchievement     — soulbound achievement tokens
```

All bigint-equivalent values (SOUL amounts, token IDs) are stored as `String` to avoid JS bigint serialisation issues.

---

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL instance (Render free tier works)
- Redis instance ([Upstash](https://upstash.com) free tier recommended)
- [node-defenders-signer](https://github.com/npanium/node-defenders-signer) running and accessible
- Deployed contracts — see [node-defenders-contracts](https://github.com/npanium/node-defenders-contracts)

### Install

```bash
npm install
```

### Environment variables

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Upstash Redis URL (`rediss://` for TLS) |
| `JWT_SECRET` | API JWT signing secret — `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | Token expiry (default: `7d`) |
| `INTERNAL_API_KEY` | Shared secret with signer — must match signer's value |
| `SIGNER_BASE_URL` | Signer base URL (e.g. `http://localhost:3001`) |
| `FUJI_RPC_URL` | Avalanche Fuji RPC endpoint |
| `FUJI_WSS_URL` | Avalanche Fuji WebSocket endpoint |
| `WEB3AUTH_JWKS_URL` | Web3Auth JWKS URL for token verification |
| `GAME_ID` | Node Defenders game ID (default: `1`) |
| `SURVIVAL_MODE_ID` | Survival mode ID (default: `1`) |
| `JWT_GUEST_EXPIRES_IN` | Guest token expiry (default: `30d`) |

### TypeChain types

```bash
cp -r ../node-defenders-contracts/types/ethers-contracts src/types/
cp ../node-defenders-contracts/deployments/fuji.json deployments/
```

### Database

```bash
npx prisma generate
npx prisma migrate dev --name init

# Optional — visual DB browser
npx prisma studio
```

### Run

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

---

## API reference

🔒 = requires `Authorization: Bearer <token>` header

### Auth

#### `POST /auth/login`
Authenticate via Web3Auth or SIWE. Returns API JWT.

**Web3Auth:**
```json
{ "type": "web3auth", "idToken": "<web3auth-id-token>" }
```

**SIWE:**
```json
{ "type": "siwe", "message": "<siwe-message>", "signature": "<signature>" }
```

**Response:**
```json
{ "token": "...", "playerId": "uuid", "wallet": "0x..." }
```

#### `POST /auth/dev/token` *(development only)*
Issues a JWT for a fresh player with a generated custodial wallet. No body required. Returns 401 in production.

#### `POST /auth/guest`
Creates a guest player with a generated custodial wallet. No body required. JWT stored client-side and reused on return visits. Guest progress is preserved for 30 days.

---

### Players

#### `GET /players/me` 🔒
Authenticated player's full profile — NFTs, achievements, leaderboard entries.

#### `GET /players/:id/profile` 🔒
Player profile by ID.

---

### Sessions

#### `POST /sessions/start` 🔒
Start a game session. Automatically abandons any existing active session.
```json
{ "gameId": 1, "modeId": 1 }
```

#### `POST /sessions/earn` 🔒
Increment SOUL earnings for an active session. Called during gameplay on score events.
```json
{ "sessionId": "uuid", "amount": "10" }
```

#### `POST /sessions/end` 🔒
End a session — flushes SOUL to Postgres, queues on-chain mint, marks session complete.
```json
{ "sessionId": "uuid" }
```

#### `GET /sessions/:id` 🔒
Get session by ID.

---

### SOUL

#### `GET /soul/balance` 🔒
Authenticated player's SOUL balance (Postgres source of truth).

---

### Leaderboard

#### `GET /leaderboard/:gameId/:modeId`
Top 100 players for the given game and mode. Public.

#### `POST /leaderboard/submit` 🔒
Submit session stats.
```json
{
  "gameId": 1,
  "modeId": 1,
  "score": 1500,
  "gamesPlayed": 1,
  "roundsSurvived": 5,
  "enemiesKilled": 12
}
```

---

### Marketplace

#### `GET /marketplace/listings`
All active upgrade listings. Public.

#### `POST /marketplace/buy` 🔒
Buy an upgrade NFT. Triggers immediate on-chain mint via signer.
```json
{ "typeId": 1, "paymentToken": "SOUL" }
```

#### `POST /marketplace/rent` 🔒
Rent an upgrade NFT for a fixed duration tier.
```json
{ "typeId": 1, "tierId": 1, "paymentToken": "SOUL" }
```

---

## Architecture decisions

**Why not D1 for the API?**
The signer uses D1 for its narrow, flat schema (wallets, tx log, pending mints). The API has relational data with foreign keys and joins across multiple entities. PostgreSQL is the right fit. D1 is used where it makes sense, not forced everywhere.

**Why Redis for in-game SOUL tracking?**
SOUL increments happen constantly during gameplay. Writing to Postgres on every increment would add unnecessary latency and load. Redis handles sub-millisecond writes during the session window. On session end, one flush to Postgres and one queued mint replaces potentially hundreds of DB writes.

**Why a separate signer service?**
Private key management is high-stakes. Isolating it into a service with its own database, its own auth, and a minimal surface area means a compromise of the main API doesn't expose player wallets. The signer has one job.

**Why are on-chain stats written in batches?**
Per-session on-chain writes would be expensive and slow. The API maintains leaderboard state in Postgres for fast reads. The signer periodically batches stats to `PlayerRegistry` on-chain — these records serve cross-game universe progression and verifiable achievement history, not real-time display.

**Why store SOUL amounts as strings?**
JavaScript's `number` type loses precision above 2^53. SOUL uses 18 decimal places (wei precision). Storing as strings and passing to `BigInt` or `ethers.parseEther` at the point of use avoids silent precision loss.

---

## Related repos

- [node-defenders-contracts](https://github.com/Blockchain-Gods/node-defenders-contracts) — Solidity contracts + deploy scripts
- [node-defenders-signer](https://github.com/Blockchain-Gods/node-defenders-signer) — Isolated signing service
- [node-defenders-frontend](https://github.com/Blockchain-Gods/node-defenders-frontend) — NextJS frontend shell

