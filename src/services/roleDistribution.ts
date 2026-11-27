import { Guild } from 'discord.js';
import { getGuildSettings } from './guildSettings.js';
import { sellauth } from './sellauth.js';
import { claimOrder, releaseOrderClaim } from './orderClaims.js';

type VerificationResult =
  | { success: true; roleName: string; order: any }
  | { success: false; message: string };

export class RoleManager {
  static async verifyAndAssign(guild: Guild, discordUserId: string, orderId: string, customerEmail: string): Promise<VerificationResult> {
    try {
      const normalizedOrderId = orderId.trim();
      const normalizedEmail = customerEmail.trim().toLowerCase();
      if (!normalizedOrderId) return { success: false, message: 'Enter your SellAuth order ID.' };
      if (!normalizedEmail || !normalizedEmail.includes('@')) return { success: false, message: 'Enter the email address used for the purchase.' };

      const member = await guild.members.fetch(discordUserId);
      const response = await sellauth.getOrder(normalizedOrderId);
      const order = response?.data ?? response?.order ?? response;
      if (!order || typeof order !== 'object') return { success: false, message: 'That order could not be found in the configured SellAuth shop.' };

      const status = String(order.status ?? order.payment?.status ?? '').toUpperCase();
      if (status !== 'COMPLETED') return { success: false, message: 'That order is not marked COMPLETED. If you have paid, contact staff for help.' };

      const orderEmail = String(order.customer?.email ?? order.customer_email ?? order.email ?? order.buyer?.email ?? '').trim().toLowerCase();
      if (!orderEmail || orderEmail !== normalizedEmail) return { success: false, message: 'The order ID and purchase email do not match. Check both and try again.' };

      const settings = await getGuildSettings(guild.id);
      const buyerRole = settings.buyer_role_id
        ? await guild.roles.fetch(settings.buyer_role_id).catch(() => null)
        : guild.roles.cache.find(role => role.name.toUpperCase() === 'BUYER') ?? null;
      if (!buyerRole) return { success: false, message: 'The BUYER role is missing. Create it or configure it with /server-config role.' };

      const claim = await claimOrder(normalizedOrderId, discordUserId);
      if (claim.status === 'claimed-by-other') return { success: false, message: 'This SellAuth order has already been claimed by another Discord account. If you think this is a mistake, contact staff.' };

      try {
        if (!member.roles.cache.has(buyerRole.id)) await member.roles.add(buyerRole, 'Verified completed SellAuth order');
      } catch (roleError) {
        if (claim.status === 'claimed') {
          await releaseOrderClaim(normalizedOrderId, discordUserId).catch((releaseError: unknown) => console.error('[SellAuth verification] Could not release failed order claim:', releaseError));
        }
        throw roleError;
      }

      const total = Number(order.total ?? (Number(order.totals?.total_cents ?? order.totals?.total_usd_cents ?? 0) / 100));
      if (Number.isFinite(total) && total >= 100 && settings.vip_role_id) {
        try {
          await member.roles.add(settings.vip_role_id, 'Customer purchase qualifies for VIP');
        } catch (error) {
          console.error('[SellAuth verification] BUYER was assigned, but VIP role assignment failed:', error);
        }
      }
      return { success: true, roleName: buyerRole.name, order };
    } catch (error) {
      console.error('[SellAuth order verification failed]', error);
      return { success: false, message: 'SellAuth verification is temporarily unavailable. Please try again later or contact staff.' };
    }
  }

  static async revokeCustomerRole(guild: Guild, discordUserId: string): Promise<void> {
    try {
      const member = await guild.members.fetch(discordUserId);
      const settings = await getGuildSettings(guild.id);
      const buyerRole = settings.buyer_role_id
        ? await guild.roles.fetch(settings.buyer_role_id).catch(() => null)
        : guild.roles.cache.find(role => role.name.toUpperCase() === 'BUYER') ?? null;
      if (buyerRole) await member.roles.remove(buyerRole);
    } catch (error) {
      console.error('[RoleManager Revoke Error]', error);
    }
  }
}
