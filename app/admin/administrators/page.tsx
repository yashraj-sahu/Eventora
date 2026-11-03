"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Invitation = { id: string; email: string; expires_at: string; accepted_at: string | null; revoked_at: string | null };
type Admin = { user_id: string; is_active: boolean; role: string; profiles?: { email: string | null } | null };

export default function AdministratorsPage() {
  const [email, setEmail] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const reload = async () => {
    const response = await fetch("/api/admin/invitations", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? "Owner access required."); return; }
    setInvitations(data.invitations); setAdmins(data.administrators);
  };
  useEffect(() => { void reload().finally(() => setLoading(false)); }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/admin/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await response.json(); setMessage(response.ok ? "Invitation email sent. It expires in seven days." : data.error ?? "Invitation failed.");
    if (response.ok) { setEmail(""); await reload(); } setBusy(false);
  };
  const mutate = async (body: object) => {
    setBusy(true); const response = await fetch("/api/admin/invitations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json(); setMessage(response.ok ? "Administrator access updated." : data.error ?? "Action failed."); if (response.ok) await reload(); setBusy(false);
  };
  return <main className="mx-auto min-h-screen max-w-4xl space-y-8 bg-[#FFF3E3] px-6 py-12 text-[#681B1D]"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.2em] text-[#9A7B45]">Platform Owner</p><h1 className="mt-2 font-serif text-3xl font-bold">Administrator access</h1></div><Link href="/admin" className="text-sm underline">Back to admin</Link></div>
    {message && <p role="status" className="rounded-xl border border-[#EAD2B0] bg-[#FFFCF6] p-4 text-sm">{message}</p>}
    {loading ? <p>Loading administrator access…</p> : <><form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-[#EAD2B0] bg-[#FFFCF6] p-5 sm:flex-row"><input type="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="administrator@example.com" className="min-w-0 flex-1 rounded-xl border border-[#EAD2B0] px-4 py-3"/><button disabled={busy} className="rounded-xl bg-[#681B1D] px-5 py-3 text-white">{busy ? "Working…" : "Invite administrator"}</button></form>
    <section className="space-y-3"><h2 className="font-serif text-xl font-bold">Administrators</h2>{admins.map((admin) => <div key={`${admin.user_id}-${admin.role}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#EAD2B0] bg-[#FFFCF6] p-4"><span>{admin.profiles?.email ?? admin.user_id} · {admin.role === "platform_owner" ? "Platform Owner" : "Administrator"} · {admin.is_active ? "Active" : "Suspended"}</span>{admin.role === "admin" && admin.is_active && <button disabled={busy} onClick={() => void mutate({ action: "suspend-admin", userId: admin.user_id })} className="text-sm text-red-700 underline">Suspend</button>}</div>)}</section>
    <section className="space-y-3"><h2 className="font-serif text-xl font-bold">Invitations</h2>{invitations.map((invite) => <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#EAD2B0] bg-[#FFFCF6] p-4"><span>{invite.email} · {invite.accepted_at ? "Accepted" : invite.revoked_at ? "Revoked" : `Expires ${new Date(invite.expires_at).toLocaleDateString()}`}</span>{!invite.accepted_at && !invite.revoked_at && <button disabled={busy} onClick={() => void mutate({ action: "revoke-invitation", id: invite.id })} className="text-sm text-red-700 underline">Revoke</button>}</div>)}</section></>}</main>;
}
