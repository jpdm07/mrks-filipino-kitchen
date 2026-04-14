"use client";

import { useEffect } from "react";

/** Sets browser tab title so open admin tabs show how many items need attention. */
export function AdminDocumentAttentionTitle({ total }: { total: number }) {
  useEffect(() => {
    document.title =
      total > 0 ? `(${total}) Mr. K Admin` : "Mr. K Admin";
  }, [total]);
  return null;
}
