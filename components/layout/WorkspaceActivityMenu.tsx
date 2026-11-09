"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, MessageSquare, X } from "lucide-react";

type Notification = { id: string; booking_id: string; event_type: string; title: string; message: string; created_at: string; read_at: string | null };
type Conversation = { bookingId: string; bookingReference: string; vendorName: string; eventDate: string; bookingStatus: string; latestMessage: { body: string; created_at: string }; unread: boolean };

export function WorkspaceActivityMenu({ workspace, placement = "header" }: { workspace: "customer" | "vendor"; placement?: "header" | "sidebar" }) {
  const [open, setOpen] = useState<"messages" | "notifications" | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setError(null);
    const [inboxResponse, notificationResponse] = await Promise.all([
      fetch("/api/bookings/inbox", { cache: "no-store" }),
      fetch("/api/bookings/notifications", { cache: "no-store" }),
    ]);
    const [inbox, notificationData] = await Promise.all([inboxResponse.json(), notificationResponse.json()]);
    if (inboxResponse.ok) { setConversations(inbox.conversations ?? []); setUnreadMessages(inbox.unreadCount ?? 0); }
    if (notificationResponse.ok) setNotifications(notificationData.notifications ?? []);
    if (!inboxResponse.ok && !notificationResponse.ok) setError(inbox.error || notificationData.error || "Workspace updates are unavailable.");
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(null); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, []);

  const bookingHref = (bookingId: string) => workspace === "vendor"
    ? `/vendor-portal?section=bookings&bookingId=${encodeURIComponent(bookingId)}`
    : `/dashboard/payments?tab=bookings&bookingId=${encodeURIComponent(bookingId)}`;

  const markRead = async (notification: Notification) => {
    if (!notification.read_at) {
      const response = await fetch("/api/bookings/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notificationId: notification.id }) });
      if (response.ok) setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
    }
    setOpen(null);
  };

  const unreadNotifications = notifications.filter((item) => !item.read_at).length;
  const menuButton = (kind: "messages" | "notifications", icon: typeof Bell, label: string, count: number) => {
    const Icon = icon;
    return <button type="button" aria-label={`${label}${count ? `, ${count} unread` : ""}`} aria-expanded={open === kind}
      onClick={() => { setOpen(open === kind ? null : kind); if (open !== kind) void load(); }}
      className="relative grid h-10 w-10 place-items-center rounded-xl border border-[#EAD2B0] text-[#681B1D] transition hover:bg-[#EAD2B0]/40 dark:border-[#4D3331] dark:text-[#EAD2B0] dark:hover:bg-[#2E1F1E]">
      <Icon className="h-4 w-4" />{count > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[#681B1D] px-1 text-[9px] font-bold leading-4 text-white">{count > 99 ? "99+" : count}</span>}
    </button>;
  };

  return <div ref={rootRef} className="relative flex items-center gap-2">
    {menuButton("messages", MessageSquare, "Messages", unreadMessages)}
    {menuButton("notifications", Bell, "Notifications", unreadNotifications)}
    {open && <section aria-label={open === "messages" ? "Booking messages" : "Notifications"} className={`absolute z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#EAD2B0] bg-[#FFFCF6] shadow-xl dark:border-[#4D3331] dark:bg-[#241918] ${placement === "sidebar" ? "left-0 top-12 md:left-full md:top-0 md:ml-3" : "right-0 top-12"}`}>
      <div className="flex items-center justify-between border-b border-[#EAD2B0] px-4 py-3 dark:border-[#4D3331]"><h2 className="font-serif font-bold text-[#681B1D] dark:text-[#EAD2B0]">{open === "messages" ? "Booking conversations" : "Notifications"}</h2><button aria-label="Close" onClick={() => setOpen(null)} className="rounded-lg p-1 hover:bg-[#EAD2B0]/40"><X className="h-4 w-4" /></button></div>
      {error ? <p role="alert" className="p-4 text-sm text-rose-700">{error}</p> : open === "messages" ? <div className="max-h-[65vh] divide-y divide-[#EAD2B0] overflow-y-auto dark:divide-[#4D3331]">
        {conversations.map((conversation) => <Link key={conversation.bookingId} href={bookingHref(conversation.bookingId)} onClick={() => setOpen(null)} className="block px-4 py-3 transition hover:bg-[#EAD2B0]/25">
          <span className="flex items-center justify-between gap-2 text-xs"><b>{conversation.bookingReference} · {conversation.vendorName}</b>{conversation.unread && <i aria-label="Unread" className="h-2 w-2 rounded-full bg-[#681B1D]" />}</span>
          <span className="mt-1 block truncate text-xs text-[#7D6B63] dark:text-[#D4C3B7]">{conversation.latestMessage.body}</span><time className="mt-1 block text-[10px] text-[#7D6B63]">{new Date(conversation.latestMessage.created_at).toLocaleString()}</time>
        </Link>)}
        {!conversations.length && <p className="p-5 text-sm text-[#7D6B63]">No booking conversations yet.</p>}
      </div> : <div className="max-h-[65vh] divide-y divide-[#EAD2B0] overflow-y-auto dark:divide-[#4D3331]">
        {notifications.map((notification) => <Link key={notification.id} href={bookingHref(notification.booking_id)} onClick={() => void markRead(notification)} className="block px-4 py-3 transition hover:bg-[#EAD2B0]/25">
          <span className="flex items-start justify-between gap-2 text-xs"><b>{notification.title}</b>{!notification.read_at && <i aria-label="Unread" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#681B1D]" />}</span><span className="mt-1 block text-xs text-[#7D6B63] dark:text-[#D4C3B7]">{notification.message}</span><time className="mt-1 block text-[10px] text-[#7D6B63]">{new Date(notification.created_at).toLocaleString()}</time>
        </Link>)}
        {!notifications.length && <p className="p-5 text-sm text-[#7D6B63]">No notifications yet.</p>}
      </div>}
    </section>}
  </div>;
}
