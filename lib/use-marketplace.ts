"use client";

import { useCallback, useEffect, useState } from "react";
import { marketplaceVendorToLegacy, type MarketplaceVendor, type VendorItem } from "@/types";

export function useMarketplaceVendors(category?: string) {
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const url = new URL("/api/vendors", window.location.origin);
      if (category && category !== "All") url.searchParams.set("category", category);
      const response = await fetch(url);
      if (!response.ok) throw new Error("Unable to load vendors");
      const data = await response.json() as { vendors: MarketplaceVendor[] };
      setVendors(data.vendors.map(marketplaceVendorToLegacy));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load vendors"); }
    finally { setLoading(false); }
  }, [category]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    let active = true;
    fetch("/api/vendors/saved").then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as { ids: string[] };
      if (active) setSavedIds(data.ids);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const toggleSaved = useCallback(async (id: string) => {
    const saved = !savedIds.includes(id);
    const response = await fetch("/api/vendors/saved", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vendorId: id, saved }) });
    if (response.status === 401) { window.location.assign("/signin?redirectTo=/vendors"); return; }
    if (response.ok) setSavedIds((ids) => saved ? [...ids, id] : ids.filter((item) => item !== id));
  }, [savedIds]);
  return { vendors, savedIds, loading, error, refresh, toggleSaved };
}
