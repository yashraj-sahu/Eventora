"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Invitation = { id: string; email: string; admin_role: string; expires_at: string; expired_at: string | null; accepted_at: string | null; revoked_at: string | null };
type Admin = { user_id: string; is_active: boolean; role: string; assignments: Array<{ admin_role: string; is_active: boolean }>; profiles?: { email: string | null } | null };
type Permission = { permission: string; label: string; description: string };

export default function AdministratorsPage() {
  const [email, setEmail] = useState("");
  const [adminRole, setAdminRole] = useState("vendor_moderator");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Array<{ admin_role: string; permission: string }>>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const reload = async () => {
    const response = await fetch("/api/admin/invitations", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? "Owner access required."); return; }
    setInvitations(data.invitations); setAdmins(data.administrators); setPermissions(data.permissions ?? []); setRolePermissions(data.rolePermissions ?? []);
  };
  useEffect(() => { void reload().finally(() => setLoading(false)); }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/admin/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, adminRole }) });
    const data = await response.json(); setMessage(response.ok ? data.existingAccount ? "Invitation sent to the existing EVNTORA account. Their current password and other roles remain unchanged; they must verify the invited email to activate Admin access." : "Invitation sent. The recipient must verify the invited email by OTP and establish a password before Admin access activates; it expires in seven days." : data.error ?? "Invitation failed.");
    if (response.ok) { setEmail(""); await reload(); } setBusy(false);
  };
  const mutate = async (body: object) => {
    setBusy(true); const response = await fetch("/api/admin/invitations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json(); setMessage(response.ok ? "Administrator access updated." : data.error ?? "Action failed."); if (response.ok) await reload(); setBusy(false);
  };
  return <main className="mx-auto min-h-screen max-w-4xl space-y-8 bg-[#FFF3E3] px-6 py-12 text-[#681B1D]"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.2em] text-[#9A7B45]">Platform Owner</p><h1 className="mt-2 font-serif text-3xl font-bold">Administrator access</h1></div><Link href="/admin" className="text-sm underline">Back to admin</Link></div>
    {message && <p role="status" className="rounded-xl border border-[#EAD2B0] bg-[#FFFCF6] p-4 text-sm">{message}</p>}
    {loading ? <p>Loading administrator access…</p> : <><form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-[#EAD2B0] bg-[#FFFCF6] p-5 sm:flex-row"><input type="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="administrator@example.com" className="min-w-0 flex-1 rounded-xl border border-[#EAD2B0] px-4 py-3"/><select value={adminRole} onChange={(e) => setAdminRole(e.target.value)} className="rounded-xl border border-[#EAD2B0] bg-white px-3"><option value="super_admin">Super Admin</option><option value="vendor_moderator">Vendor Moderator</option><option value="support_admin">Support Admin</option><option value="finance_admin">Finance Admin</option></select><button disabled={busy} className="rounded-xl bg-[#681B1D] px-5 py-3 text-white">{busy ? "Working…" : "Invite administrator"}</button></form><p className="-mt-5 px-2 text-xs text-[#7D6B63]">Role permissions: {adminRole === "super_admin" ? "Broad operational permissions; Platform Owner controls administrator accounts, invitations and role assignments." : permissions.filter((permission) => rolePermissions.some((grant) => grant.admin_role === adminRole && grant.permission === permission.permission)).map((permission) => permission.label).join(" · ") || "No permissions assigned; configure them in Platform Settings."}</p>
    <section className="space-y-3"><h2 className="font-serif text-xl font-bold">Administrators</h2>{admins.map((admin) => <div key={`${admin.user_id}-${admin.role}`} className="space-y-3 rounded-xl border border-[#EAD2B0] bg-[#FFFCF6] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><span>{admin.profiles?.email ?? admin.user_id} · {admin.role === "platform_owner" ? "Platform Owner" : (admin.assignments ?? []).filter((a) => a.is_active).map((a) => a.admin_role.replaceAll("_", " ")).join(", ") || "No active permissions"} · {admin.is_active ? "Active" : "Suspended"}</span>{admin.role === "admin" && <div className="flex flex-wrap gap-3">{admin.is_active ? <button disabled={busy} onClick={() => void mutate({ action: "suspend-admin", userId: admin.user_id })} className="text-sm text-red-700 underline">Suspend</button> : <button disabled={busy} onClick={() => void mutate({ action: "reactivate-admin", userId: admin.user_id })} className="text-sm underline">Reactivate</button>}<select aria-label="Add administrator role" value="" onChange={(e) => { if(e.target.value) void mutate({ action: "set-admin-role", userId: admin.user_id, adminRole: e.target.value, active: true }); }} className="rounded-lg border border-[#EAD2B0] bg-white px-2"><option value="">Assign role…</option><option value="super_admin">Super Admin</option><option value="vendor_moderator">Vendor Moderator</option><option value="support_admin">Support Admin</option><option value="finance_admin">Finance Admin</option></select></div>}</div>{admin.role === "admin" && <div className="flex flex-wrap gap-2">{admin.assignments.map((assignment) => <span key={assignment.admin_role} className="flex items-center gap-2 rounded-full border border-[#EAD2B0] px-3 py-1 text-xs capitalize">{assignment.admin_role.replaceAll("_"," ")} · {assignment.is_active?"Active":"Revoked"}<button disabled={busy} onClick={()=>void mutate({action:"set-admin-role",userId:admin.user_id,adminRole:assignment.admin_role,active:!assignment.is_active})} className="underline">{assignment.is_active?"Revoke":"Restore"}</button></span>)}</div>}</div>)}</section>
    <section className="space-y-3"><h2 className="font-serif text-xl font-bold">Invitations</h2>{invitations.map((invite) => { const state = invite.accepted_at ? "Accepted" : invite.revoked_at ? "Revoked" : invite.expired_at || new Date(invite.expires_at) <= new Date() ? "Expired" : "Pending"; return <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#EAD2B0] bg-[#FFFCF6] p-4"><span>{invite.email} · {invite.admin_role.replaceAll("_", " ")} · {state}</span>{state === "Pending" && <button disabled={busy} onClick={() => void mutate({ action: "revoke-invitation", id: invite.id })} className="text-sm text-red-700 underline">Revoke</button>}</div>; })}</section></>}</main>;
}
