"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function PortalAccessNotice() {
  const [access, setAccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setAccess(new URLSearchParams(window.location.search).get("access") ?? ""); }, []);
  if (!access) return null;
  const vendorRequired = access === "vendor-required";
  const customerRequired = access === "customer-required";
  return <div role="status" className="border-b border-[#D8C69E] bg-[#FBF5E7] px-5 py-4 text-sm text-[#3E392E]">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3"><p>{vendorRequired ? "Vendor access is not enabled for this account. Your customer access remains active." : customerRequired ? "Customer access is not enabled for this account. Your vendor access remains active." : "This account does not have authorized administrator access."}</p>
      {vendorRequired && <Link className="font-semibold underline" href="/signup/vendor">Register your business</Link>}
      {customerRequired && <button disabled={busy} className="font-semibold underline disabled:opacity-60" onClick={async () => { setBusy(true); setError(""); const response = await fetch("/api/auth/roles", { method: "POST" }); if (response.ok) window.location.assign("/dashboard"); else { setError("Customer access could not be enabled. Please retry."); setBusy(false); } }}>{busy ? "Enabling…" : "Enable Customer access"}</button>}
      {access === "admin-required" && <Link className="font-semibold underline" href="/admin/signin">Admin sign in</Link>}
      {error && <span className="w-full text-xs text-red-700">{error}</span>}
    </div>
  </div>;
}
