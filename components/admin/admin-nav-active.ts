/**
 * Whether the admin horizontal nav item for `href` should show as the current page.
 * Order detail / manual order live under `/admin/orders/*` but belong to Dashboard workflow.
 */
export function isAdminNavItemActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (pathname === href) return true;
  if (href === "/admin/dashboard" && pathname.startsWith("/admin/orders")) return true;
  return pathname.startsWith(`${href}/`);
}
