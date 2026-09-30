# Duka Ledger

A WhatsApp bot for Kenyan micro-retailers to log sales by sending free-text messages, track stock and customer debts, and automatically reconcile M-Pesa Till/Paybill payments against recorded sales.

## Project Status

**Current Phase:** Phase 1 - WhatsApp Echo Bot

This phase implements:
- WhatsApp Business Cloud API webhook integration
- Message echo functionality to test the WhatsApp pipeline
- Webhook verification and signature validation
- Error handling for Meta API failures

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

5. **Set up WhatsApp Business Cloud API (Meta)**
   
   Follow these steps to configure WhatsApp for the echo bot:

   a. **Create a Meta Developer Account**
      - Go to [developers.facebook.com](https://developers.facebook.com)
      - Click "Get Started" and sign up with your Facebook account
      - Verify your email address

   b. **Create a Meta App**
      - In the Meta Dashboard, click "Create App"
      - Select "Business" as the app type
      - Fill in the app name (e.g., "Duka Ledger Bot")
      - Add "WhatsApp" as a product

   c. **Configure WhatsApp**
      - In the WhatsApp section, click "Get Started"
      - Select your phone number type (choose "Test" for development)
      - Add a test phone number (your own WhatsApp number)
      - Meta will send you a verification code via WhatsApp

   d. **Get WhatsApp Credentials**
      - In the WhatsApp dashboard, you'll find:
        - **Phone Number ID**: Displayed in the "Phone numbers" section
        - **Access Token**: Click "Generate" next to "Temporary access token" (valid for 24 hours)
        - **Webhook Verify Token**: Choose any secure string (e.g., `duka_ledger_secret_123`)

   e. **Add Credentials to .env**
      ```
      WHATSAPP_PHONE_NUMBER_ID="your_phone_number_id"
      WHATSAPP_ACCESS_TOKEN="your_access_token"
      WHATSAPP_WEBHOOK_VERIFY_TOKEN="your_verify_token"
      ```

   f. **Set Up Webhook with ngrok (for local testing)**
      - Install ngrok: `npm install -g ngrok` or download from [ngrok.com](https://ngrok.com)
      - Start your development server: `npm run dev`
      - In a new terminal, run: `ngrok http 3000`
      - Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

   g. **Configure Webhook in Meta Dashboard**
      - In the WhatsApp dashboard, go to "Webhooks" section
      - Click "Add" next to your phone number
      - Enter:
        - **Callback URL**: `https://your-ngrok-url.ngrok.io/webhook/whatsapp`
        - **Verify Token**: The same string you set in `.env`
      - Click "Verify and Save"
      - Subscribe to webhook events: `messages`

   h. **Test the Setup**
      - Send a WhatsApp message to your test number
      - You should receive an echo reply: "Got your message: [your text]"
      - Check your server console for webhook logs

6. **Set up the database**
   
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

7. **Run the development server**
   ```bash
   npm run dev
   ```

   The server will start on port 3000 (or the port specified in your `.env`).

8. **Verify the setup**
   
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

9. **Run tests**
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

1. ✅ Phase 0: Foundation & Repo Setup
2. 🔄 Phase 1: WhatsApp Echo Bot (Current)
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