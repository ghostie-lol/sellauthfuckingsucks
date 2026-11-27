import { Client, EmbedBuilder } from 'discord.js';
import { GuildConfigStore } from './guildConfig.js';
import { sellauth } from './sellauth.js';

export class StockMonitor {
  private static alertCooldowns = new Set<string>();

  static startBackgroundWatcher(client: Client) {
    setInterval(() => { void this.checkStockLevels(client); }, 5 * 60 * 1000);
  }

  static async checkStockLevels(client: Client) {
    try {
      const serverConfigs = await GuildConfigStore.listConfigured('stockAlertChannelId');
      if (!serverConfigs.length) return;

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
        const responseKeys = response && typeof response === 'object'
          ? Object.keys(response as Record<string, unknown>).join(', ')
          : typeof response;
        console.error('[StockMonitor] SellAuth products response was not an array. Response shape: ' + (responseKeys || 'empty object'));
        return;
      }

      for (const product of products) {
        const stock = Number(product?.stock);
        if (!product || product.id == null || !Number.isFinite(stock)) {
          console.warn('[StockMonitor] Skipping product with missing ID or invalid stock data.');
          continue;
        }
        const threshold = Number(product.minStockAlert) || 5;

        for (const serverConfig of serverConfigs) {
          const cooldownKey = serverConfig.guildId + ':' + String(product.id);
          if (stock > threshold) {
            this.alertCooldowns.delete(cooldownKey);
            continue;
          }
          if (this.alertCooldowns.has(cooldownKey)) continue;

          const guild = await client.guilds.fetch(serverConfig.guildId).catch(() => null);
          if (!guild) continue;
          const channel = await guild.channels.fetch(serverConfig.stockAlertChannelId!).catch(() => null);
          if (!channel || !channel.isTextBased() || !('send' in channel)) {
            console.warn('[StockMonitor] Stock alert channel is missing in guild ' + guild.id + '.');
            continue;
          }

          const isDepleted = stock === 0;
          const embed = new EmbedBuilder()
            .setTitle(isDepleted ? '🚨 CRITICAL: Stock Depleted (0 Units Left)' : '⚠️ Low Stock Alert')
            .setColor(isDepleted ? 0xEF4444 : 0xF59E0B)
            .setDescription('Product **' + product.name + '** is running low on SellAuth!')
            .addFields(
              { name: 'Product ID', value: '#' + product.id, inline: true },
              { name: 'Current Stock', value: stock + ' units', inline: true },
              { name: 'Safety Threshold', value: threshold + ' units', inline: true },
            )
            .setTimestamp();
          const ping = serverConfig.stockAlertRoleId ? '<@&' + serverConfig.stockAlertRoleId + '> ' : '';
          await channel.send({
            content: ping,
            embeds: [embed],
            allowedMentions: { roles: serverConfig.stockAlertRoleId ? [serverConfig.stockAlertRoleId] : [] },
          });
          this.alertCooldowns.add(cooldownKey);
        }
      }
    } catch (err) {
      console.error('[StockMonitor Check Error]', err);
    }
  }
}
