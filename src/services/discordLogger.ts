import { Client, EmbedBuilder } from 'discord.js';
import { GuildConfigStore } from './guildConfig.js';
import { InvoiceGenerator } from './pdfInvoice.js';

export class DiscordLogger {
  static async logSale(client: Client, orderData: any) {
    try {
      const serverConfigs = await GuildConfigStore.listConfigured('transactionsLogChannelId');
      if (!serverConfigs.length) return;

      const customerEmail = typeof orderData.customerEmail === 'string'
        ? orderData.customerEmail
        : 'Not provided';
      const maskedEmail = customerEmail.replace(/(.{2})(.*)(?=@)/, '$1***');

      const embed = new EmbedBuilder()
        .setTitle('🛍️ New Purchase Completed!')
        .setColor(0x00ff88)
        .setDescription('Customer successfully purchased **' + orderData.productName + '** on SellAuth!')
        .addFields(
          { name: 'Order ID', value: String(orderData.id), inline: true },
          { name: 'Total Paid', value: '**$' + Number(orderData.total).toFixed(2) + ' ' + orderData.currency + '**', inline: true },
          { name: 'Payment Method', value: String(orderData.paymentMethod ?? 'Unknown'), inline: true },
          { name: 'Customer Email', value: maskedEmail, inline: true },
          { name: 'License Delivered', value: String(orderData.deliveredKeys?.length || 1) + ' serial(s)', inline: true },
          { name: 'Role Assigned', value: orderData.roleAssigned ? '@' + orderData.roleAssigned : 'None', inline: true },
        )
        .setFooter({ text: 'SellAuth Automated Webhook Dispatcher' })
        .setTimestamp();

      const pdfBuffer = InvoiceGenerator.generateBuffer(orderData);
      for (const serverConfig of serverConfigs) {
        const guild = await client.guilds.fetch(serverConfig.guildId).catch(() => null);
        if (!guild) continue;
        const channel = await guild.channels.fetch(serverConfig.transactionsLogChannelId!).catch(() => null);
        if (!channel || !channel.isTextBased() || !('send' in channel)) {
          console.warn('[DiscordLogger] Transactions log channel is missing in guild ' + guild.id + '.');
          continue;
        }
        await channel.send({
          embeds: [embed],
          files: [{ attachment: pdfBuffer, name: 'Invoice-' + orderData.id + '.pdf' }],
        }).catch(error => console.error('[DiscordLogger] Could not send sale log in guild ' + guild.id + ':', error));
      }
    } catch (error) {
      console.error('[DiscordLogger Sale Error]', error);
    }
  }
}
