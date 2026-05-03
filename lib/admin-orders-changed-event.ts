/** Fired in the browser after an admin (or public) order mutation so open admin tabs can refetch. */
export const ADMIN_ORDERS_CHANGED_EVENT = "mrk:admin-orders-changed";

export function emitAdminOrdersChangedClient(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADMIN_ORDERS_CHANGED_EVENT));
}

type RouterLike = { refresh: () => void };

/** After a successful order mutation: refresh server components and notify other open admin tabs. */
export function refreshAdminAfterOrderChange(router: RouterLike): void {
  router.refresh();
  emitAdminOrdersChangedClient();
}
