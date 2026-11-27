import { Client, EmbedBuilder } from 'discord.js';
import { getGuildSettings } from './guildSettings.js';
import { sellauth } from './sellauth.js';

export class StockMonitor {
  private static alertCooldowns = new Set<string>();

  static startBackgroundWatcher(client: Client): void {
    setInterval(() => { void this.checkStockLevels(client); }, 5 * 60 * 1000);
  }

  static async checkStockLevels(client: Client): Promise<void> {
    try {
      const response: unknown = await sellauth.getProducts();
      const payload = response as { data?: unknown; products?: unknown; items?: unknown } | null;
      const nestedData = payload?.data as { products?: unknown; items?: unknown; data?: unknown } | null;
      const products: any[] | null =
        Array.isArray(response) ? response :
        Array.isArray(payload?.data) ? payload.data :
        Array.isArray(payload?.products) ? payload.products :
        Array.isArray(payload?.items) ? payload.items :
        Array.isArray(nestedData?.products) ? nestedData.products :
        Array.isArray(nestedData?.items) ? nestedData.items :
        Array.isArray(nestedData?.data) ? nestedData.data : null;

      if (!products) {
        const shape = response && typeof response === 'object'
          ? Object.keys(response as Record<string, unknown>).join(', ')
          : typeof response;
        console.error('[StockMonitor] SellAuth products response was not an array:', shape);
        return;
      }

      for (const guild of client.guilds.cache.values()) {
        const settings = await getGuildSettings(guild.id);
        if (!settings.stock_alerts_channel_id) continue;
        const channel = await guild.channels.fetch(settings.stock_alerts_channel_id).catch(() => null);
        if (!channel?.isTextBased() || !('send' in channel)) continue;

        for (const product of products) {
          const stock = Number(product?.stock);
          if (!product || product.id == null || !Number.isFinite(stock)) continue;
          const threshold = Number(product.minStockAlert) || 5;
          const cooldownKey = `${guild.id}:${product.id}`;

          if (stock <= threshold && !this.alertCooldowns.has(cooldownKey)) {
            this.alertCooldowns.add(cooldownKey);
            const depleted = stock === 0;
            const embed = new EmbedBuilder()
              .setTitle(depleted ? 'CRITICAL: Stock Depleted' : 'Low Stock Alert')
              .setColor(depleted ? 0xef4444 : 0xf59e0b)
              .setDescription(`Product **${product.name}** is running low on SellAuth.`)
              .addFields(
                { name: 'Product ID', value: `#${product.id}`, inline: true },
                { name: 'Current Stock', value: `${stock} units`, inline: true },
                { name: 'Safety Threshold', value: `${threshold} units`, inline: true },
              )
              .setTimestamp();
            const ping = settings.stock_alert_role_id ? `<@&${settings.stock_alert_role_id}> ` : '';
            await channel.send({ content: ping, embeds: [embed], allowedMentions: { roles: settings.stock_alert_role_id ? [settings.stock_alert_role_id] : [] } });
          } else if (stock > threshold) {
            this.alertCooldowns.delete(cooldownKey);
          }
        }
      }
    } catch (error) {
      console.error('[StockMonitor Check Error]', error);
    }
  }
}
