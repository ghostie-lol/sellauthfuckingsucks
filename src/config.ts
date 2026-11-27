import dotenv from 'dotenv';

dotenv.config();

export const config = {
  discord: {
    token: process.env.DISCORD_BOT_TOKEN || '',
    clientId: process.env.DISCORD_CLIENT_ID || '',
  },

  sellauth: {
    apiKey: process.env.SELLAUTH_API_KEY || '',
    shopId: process.env.SELLAUTH_SHOP_ID || '',
    webhookSecret: process.env.SELLAUTH_WEBHOOK_SECRET || '',
    baseUrl: 'https://api.sellauth.com/v1',
  },

  ai: {
    apiKey: process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '',
    baseUrl: (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: process.env.AI_MODEL || 'gpt-4o-mini',
  },
};
