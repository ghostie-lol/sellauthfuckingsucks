# SellAuth Discord Bot & Web Command Suite

A Discord.js v14 and TypeScript bot for managing a SellAuth storefront across multiple Discord servers.

## Features

- SellAuth product, inventory, order, customer, coupon, invoice, and license-key commands
- Purchase verification and per-server buyer/VIP role assignment
- Support tickets and ticket transcripts
- Per-server beta application inboxes
- Stock alerts and transaction logging in every configured server
- Server-specific Swear Farm channel and leaderboard
- AI replies inside bot-created support tickets

## Environment variables

Keep service credentials and database configuration in Railway or your hosting provider:

Required:
- `DISCORD_BOT_TOKEN`
- `DISCORD_CLIENT_ID`
- `SELLAUTH_API_KEY`
- `SELLAUTH_SHOP_ID`
- `DATABASE_URL`

Optional:
- `PGSSL=true` when your PostgreSQL provider requires SSL
- `OPENAI_API_KEY` or `AI_API_KEY`
- `AI_BASE_URL`
- `AI_MODEL`

The previous single-server ID variables are still supported for a one-time legacy import into the server named by `DISCORD_GUILD_ID`. These values are not used as global defaults and are not required for new servers:
- `DISCORD_GUILD_ID`
- `TICKET_CATEGORY_ID`
- `TICKET_SUPPORT_ROLE_ID`
- `TICKET_LOG_CHANNEL_ID`
- `BETA_APPLICATION_CHANNEL_ID`
- `CHANNEL_TRANSACTIONS_LOG`
- `CHANNEL_STOCK_ALERTS`
- `CHANNEL_DISPUTES_LOG`
- `ROLE_VERIFIED_CUSTOMER`
- `ROLE_VIP_BUYER`
- `ROLE_STOCK_ALERT_PING`

New servers are configured independently in PostgreSQL. Do not put server-specific IDs into shared environment variables.

## Invite the bot

Use the Discord OAuth2 URL format below. Replace `YOUR_CLIENT_ID` with the application's client ID from the Discord Developer Portal:

```text
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=268553232&scope=bot%20applications.commands
```

The permission value includes View Channels, Send Messages, Embed Links, Attach Files, Read Message History, Manage Channels (for tickets), and Manage Roles (for buyer/VIP role assignment). Place the bot's highest role above the buyer and VIP roles it must assign.

## Configure each server

After inviting the bot, a server administrator runs `/setup`. Supply whichever options apply to that server:

- `ticket_category`, `support_role`, and `ticket_logs`
- `beta_applications`
- `transactions_log`, `stock_alerts`, and `disputes_log`
- `buyer_role`, `vip_role`, and `stock_alert_role`
- `swear_farm_channel`

Only options supplied in a command are changed. Run `/setup` with no options to view the saved configuration. Each server has its own settings, and they persist across restarts.

Then use `/ticket-panel`, `/redeem-panel`, or `/dashboard` in the channel where each panel should appear. The beta application destination is the channel selected in `/setup`.

## Gateway intents

The bot requests:
- `Guilds`
- `GuildMessages`
- `MessageContent`

Message Content is required for the existing ticket AI feature to read support-ticket messages. Enable the Message Content privileged intent in the Discord Developer Portal. The bot no longer requests the privileged Guild Members intent; it fetches individual members when role assignment is needed.

## Deploy and run

Install dependencies and build:

```bash
npm install
npm run build
```

Register global application commands:

```bash
npm run deploy:commands
```

Global command updates can take some time to appear in every server.

Start the bot:

```bash
npm start
```
