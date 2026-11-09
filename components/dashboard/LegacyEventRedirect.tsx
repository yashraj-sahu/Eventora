"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LegacyEventRedirect({ section }: { section: string }) {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const queryEventId = params.get("eventId");
    if (queryEventId) {
      router.replace(`/dashboard/events/${encodeURIComponent(queryEventId)}${section === "overview" ? "" : `?section=${section}`}`);
      return;
    }
    void fetch("/api/ai/events", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (response.ok && data.events?.[0]?.id) router.replace(`/dashboard/events/${data.events[0].id}${section === "overview" ? "" : `?section=${section}`}`);
      else router.replace("/dashboard/events");
    }).catch(() => router.replace("/dashboard/events"));
  }, [params, router, section]);
  return <div role="status" className="p-12 text-center rounded-3xl bg-[#FFFCF6] dark:bg-[#241918] border border-[#EAD2B0] dark:border-[#4D3331] text-sm">Opening this section in your event workspace…</div>;
}
