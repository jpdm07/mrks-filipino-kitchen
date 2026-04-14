import { prisma } from "@/lib/prisma";
import {
  ORDER_STATUS_AWAITING_PAYMENT,
  ORDER_STATUS_PENDING_PAYMENT_VERIFICATION,
} from "@/lib/order-payment";

export type AdminNavBadgeCounts = {
  /** Orders needing payment verification / follow-up. */
  dashboardPayment: number;
  /** Unread contact form messages. */
  unreadInquiries: number;
  /** Dish write-in suggestions in the last 7 days (Suggestions admin tab). */
  recentDishSuggestions: number;
};

const DISH_SUGGESTION_RECENT_DAYS = 7;

/**
 * Counts for admin nav “needs attention” badges. Safe on DB errors (returns zeros).
 */
export async function getAdminNavBadgeCounts(): Promise<AdminNavBadgeCounts> {
  const since = new Date();
  since.setDate(since.getDate() - DISH_SUGGESTION_RECENT_DAYS);
  since.setHours(0, 0, 0, 0);

  try {
    const [dashboardPayment, unreadInquiries, recentDishSuggestions] =
      await Promise.all([
        prisma.order.count({
          where: {
            status: {
              in: [
                ORDER_STATUS_PENDING_PAYMENT_VERIFICATION,
                ORDER_STATUS_AWAITING_PAYMENT,
              ],
            },
          },
        }),
        prisma.inquiry.count({ where: { isRead: false } }),
        prisma.dishSuggestionSubmission.count({
          where: { submittedAt: { gte: since } },
        }),
      ]);
    return { dashboardPayment, unreadInquiries, recentDishSuggestions };
  } catch (e) {
    console.error("[admin-nav-badges] query failed:", e);
    return {
      dashboardPayment: 0,
      unreadInquiries: 0,
      recentDishSuggestions: 0,
    };
  }
}

export function adminAttentionTotal(b: AdminNavBadgeCounts): number {
  return (
    b.dashboardPayment + b.unreadInquiries + b.recentDishSuggestions
  );
}
