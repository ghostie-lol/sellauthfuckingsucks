# SellAuth Discord Bot & Web Command Suite

A production-ready Discord Bot powered by **Discord.js v14** and **TypeScript**, engineered specifically to manage and automate your **SellAuth** storefront.

## ✨ Core Features
- 👑 **Attribution**: Bot made by @PremiumNPC
- 🚀 **100+ Working Slash Commands**: Products, inventory, pricing, keys, HWID resets, customer lookup, revenue stats, fraud prevention, and more.
- 📜 **Automated PDF Invoices**: Automatically generates and attaches an official branded PDF receipt with tax calculations, transaction hashes, and delivered keys.
- 🎭 **Automated Customer Role Distribution**: Automatically verifies purchases, evaluates spend tiers, and dispenses Discord roles (@Verified Customer, @VIP, @Whale).
- 🚨 **Real-Time Stock Alerts**: Monitors inventory levels with custom warning thresholds and mentions staff roles when stock is depleted.
- 📊 **Discord Transaction Logging**: Formatted Discord embeds for completed sales, refunds, disputes, and restocks.

## 🛠️ Quick Start Guide

### 1. Installation
```bash
git clone https://github.com/your-username/sellauth-discord-bot.git
cd sellauth-discord-bot
npm install
```

### 2. Configuration

Only secrets and service-level settings belong in environment variables:

- `DISCORD_BOT_TOKEN`
- `DISCORD_CLIENT_ID`
- `SELLAUTH_API_KEY` and `SELLAUTH_SHOP_ID`
- `DATABASE_URL` for persistent per-server settings, license redemption, and order claims
- Optional AI settings: `OPENAI_API_KEY` / `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL`

Do not add Discord guild, channel, category, or role IDs to the environment. Those are configured separately inside each server and saved in PostgreSQL.

### 3. Configure each Discord server

Invite the bot with the required application commands and bot permissions. In each server, an administrator runs:

- `/server-config channel` to select transaction logs, stock alerts, dispute logs, ticket category, ticket logs, beta applications, or Swear Farm channel.
- `/server-config role` to select the support, BUYER, VIP buyer, or stock-alert role.
- `/dashboard` posts the beta application panel and automatically uses that channel as the application's destination.
- `/ticket-panel` posts the ticket creation panel in the channel where it is run.
- `/redeem-panel` posts the buyer redemption panel in the channel where it is run.

Settings are isolated by Discord server and persist across restarts.

### 4. Deploy Slash Commands
Deploy all 100+ slash commands to your server:
```bash
npm run deploy:commands
```

### 5. Run the Bot
```bash
npm run dev
```
