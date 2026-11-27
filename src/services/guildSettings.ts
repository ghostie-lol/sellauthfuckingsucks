import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = connectionString
  ? new Pool({
      connectionString,
      ...(process.env.PGSSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
    })
  : null;

export type GuildSettings = {
  transactions_log_channel_id: string | null;
  stock_alerts_channel_id: string | null;
  disputes_log_channel_id: string | null;
  ticket_category_id: string | null;
  ticket_log_channel_id: string | null;
  ticket_support_role_id: string | null;
  beta_applications_channel_id: string | null;
  buyer_role_id: string | null;
  vip_role_id: string | null;
  stock_alert_role_id: string | null;
  swear_farm_channel_id: string | null;
};

let initPromise: Promise<void> | null = null;

async function ensureTable(): Promise<void> {
  if (!pool) throw new Error('DATABASE_URL is required to save per-server settings.');
  if (!initPromise) {
    initPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS b4_guild_settings (
        guild_id TEXT PRIMARY KEY,
        transactions_log_channel_id TEXT,
        stock_alerts_channel_id TEXT,
        disputes_log_channel_id TEXT,
        ticket_category_id TEXT,
        ticket_log_channel_id TEXT,
        ticket_support_role_id TEXT,
        beta_applications_channel_id TEXT,
        buyer_role_id TEXT,
        vip_role_id TEXT,
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

export async function getGuildSettings(guildId: string): Promise<GuildSettings> {
  await ensureTable();
  await pool!.query(
    'INSERT INTO b4_guild_settings (guild_id) VALUES ($1) ON CONFLICT (guild_id) DO NOTHING',
    [guildId],
  );
  const result = await pool!.query('SELECT * FROM b4_guild_settings WHERE guild_id = $1', [guildId]);
  return result.rows[0] as GuildSettings;
}

const channelColumns = new Set([
  'transactions_log_channel_id', 'stock_alerts_channel_id', 'disputes_log_channel_id',
  'ticket_category_id', 'ticket_log_channel_id', 'beta_applications_channel_id',
  'swear_farm_channel_id',
]);
const roleColumns = new Set([
  'ticket_support_role_id', 'buyer_role_id', 'vip_role_id', 'stock_alert_role_id',
]);

export async function setGuildSetting(
  guildId: string,
  key: string,
  value: string | null,
): Promise<void> {
  if (!channelColumns.has(key) && !roleColumns.has(key)) {
    throw new Error('Unsupported server setting.');
  }
  await ensureTable();
  await pool!.query(
    `INSERT INTO b4_guild_settings (guild_id, ${key}) VALUES ($1, $2)
     ON CONFLICT (guild_id) DO UPDATE SET ${key} = EXCLUDED.${key}, updated_at = NOW()`,
    [guildId, value],
  );
}
