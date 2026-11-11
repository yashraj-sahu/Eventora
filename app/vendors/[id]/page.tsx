import { VendorProfile } from "@/components/vendors/VendorProfile";

export default function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <VendorProfile params={params} />;
}
