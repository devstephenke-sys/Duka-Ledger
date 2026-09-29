# Duka Ledger — Project Context

## What this is
A WhatsApp bot for Kenyan micro-retailers (kiosk owners, boutique owners, market
traders) to log sales by sending a free-text or voice message, track stock and
customer debts, and automatically reconcile M-Pesa Till/Paybill payments against
recorded sales.

## Who the user is
Non-technical shop owners with basic smartphones, limited data bundles, and no
patience for anything that isn't as easy as sending a WhatsApp message. Every
design decision defaults to "least effort for the shop owner," even when that
means more engineering effort for us.

## Stack
- Node.js + Express (TypeScript)
- PostgreSQL (via Prisma ORM)
- WhatsApp Business Cloud API (Meta)
- Anthropic API (Claude Haiku) for free-text → structured data parsing
- Safaricom Daraja API for M-Pesa C2B/STK/transaction status
- Hosting: Railway (MVP) → VPS later

## Non-negotiable rules
1. Every module that touches money (parsing, reconciliation, totals) needs unit
   tests before it's considered done.
2. Never hardcode secrets. Everything sensitive lives in `.env`, which is
   gitignored from the first commit.
3. Always build against Daraja SANDBOX credentials unless explicitly told
   otherwise. Never touch production M-Pesa credentials without being asked.
4. Keep raw inputs. Every parsed sale keeps `raw_message`. Every M-Pesa webhook
   keeps `raw_payload`. We never discard the source of truth.
5. Optimize for the shop owner's five seconds of attention. Bot replies should
   be short, in plain English or Swahili/Sheng, and confirm what was understood
   ("Got it: 2 sodas, KSh 100 ✅") so mistakes are caught immediately, not
   discovered a week later.
6. Every phase ends with a working, demoable increment — never leave the app in
   a broken state between sessions.

## Current phase
Phase 0: Foundation & Repo Setup