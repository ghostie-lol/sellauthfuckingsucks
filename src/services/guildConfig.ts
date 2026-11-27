import { Pool } from 'pg';

export type GuildConfig = {
  guildId: string;
  ticketCategoryId: string | null;
  ticketSupportRoleId: string | null;
  ticketLogChannelId: string | null;
  betaApplicationChannelId: string | null;
  transactionsLogChannelId: string | null;
  stockAlertChannelId: string | null;
  disputesLogChannelId: string | null;
  verifiedCustomerRoleId: string | null;
  vipBuyerRoleId: string | null;
  stockAlertRoleId: string | null;
  swearFarmChannelId: string | null;
};

export type GuildConfigPatch = Partial<Omit<GuildConfig, 'guildId'>>;

const connectionString = process.env.DATABASE_URL;
const pool = connectionString
  ? new Pool({
      connectionString,
      ...(process.env.PGSSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
    })
  : null;

let initPromise: Promise<void> | null = null;

async function ensureTable(): Promise<void> {
  if (!pool) throw new Error('DATABASE_URL is required for multi-server configuration.');
  if (!initPromise) {
    initPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS discord_guild_config (
        guild_id TEXT PRIMARY KEY,
        ticket_category_id TEXT,
        ticket_support_role_id TEXT,
        ticket_log_channel_id TEXT,
        beta_application_channel_id TEXT,
        transactions_log_channel_id TEXT,
        stock_alert_channel_id TEXT,
        disputes_log_channel_id TEXT,
        verified_customer_role_id TEXT,
        vip_buyer_role_id TEXT,
        stock_alert_role_id TEXT,
        swear_farm_channel_id TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).then(() => undefined).catch((error: unknown) => {
      initPromise = null;
      throw error;
    });
  }
  await initPromise;
}

const columns: Record<keyof GuildConfigPatch, string> = {
  ticketCategoryId: 'ticket_category_id',
  ticketSupportRoleId: 'ticket_support_role_id',
  ticketLogChannelId: 'ticket_log_channel_id',
  betaApplicationChannelId: 'beta_application_channel_id',
  transactionsLogChannelId: 'transactions_log_channel_id',
  stockAlertChannelId: 'stock_alert_channel_id',
  disputesLogChannelId: 'disputes_log_channel_id',
  verifiedCustomerRoleId: 'verified_customer_role_id',
  vipBuyerRoleId: 'vip_buyer_role_id',
  stockAlertRoleId: 'stock_alert_role_id',
  swearFarmChannelId: 'swear_farm_channel_id',
};

function mapRow(row: any, guildId: string): GuildConfig {
  return {
    guildId,
    ticketCategoryId: row?.ticket_category_id ?? null,
    ticketSupportRoleId: row?.ticket_support_role_id ?? null,
    ticketLogChannelId: row?.ticket_log_channel_id ?? null,
    betaApplicationChannelId: row?.beta_application_channel_id ?? null,
    transactionsLogChannelId: row?.transactions_log_channel_id ?? null,
    stockAlertChannelId: row?.stock_alert_channel_id ?? null,
    disputesLogChannelId: row?.disputes_log_channel_id ?? null,
    verifiedCustomerRoleId: row?.verified_customer_role_id ?? null,
    vipBuyerRoleId: row?.vip_buyer_role_id ?? null,
    stockAlertRoleId: row?.stock_alert_role_id ?? null,
    swearFarmChannelId: row?.swear_farm_channel_id ?? null,
  };
}

export class GuildConfigStore {
  static async get(guildId: string): Promise<GuildConfig> {
    await ensureTable();
    const result = await pool!.query('SELECT * FROM discord_guild_config WHERE guild_id = $1', [guildId]);
    return mapRow(result.rows[0], guildId);
  }

  static async update(guildId: string, patch: GuildConfigPatch): Promise<GuildConfig> {
    await ensureTable();
    const entries = Object.entries(patch).filter(([key, value]) =>
      key in columns && value !== undefined
    ) as Array<[keyof GuildConfigPatch, string | null]>;

    await pool!.query(
      'INSERT INTO discord_guild_config (guild_id) VALUES ($1) ON CONFLICT (guild_id) DO NOTHING',
      [guildId],
    );

    if (entries.length) {
      const assignments = entries.map(([key], index) =>
        `${columns[key]} = $${index + 2}`
      );
      const values = entries.map(([, value]) => value);
      await pool!.query(
        `UPDATE discord_guild_config SET ${assignments.join(', ')}, updated_at = NOW() WHERE guild_id = $1`,
        [guildId, ...values],
      );
    }
    return this.get(guildId);
  }

  static async listConfigured(field: keyof GuildConfigPatch): Promise<GuildConfig[]> {
    await ensureTable();
    const column = columns[field];
    const result = await pool!.query(
      `SELECT * FROM discord_guild_config WHERE ${column} IS NOT NULL`,
    );
    return result.rows.map((row: any) => mapRow(row, row.guild_id));
  }

  // Import the old single-server environment configuration once, without
  // making those IDs global defaults for any newly invited server.
  static async importLegacyEnvironment(guildId?: string): Promise<void> {
    if (!guildId) return;
    const legacy: GuildConfigPatch = {
      ticketCategoryId: process.env.TICKET_CATEGORY_ID || null,
      ticketSupportRoleId: process.env.TICKET_SUPPORT_ROLE_ID || null,
      ticketLogChannelId: process.env.TICKET_LOG_CHANNEL_ID || null,
      betaApplicationChannelId: process.env.BETA_APPLICATION_CHANNEL_ID || null,
      transactionsLogChannelId: process.env.CHANNEL_TRANSACTIONS_LOG || null,
      stockAlertChannelId: process.env.CHANNEL_STOCK_ALERTS || null,
      disputesLogChannelId: process.env.CHANNEL_DISPUTES_LOG || null,
      verifiedCustomerRoleId: process.env.ROLE_VERIFIED_CUSTOMER || null,
      vipBuyerRoleId: process.env.ROLE_VIP_BUYER || null,
      stockAlertRoleId: process.env.ROLE_STOCK_ALERT_PING || null,
      swearFarmChannelId: null,
    };
    await ensureTable();
    await pool!.query('INSERT INTO discord_guild_config (guild_id) VALUES ($1) ON CONFLICT (guild_id) DO NOTHING', [guildId]);
    const current = await this.get(guildId);
    const missing: GuildConfigPatch = {};
    for (const [key, value] of Object.entries(legacy) as Array<[keyof GuildConfigPatch, string | null]>) {
      if (value && !current[key]) missing[key] = value;
    }
    if (Object.keys(missing).length) await this.update(guildId, missing);
  }
}
