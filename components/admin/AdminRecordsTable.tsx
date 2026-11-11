"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, RefreshCw, Eye } from "lucide-react";

type Props = { resource: string; title: string; description: string; statuses?: string[]; fixedStatus?: string; defaultStatus?: string };
type Row = Record<string, unknown> & { id?: string | number };
const nice = (key: string) => key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const display = (value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};
const fields: Record<string, string[]> = {
  users: ["full_name", "email", "phone", "roles", "created_at"],
  vendors: ["business_name", "business_category", "city", "approval_status", "is_published", "created_at"],
  verifications: ["vendor_profile_id", "document_type", "status", "rejection_reason", "submitted_at"],
  listings: ["name", "category", "vendor_profile_id", "pricing_model", "starting_price", "status", "updated_at"],
  bookings: ["booking_reference", "customer_id", "vendor_name", "event_date", "event_city", "total_amount", "paid_amount", "status"],
  payments: ["booking_id", "customer_id", "amount", "currency", "status", "purpose", "created_at"],
  refunds: ["booking_id", "payment_id", "amount", "status", "reason", "created_at"],
  reviews: ["vendor_profile_id", "rating", "review_text", "vendor_response", "moderation_status", "created_at"],
};

export function AdminRecordsTable({ resource, title, description, statuses = [], fixedStatus, defaultStatus = "" }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(defaultStatus);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("created_at");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [detail, setDetail] = useState<{ record: Row; history: Row[] } | null>(null);
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    const params = new URLSearchParams({ resource, page: String(page), sort, direction });
    if (query.trim()) params.set("q", query.trim());
    if (status || fixedStatus) params.set("status", status || fixedStatus!);
    try {
      const response = await fetch(`/api/admin/records?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Records could not be loaded.");
      setRows(data.rows ?? []); setTotal(data.total ?? 0); setCanManageUsers(Boolean(data.canManageUsers));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Records could not be loaded."); }
    finally { setLoading(false); }
  }, [direction, fixedStatus, page, query, resource, sort, status, refreshKey]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), query ? 250 : 0); return () => window.clearTimeout(timer); }, [load, query]);
  const columns = useMemo(() => fields[resource] ?? [], [resource]);
  const sortableColumns = new Set(["business_name","business_category","city","approval_status","document_type","status","submitted_at","reviewed_at","name","category","starting_price","updated_at","booking_reference","event_date","event_city","total_amount","amount","purpose","created_at","rating"]);
  const changeSort = (column: string) => { setPage(1); if (sort === column) setDirection((value) => value === "asc" ? "desc" : "asc"); else { setSort(column); setDirection("asc"); } };
  const act = async (id: string | number, action: string, role?: string) => {
    const reason = action === "reject" ? window.prompt("Reason for rejection (required)")?.trim() : undefined;
    const suspensionReason = resource === "users" && action === "suspend" ? window.prompt("Reason for suspending this workspace (required)")?.trim() : undefined;
    if (action === "reject" && !reason) return;
    if (action === "suspend" && !suspensionReason) return;
    if (!window.confirm(`Confirm ${action} for this record?`)) return;
    setNotice("");
    if (resource === "users") {
      const response = await fetch("/api/admin/records", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: id, role, active: action === "reactivate", reason: suspensionReason }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Workspace access update failed."); return; }
      setNotice(`Workspace access ${action === "reactivate" ? "restored" : "suspended"}.`); setRefreshKey((value) => value + 1); return;
    }
    const target = resource === "listings" ? "vendor_listing" : resource === "verifications" ? "vendor_document" : "vendor_profile";
    const response = await fetch("/api/vendors/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action, target, reason }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Action failed."); return; }
    const actionLabel: Record<string, string> = { approve: "approved", reject: "rejected", publish: "published", unpublish: "unpublished", suspend: "suspended", restore: "restored" };
    const subject = resource === "vendors" ? "Vendor" : resource === "listings" ? "Listing" : "Workspace access";
    setNotice(`${subject} ${actionLabel[action] ?? action} successfully.`); setRefreshKey((value) => value + 1);
  };
  const openDocument = async (id: string | number) => {
    const response = await fetch(`/api/vendors/admin?resource=verification-document-url&id=${encodeURIComponent(String(id))}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Secure document preview unavailable."); return; }
    window.open(data.url, "_blank", "noopener,noreferrer");
  };
  const openDetail = async (id: string | number) => {
    setDetail(null); setDetailError(""); setDetailLoading(true);
    try { const response = await fetch(`/api/admin/records?resource=${resource}&detailId=${encodeURIComponent(String(id))}`, { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Record details unavailable."); setDetail({ record: data.record, history: data.history ?? [] }); }
    catch (cause) { setDetailError(cause instanceof Error ? cause.message : "Record details unavailable."); }
    finally { setDetailLoading(false); }
  };
  const moderateReview = async (row: Row) => {
    const action = row.moderation_status === "hidden" ? "restore" : "hide";
    const reason = window.prompt(`Reason to ${action} this review (required)`)?.trim();
    if (!reason || !window.confirm(`Confirm ${action} for this review?`)) return;
    const response = await fetch("/api/admin/reviews", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewId: row.id, action, reason }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Review moderation failed."); return; }
    setNotice(`Review ${action === "hide" ? "hidden" : "restored"}.`); setRefreshKey((value) => value + 1);
  };
  const pages = Math.max(1, Math.ceil(total / 25));
  useEffect(() => { setPage(1); setStatus(defaultStatus); setSort(resource === "listings" ? "updated_at" : resource === "verifications" ? "submitted_at" : "created_at"); setDirection("desc"); }, [defaultStatus, fixedStatus, resource]);
  return <section className="space-y-5">
    <header><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#B77A36]">Admin Workspace</p><h1 className="mt-2 font-serif text-3xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">{title}</h1><p className="mt-2 text-sm text-[#715D54] dark:text-[#D4C3B7]">{description}</p></header>
    <div className="flex flex-col gap-3 rounded-2xl border border-[#EAD2B0] bg-[#FFFCF6] p-4 dark:border-[#4D3331] dark:bg-[#241918] sm:flex-row"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C766B]"/><input value={query} onChange={(event) => { setPage(1); setQuery(event.target.value); }} placeholder={`Search ${title.toLowerCase()}…`} className="w-full rounded-xl border border-[#EAD2B0] bg-[#FFF9F0] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#B77A36] dark:border-[#4D3331] dark:bg-[#1A1211]"/></div>{statuses.length > 0 && <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }} className="rounded-xl border border-[#EAD2B0] bg-[#FFF9F0] px-3 py-2 text-sm dark:border-[#4D3331] dark:bg-[#1A1211]"><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{nice(item)}</option>)}</select>}<button onClick={() => setRefreshKey((value) => value + 1)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#EAD2B0] px-3 py-2 text-sm hover:bg-[#F5E5D0]"><RefreshCw size={15}/>Refresh</button></div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}{notice && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    <div className="overflow-hidden rounded-2xl border border-[#EAD2B0] bg-[#FFFCF6] dark:border-[#4D3331] dark:bg-[#241918]"><div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left text-sm"><thead className="bg-[#F8EBDD] text-[11px] uppercase tracking-wide text-[#715D54] dark:bg-[#342322] dark:text-[#D4C3B7]"><tr>{columns.map((column) => <th key={column} className="px-4 py-3">{sortableColumns.has(column) ? <button type="button" onClick={() => changeSort(column)} className="inline-flex items-center gap-1 hover:text-[#681B1D]">{nice(column)}<span aria-hidden="true">{sort === column ? direction === "asc" ? "↑" : "↓" : "↕"}</span></button> : nice(column)}</th>)}{["listings","verifications","vendors","reviews","bookings"].includes(resource) || resource === "users" ? <th className="px-4 py-3">Actions</th> : null}</tr></thead><tbody className="divide-y divide-[#EAD2B0] dark:divide-[#4D3331]">{!loading && rows.map((row, index) => <tr key={String(row.id ?? index)} className="align-top"><>{columns.map((column) => <td key={column} className="max-w-[280px] px-4 py-3 text-[#4F403A] dark:text-[#E0D4CC]">{column === "review_text" || column === "body" || column === "description" ? <span className="line-clamp-3">{display(row[column])}</span> : column.includes("amount") || column.includes("price") ? typeof row[column] === "number" ? `₹${(Number(row[column]) / 100).toLocaleString("en-IN")}` : display(row[column]) : column.endsWith("_at") ? row[column] ? new Date(String(row[column])).toLocaleString("en-IN") : "—" : column === "roles" ? <span>{Array.isArray(row.roles) ? row.roles.map((item) => `${item.role}${item.is_active ? "" : " (inactive)"}`).join(", ") : "—"}</span> : display(row[column])}</td>)}</>{(["listings","verifications","vendors","reviews","bookings"].includes(resource) || (resource === "users" && (canManageUsers || rows.length > 0))) && <td className="px-4 py-3"><div className="flex flex-wrap gap-2">{(resource === "bookings" || resource === "listings" || resource === "users") && <button onClick={() => void openDetail(row.id!)} className="text-xs font-semibold text-[#681B1D] underline">{resource === "users" ? "User details" : "Details / history"}</button>}{resource === "reviews" && <button onClick={() => void moderateReview(row)} className="text-xs font-semibold text-[#681B1D] underline">{row.moderation_status === "hidden" ? "Restore" : "Hide"}</button>}{resource === "verifications" && <button onClick={() => void openDocument(row.id!)} className="inline-flex items-center gap-1 text-xs underline"><Eye size={13}/>Preview</button>}{(String(row.status) === "pending" || String(row.status) === "pending_approval") && <><button onClick={() => void act(row.id!,"approve")} className="text-xs font-semibold text-green-800 underline">Approve</button><button onClick={() => void act(row.id!,"reject")} className="text-xs font-semibold text-red-700 underline">Reject</button></>}{resource === "vendors" && row.approval_status === "pending" && <><button onClick={() => void act(row.id!,"approve")} className="text-xs font-semibold text-green-800 underline">Approve</button><button onClick={() => void act(row.id!,"reject")} className="text-xs font-semibold text-red-700 underline">Reject</button></>}{resource === "vendors" && row.approval_status === "approved" && <button onClick={() => void act(row.id!, row.is_published ? "unpublish" : "publish")} className="text-xs font-semibold text-[#681B1D] underline">{row.is_published ? "Unpublish storefront" : "Publish storefront"}</button>}{resource === "users" && canManageUsers && Array.isArray(row.roles) && row.roles.filter((item) => (item.role === "customer" || item.role === "vendor")).map((membership) => <button key={membership.role} onClick={() => void act(row.id!, membership.is_active ? "suspend" : "reactivate", membership.role)} className="text-xs font-semibold text-[#681B1D] underline">{membership.is_active ? `Suspend ${membership.role}` : `Restore ${membership.role}`}</button>)}</div></td>}</tr>)}{!loading && !rows.length && <tr><td colSpan={columns.length + 1} className="px-4 py-16 text-center text-sm text-[#806D63]">{query || status ? "No records match these filters." : `No ${title.toLowerCase()} records yet.`}</td></tr>}{loading && <tr><td colSpan={columns.length + 1} className="px-4 py-16 text-center text-sm text-[#806D63]">Loading current records…</td></tr>}</tbody></table></div><footer className="flex items-center justify-between border-t border-[#EAD2B0] px-4 py-3 text-xs text-[#806D63] dark:border-[#4D3331]"><span>{total.toLocaleString()} records · Page {page} of {pages}</span><div className="flex gap-2"><button disabled={page<=1} onClick={() => setPage((value)=>Math.max(1,value-1))} className="rounded-lg border border-[#EAD2B0] p-2 disabled:opacity-40"><ChevronLeft size={15}/></button><button disabled={page>=pages} onClick={() => setPage((value)=>Math.min(pages,value+1))} className="rounded-lg border border-[#EAD2B0] p-2 disabled:opacity-40"><ChevronRight size={15}/></button></div></footer></div>
    {(detailLoading || detailError || detail) && <div role="dialog" aria-modal="true" aria-label="Record details" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => { setDetail(null); setDetailError(""); }}><section className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#EAD2B0] bg-[#FFFCF6] p-5 shadow-2xl dark:border-[#4D3331] dark:bg-[#241918]" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 className="font-serif text-xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">{resource === "bookings" ? "Booking status history" : "Listing moderation history"}</h2><button onClick={() => { setDetail(null); setDetailError(""); }} className="rounded-lg border border-[#EAD2B0] px-3 py-1 text-sm">Close</button></div>{detailLoading ? <p className="py-8 text-center text-sm">Loading details…</p> : detailError ? <p role="alert" className="mt-4 text-sm text-red-700">{detailError}</p> : detail && <><pre className="mt-4 overflow-x-auto rounded-xl bg-[#F8EBDD] p-3 text-xs dark:bg-[#342322]">{JSON.stringify(detail.record, null, 2)}</pre><h3 className="mt-5 font-semibold">History</h3>{detail.history.length ? <ol className="mt-2 space-y-2">{detail.history.map((item, index) => <li key={String(item.id ?? index)} className="rounded-xl border border-[#EAD2B0] p-3 text-sm"><p className="font-medium">{String(item.from_status ?? item.action ?? "Created")} → {String(item.to_status ?? "—")}</p>{typeof item.reason === "string" && <p className="mt-1 text-xs text-[#715D54]">{item.reason}</p>}<time className="mt-1 block text-xs text-[#806D63]">{item.created_at ? new Date(String(item.created_at)).toLocaleString("en-IN") : ""}</time></li>)}</ol> : <p className="mt-2 text-sm text-[#806D63]">No recorded history entries.</p>}</>}</section></div>}
  </section>;
}
