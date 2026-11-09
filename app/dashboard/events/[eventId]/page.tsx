import { EventWorkspace } from "@/components/dashboard/EventWorkspace";

export default async function EventWorkspacePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  return <EventWorkspace eventId={eventId} />;
}
