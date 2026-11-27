import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { getGuildSettings } from './guildSettings.js';
import { InvoiceGenerator } from './pdfInvoice.js';

export class DiscordLogger {
  static async logSale(client: Client, orderData: any): Promise<void> {
    try {
      const destinations: TextChannel[] = [];
      for (const guild of client.guilds.cache.values()) {
        const settings = await getGuildSettings(guild.id);
        if (!settings.transactions_log_channel_id) continue;
        const channel = await guild.channels.fetch(settings.transactions_log_channel_id).catch(() => null);
        if (channel?.isTextBased() && 'send' in channel) destinations.push(channel as TextChannel);
      }
      if (!destinations.length) {
        console.warn('[DiscordLogger] No transaction log channel is configured.');
        return;
      }

      const customerEmail = typeof orderData.customerEmail === 'string' ? orderData.customerEmail : 'Not provided';
      const maskedEmail = customerEmail.replace(/(.{2})(.*)(?=@)/, '$1***');
      const embed = new EmbedBuilder()
        .setTitle('New Purchase Completed')
        .setColor(0x00ff88)
        .setDescription(`Customer successfully purchased **${orderData.productName}** on SellAuth.`)
        .addFields(
          { name: 'Order ID', value: String(orderData.id), inline: true },
          { name: 'Total Paid', value: `$${Number(orderData.total).toFixed(2)} ${orderData.currency}`, inline: true },
          { name: 'Payment Method', value: String(orderData.paymentMethod ?? 'Unknown'), inline: true },
          { name: 'Customer Email', value: maskedEmail, inline: true },
          { name: 'License Delivered', value: `${orderData.deliveredKeys?.length || 1} serial(s)`, inline: true },
          { name: 'Role Assigned', value: orderData.roleAssigned ? `@${orderData.roleAssigned}` : 'None', inline: true },
        )
        .setFooter({ text: 'SellAuth Automated Webhook Dispatcher' })
        .setTimestamp();

      const pdfBuffer = InvoiceGenerator.generateBuffer(orderData);
      await Promise.all(destinations.map(channel => channel.send({
        embeds: [embed],
        files: [{ attachment: pdfBuffer, name: `Invoice-${orderData.id}.pdf` }],
      })));
    } catch (error) {
      console.error('[DiscordLogger Sale Error]', error);
    }
  }
}
