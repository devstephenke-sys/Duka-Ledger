# Duka Ledger

A WhatsApp bot for Kenyan micro-retailers to log sales by sending free-text messages, track stock and customer debts, and automatically reconcile M-Pesa Till/Paybill payments against recorded sales.

## Project Status

**Current Phase:** Phase 0 - Foundation & Repo Setup

This is the foundation phase. The project currently has:
- TypeScript Express project structure
- Prisma ORM with PostgreSQL schema
- Health check endpoint
- Basic test setup

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

## Local Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd duka-ledger
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your database configuration:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/duka_ledger"
   PORT=3000
   NODE_ENV="development"
   ```

4. **Set up the database**
   
   Create a PostgreSQL database named `duka_ledger`:
   ```bash
   # Using psql
   createdb duka_ledger
   
   # Or using your PostgreSQL client/interface
   ```
   
   Generate Prisma client:
   ```bash
   npx prisma generate
   ```
   
   Run database migrations (when available):
   ```bash
   npx prisma migrate dev
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   The server will start on port 3000 (or the port specified in your `.env`).

6. **Verify the setup**
   
   Check the health endpoint:
   ```bash
   curl http://localhost:3000/health
   ```
   
   Expected response:
   ```json
   {
     "status": "ok",
     "db": "connected"
   }
   ```

7. **Run tests**
   ```bash
   npm test
   ```

## Project Structure

```
duka-ledger/
├── src/
│   ├── db/          # Database client and configurations
│   ├── routes/      # Express route handlers
│   ├── services/    # Business logic services
│   ├── utils/       # Utility functions
│   ├── types/       # TypeScript type definitions
│   ├── index.ts     # Application entry point
│   └── index.test.ts # Test file
├── prisma/
│   └── schema.prisma # Database schema
├── .env.example     # Environment variables template
├── .gitignore       # Git ignore rules
├── package.json     # Project dependencies
├── tsconfig.json    # TypeScript configuration
├── vitest.config.ts # Test configuration
└── README.md        # This file
```

## Database Schema

The project uses Prisma ORM with PostgreSQL. The schema includes:

- **Businesses**: Shop owner information and M-Pesa numbers
- **Products**: Inventory items with pricing and stock
- **Sales**: Transaction records with raw message preservation
- **MpesaTxns**: M-Pesa payment notifications with matching logic
- **Debts**: Customer credit tracking

## Available Scripts

- `npm run dev` - Start development server with ts-node
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests with Vitest
- `npm test:ui` - Run tests with Vitest UI

## Development Guidelines

- All money-related modules (parsing, reconciliation, totals) require unit tests
- Never hardcode secrets - use environment variables
- Always build against Daraja SANDBOX credentials unless explicitly told otherwise
- Keep raw inputs (every sale has `raw_message`, every M-Pesa webhook has `raw_payload`)
- Optimize for shop owner's 5-second attention span in bot responses
- Every phase ends with a working, demoable increment

## Next Steps

The project will progress through these phases:

1. ✅ Phase 0: Foundation & Repo Setup (Current)
2. Phase 1: WhatsApp Echo Bot
3. Phase 2: LLM Parser + Manual Ledger
4. Phase 3: Daraja Sandbox Integration
5. Phase 4: Reconciliation Engine
6. Phase 5: Debt/Credit Tracking
7. Phase 6: Reporting
8. Phase 7: Production Hardening
9. Phase 8: Pilot & Feedback Loop

## Troubleshooting

**Database connection issues:**
- Ensure PostgreSQL is running
- Check DATABASE_URL in `.env` matches your database credentials
- Verify the database `duka_ledger` exists

**TypeScript compilation errors:**
- Run `npm run build` to check for type errors
- Ensure all dependencies are installed

**Test failures:**
- Check that environment variables are set correctly
- Ensure database is accessible during tests
- Run tests in verbose mode: `npm test -- --reporter=verbose`

## License

ISC