"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, ShieldCheck, UserPlus, Mail, RefreshCw } from "lucide-react";

type Invitation = { id: string; email: string; admin_role: string; expires_at: string; expired_at: string | null; accepted_at: string | null; revoked_at: string | null; created_at: string };
type Admin = { user_id: string; is_active: boolean; role: string; assignments: Array<{ admin_role: string; is_active: boolean; created_at?: string; updated_at?: string }>; profiles?: { email: string | null; full_name?: string | null; phone?: string | null; updated_at?: string | null } | null };
type Permission = { permission: string; label: string; description: string };
type AdminRole = "super_admin" | "vendor_moderator" | "support_admin" | "finance_admin";

const roleNames: Record<string, string> = { platform_owner: "Platform Owner", super_admin: "Super Admin", vendor_moderator: "Vendor Moderator", support_admin: "Support Admin", finance_admin: "Finance Admin" };
const roles: AdminRole[] = ["super_admin", "vendor_moderator", "support_admin", "finance_admin"];

function invitationStatus(invite: Invitation) {
  if (invite.accepted_at) return "Accepted";
  if (invite.revoked_at) return "Revoked";
  if (invite.expired_at || new Date(invite.expires_at) <= new Date()) return "Expired";
  return "Pending";
}

export default function AdministratorsPage() {
  const [email, setEmail] = useState("");
  const [adminRole, setAdminRole] = useState<AdminRole>("vendor_moderator");
  const [intent, setIntent] = useState<"existing" | "new">("existing");
  const [reason, setReason] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Array<{ admin_role: string; permission: string }>>([]);
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [adminRoleFilter, setAdminRoleFilter] = useState("");
  const [adminStatusFilter, setAdminStatusFilter] = useState("");
  const [invitationStatusFilter, setInvitationStatusFilter] = useState("");

  const reload = useCallback(async () => {
    const response = await fetch("/api/admin/invitations", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Administrator data could not be loaded.");
    setInvitations(data.invitations ?? []);
    setAdmins(data.administrators ?? []);
    setPermissions(data.permissions ?? []);
    setRolePermissions(data.rolePermissions ?? []);
  }, []);

  useEffect(() => { void reload().catch((cause) => { setMessage(cause instanceof Error ? cause.message : "Administrator data could not be loaded."); setMessageError(true); }).finally(() => setLoading(false)); }, [reload]);

  const permissionSummary = useMemo(() => {
    const selected = rolePermissions.filter((item) => item.admin_role === adminRole).map((item) => item.permission);
    return permissions.filter((item) => selected.includes(item.permission));
  }, [adminRole, permissions, rolePermissions]);

  const visibleAdmins = useMemo(() => admins.filter((admin) => {
    const activeRoles = admin.role === "platform_owner" ? ["platform_owner"] : admin.assignments.filter((item) => item.is_active).map((item) => item.admin_role);
    const name = admin.profiles?.full_name ?? "";
    const address = admin.profiles?.email ?? "";
    const matchesSearch = !search || `${name} ${address}`.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !adminRoleFilter || activeRoles.includes(adminRoleFilter);
    const matchesStatus = !adminStatusFilter || (admin.is_active ? "active" : "suspended") === adminStatusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  }), [admins, search, adminRoleFilter, adminStatusFilter]);

  const visibleInvitations = useMemo(() => invitations.filter((invite) => {
    const matchesSearch = !search || `${invite.email} ${roleNames[invite.admin_role] ?? invite.admin_role}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (!invitationStatusFilter || invitationStatus(invite).toLowerCase() === invitationStatusFilter);
  }), [invitations, search, invitationStatusFilter]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage(""); setMessageError(false);
    try {
      const response = await fetch("/api/admin/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, adminRole, intent, reason }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Administrator action failed.");
      if (data.accessGranted) {
        setMessage(data.emailSent ? `${roleNames[adminRole]} access was granted immediately. The notification email was sent; the recipient can use their existing password.` : `${roleNames[adminRole]} access was granted immediately. Email notification could not be sent because Brevo delivery is not configured or rejected the message.`);
      } else {
        setMessage("Administrator invitation created and delivered. The recipient must verify the invited email and establish a password before Admin access activates.");
      }
      setEmail(""); setReason(""); await reload();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Administrator action failed."); setMessageError(true); }
    finally { setBusy(false); }
  };

  const mutate = async (body: object, confirmMessage: string) => {
    if (busy || !window.confirm(confirmMessage)) return;
    setBusy(true); setMessage(""); setMessageError(false);
    try {
      const response = await fetch("/api/admin/invitations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Administrator action failed.");
      setMessage("Administrator access change was saved and recorded."); await reload();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Administrator action failed."); setMessageError(true); }
    finally { setBusy(false); }
  };

  const promptReason = (label: string) => window.prompt(label)?.trim() ?? "";
  const assignRole = (admin: Admin, role: AdminRole) => {
    const reason = promptReason(`Reason for assigning ${roleNames[role]} to this administrator:`);
    if (reason.length < 3) return;
    void mutate({ action: "set-admin-role", userId: admin.user_id, adminRole: role, active: true, reason }, `Assign ${roleNames[role]} to ${admin.profiles?.email ?? "this administrator"}?`);
  };
  const changeMembership = (admin: Admin, active: boolean) => {
    const reason = promptReason(`Reason for ${active ? "restoring" : "suspending"} this administrator:`);
    if (reason.length < 3) return;
    void mutate({ action: active ? "reactivate-admin" : "suspend-admin", userId: admin.user_id, reason }, `${active ? "Restore" : "Suspend"} Admin access for ${admin.profiles?.email ?? "this account"}?`);
  };
  const toggleRole = (admin: Admin, role: string, active: boolean) => {
    const reason = promptReason(`Reason for ${active ? "restoring" : "revoking"} ${roleNames[role] ?? role}:`);
    if (reason.length < 3) return;
    void mutate({ action: "set-admin-role", userId: admin.user_id, adminRole: role, active, reason }, `${active ? "Restore" : "Revoke"} ${roleNames[role] ?? role} for ${admin.profiles?.email ?? "this account"}?`);
  };

  return <main className="mx-auto min-h-screen max-w-6xl space-y-7 bg-[#FFF3E3] px-4 py-8 text-[#30221D] sm:px-6 sm:py-10 dark:bg-[#1A1211] dark:text-[#FFF3E3]">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.2em] text-[#B77A36]">Platform Owner · Access control</p><h1 className="mt-2 font-serif text-3xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">Administrator management</h1><p className="mt-2 max-w-2xl text-sm text-[#715D54] dark:text-[#D4C3B7]">Grant a role to an existing verified Evntora identity or invite someone who has never registered.</p></div><Link href="/admin" className="text-sm font-medium text-[#681B1D] underline dark:text-[#EAD2B0]">Back to Admin</Link></header>

    {message && <p role={messageError ? "alert" : "status"} className={`rounded-xl border p-4 text-sm ${messageError ? "border-rose-200 bg-rose-50 text-rose-800" : "border-[#EAD2B0] bg-[#FFFCF6] text-[#30221D] dark:bg-[#241918] dark:text-[#FFF3E3]"}`}>{message}</p>}

    <section className="rounded-3xl border border-[#EAD2B0] bg-[#FFFCF6] p-5 shadow-sm sm:p-7 dark:border-[#4D3331] dark:bg-[#241918]">
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#681B1D] text-[#EAD2B0]"><UserPlus className="h-5 w-5"/></span><div><h2 className="font-serif text-xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">Grant or invite administrator access</h2><p className="mt-1 text-sm text-[#715D54] dark:text-[#D4C3B7]">Existing verified accounts keep their password and all other workspace memberships. New identities activate after email OTP and password setup.</p></div></div>
      <div className="mt-5 inline-flex rounded-xl border border-[#EAD2B0] bg-[#FFF3E3] p-1 dark:border-[#4D3331] dark:bg-[#1A1211]" role="group" aria-label="Account type"><button type="button" onClick={() => setIntent("existing")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${intent === "existing" ? "bg-[#681B1D] text-white" : "text-[#715D54] dark:text-[#D4C3B7]"}`}>Existing Evntora account</button><button type="button" onClick={() => setIntent("new")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${intent === "new" ? "bg-[#681B1D] text-white" : "text-[#715D54] dark:text-[#D4C3B7]"}`}>New to Evntora</button></div>
      <form onSubmit={(event) => void submit(event)} className="mt-4 grid gap-3 md:grid-cols-[1.2fr_1fr_1.5fr_auto]">
        <label className="text-xs font-semibold">Email address<input type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className="mt-1 w-full rounded-xl border border-[#EAD2B0] bg-white px-3 py-3 text-sm dark:border-[#4D3331] dark:bg-[#1A1211]"/></label>
        <label className="text-xs font-semibold">Administrator role<select value={adminRole} onChange={(event) => setAdminRole(event.target.value as AdminRole)} className="mt-1 w-full rounded-xl border border-[#EAD2B0] bg-white px-3 py-3 text-sm dark:border-[#4D3331] dark:bg-[#1A1211]">{roles.map((role) => <option key={role} value={role}>{roleNames[role]}</option>)}</select></label>
        <label className="text-xs font-semibold">Reason for access<textarea required minLength={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why does this account need this role?" rows={1} className="mt-1 min-h-[44px] w-full resize-y rounded-xl border border-[#EAD2B0] bg-white px-3 py-3 text-sm dark:border-[#4D3331] dark:bg-[#1A1211]"/></label>
        <button disabled={busy || reason.trim().length < 3} className="self-end rounded-xl bg-[#681B1D] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : intent === "existing" ? "Grant access" : "Send invitation"}</button>
      </form>
      <div className="mt-4 rounded-xl bg-[#FFF3E3] p-4 text-xs text-[#715D54] dark:bg-[#1A1211] dark:text-[#D4C3B7]"><strong className="text-[#681B1D] dark:text-[#EAD2B0]">{roleNames[adminRole]} permissions:</strong> {permissionSummary.length ? permissionSummary.map((permission) => permission.description).join(" ") : "No permissions are currently assigned to this role. Configure the role in Platform Settings before granting it."}</div>
    </section>

    <div className="flex flex-wrap gap-2"><label className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-[#806D63]"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search administrators and invitations" className="w-full rounded-xl border border-[#EAD2B0] bg-[#FFFCF6] py-2.5 pl-9 pr-3 text-sm dark:border-[#4D3331] dark:bg-[#241918]"/></label><select value={adminRoleFilter} onChange={(event) => setAdminRoleFilter(event.target.value)} aria-label="Filter administrators by role" className="rounded-xl border border-[#EAD2B0] bg-[#FFFCF6] px-3 text-sm dark:border-[#4D3331] dark:bg-[#241918]"><option value="">All admin roles</option>{roles.map((role) => <option key={role} value={role}>{roleNames[role]}</option>)}</select><select value={adminStatusFilter} onChange={(event) => setAdminStatusFilter(event.target.value)} aria-label="Filter administrators by access status" className="rounded-xl border border-[#EAD2B0] bg-[#FFFCF6] px-3 text-sm dark:border-[#4D3331] dark:bg-[#241918]"><option value="">All access states</option><option value="active">Active</option><option value="suspended">Suspended</option></select><button type="button" onClick={() => void reload().catch((cause) => { setMessage(cause instanceof Error ? cause.message : "Refresh failed."); setMessageError(true); })} className="inline-flex items-center gap-2 rounded-xl border border-[#EAD2B0] bg-[#FFFCF6] px-3 py-2 text-sm dark:border-[#4D3331] dark:bg-[#241918]"><RefreshCw className="h-4 w-4"/>Refresh</button></div>

    <section className="space-y-3"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-[.18em] text-[#B77A36]">Current access</p><h2 className="mt-1 font-serif text-2xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">Active administrators</h2></div><span className="text-xs text-[#806D63]">{visibleAdmins.length} shown</span></div>
      {loading ? <p role="status" className="rounded-2xl border border-[#EAD2B0] bg-[#FFFCF6] p-8 text-center text-sm dark:border-[#4D3331] dark:bg-[#241918]">Loading administrator accounts…</p> : visibleAdmins.length ? visibleAdmins.map((admin) => {
        const activeAssignments = admin.assignments.filter((assignment) => assignment.is_active);
        return <article key={`${admin.user_id}-${admin.role}`} className="rounded-2xl border border-[#EAD2B0] bg-[#FFFCF6] p-4 sm:p-5 dark:border-[#4D3331] dark:bg-[#241918]"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{admin.profiles?.full_name || admin.profiles?.email || admin.user_id}</h3><p className="mt-1 text-sm text-[#715D54] dark:text-[#D4C3B7]">{admin.profiles?.email} {admin.profiles?.phone ? `· ${admin.profiles.phone}` : "· Phone not provided"}</p><div className="mt-2 flex flex-wrap gap-2">{admin.role === "platform_owner" ? <span className="rounded-full bg-[#EAD2B0]/60 px-3 py-1 text-xs font-semibold">Platform Owner · protected</span> : activeAssignments.length ? activeAssignments.map((assignment) => <span key={assignment.admin_role} className="rounded-full bg-[#EAD2B0]/60 px-3 py-1 text-xs font-semibold">{roleNames[assignment.admin_role] ?? assignment.admin_role}</span>) : <span className="rounded-full bg-gray-100 px-3 py-1 text-xs">No active permission role</span>}<span className={`rounded-full px-3 py-1 text-xs font-semibold ${admin.is_active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{admin.is_active ? "Active" : "Suspended"}</span></div></div>{admin.role === "admin" && <div className="flex flex-wrap gap-2">{admin.is_active ? <button disabled={busy} onClick={() => changeMembership(admin, false)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50">Suspend Admin</button> : activeAssignments.length ? <button disabled={busy} onClick={() => changeMembership(admin, true)} className="rounded-lg border border-[#EAD2B0] px-3 py-2 text-xs font-semibold disabled:opacity-50">Restore Admin</button> : <span className="self-center text-xs text-[#806D63]">Regrant a role with the form above to restore access.</span>}<select value="" aria-label={`Assign role to ${admin.profiles?.email ?? "administrator"}`} disabled={busy || !admin.is_active} onChange={(event) => { if (event.target.value) assignRole(admin, event.target.value as AdminRole); }} className="rounded-lg border border-[#EAD2B0] bg-white px-3 py-2 text-xs dark:border-[#4D3331] dark:bg-[#1A1211]"><option value="">Assign role…</option>{roles.map((role) => <option key={role} value={role}>{roleNames[role]}</option>)}</select></div>}</div>
          {admin.role === "admin" && <details className="mt-4 border-t border-[#EAD2B0] pt-3 dark:border-[#4D3331]"><summary className="cursor-pointer text-xs font-semibold text-[#681B1D] dark:text-[#EAD2B0]">Administrator details and role history</summary><div className="mt-3 space-y-3"><div className="grid gap-2 text-xs sm:grid-cols-2"><p><b>Phone:</b> {admin.profiles?.phone || "Not provided"}</p><p><b>Profile activity:</b> {admin.profiles?.updated_at ? new Date(admin.profiles.updated_at).toLocaleString("en-IN") : "Unavailable"}</p><p className="sm:col-span-2"><b>Auth last sign-in:</b> Not exposed by the current directory API.</p></div><div className="flex flex-wrap gap-2">{admin.assignments.map((assignment) => <span key={assignment.admin_role} className="inline-flex items-center gap-2 rounded-full border border-[#EAD2B0] px-3 py-1.5 text-xs">{roleNames[assignment.admin_role] ?? assignment.admin_role} · {assignment.is_active ? "Active" : "Revoked"}<button disabled={busy || !admin.is_active} onClick={() => toggleRole(admin, assignment.admin_role, !assignment.is_active)} className="underline disabled:opacity-40">{assignment.is_active ? "Revoke" : "Restore"}</button></span>)}</div></div></details>}
        </article>;
      }) : <p className="rounded-2xl border border-[#EAD2B0] bg-[#FFFCF6] p-8 text-center text-sm text-[#806D63] dark:border-[#4D3331] dark:bg-[#241918]">No administrator accounts match these filters.</p>}
    </section>

    <section className="space-y-3"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-[.18em] text-[#B77A36]">Invitation lifecycle</p><h2 className="mt-1 font-serif text-2xl font-bold text-[#681B1D] dark:text-[#EAD2B0]">Pending invitations and history</h2></div><select value={invitationStatusFilter} onChange={(event) => setInvitationStatusFilter(event.target.value)} aria-label="Filter invitation status" className="rounded-xl border border-[#EAD2B0] bg-[#FFFCF6] px-3 py-2 text-sm dark:border-[#4D3331] dark:bg-[#241918]"><option value="">All invitation statuses</option>{["Pending", "Accepted", "Expired", "Revoked"].map((status) => <option key={status} value={status.toLowerCase()}>{status}</option>)}</select></div>
      {loading ? <p className="rounded-2xl border border-[#EAD2B0] bg-[#FFFCF6] p-8 text-center text-sm dark:border-[#4D3331] dark:bg-[#241918]">Loading invitation history…</p> : visibleInvitations.length ? visibleInvitations.map((invite) => { const status = invitationStatus(invite); return <article key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EAD2B0] bg-[#FFFCF6] p-4 dark:border-[#4D3331] dark:bg-[#241918]"><div><h3 className="text-sm font-semibold">{invite.email}</h3><p className="mt-1 text-xs text-[#715D54] dark:text-[#D4C3B7]">{roleNames[invite.admin_role] ?? invite.admin_role} · Created {new Date(invite.created_at).toLocaleString("en-IN")}</p><p className="mt-1 text-xs text-[#806D63]">Expires {new Date(invite.expires_at).toLocaleString("en-IN")}</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-[#EAD2B0]/60 px-3 py-1 text-xs font-semibold">{status}</span>{status === "Pending" && <button disabled={busy} onClick={() => void mutate({ action: "revoke-invitation", id: invite.id }, `Revoke the pending invitation for ${invite.email}?`)} className="text-xs font-semibold text-rose-700 underline disabled:opacity-50">Revoke invitation</button>}</div></article>; }) : <p className="rounded-2xl border border-[#EAD2B0] bg-[#FFFCF6] p-8 text-center text-sm text-[#806D63] dark:border-[#4D3331] dark:bg-[#241918]">No invitations match this filter.</p>}
    </section>

    <p className="flex items-start gap-2 text-xs text-[#806D63] dark:text-[#D4C3B7]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#B77A36]"/>Role changes are checked by the server and database. Admin revocation blocks new privileged requests while preserving Customer and Vendor access.</p>
    <p className="flex items-start gap-2 text-xs text-[#806D63] dark:text-[#D4C3B7]"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#B77A36]"/>First-time invitation delivery requires the server-side Brevo settings. Existing-account access remains effective if its notification email fails.</p>
  </main>;
}
