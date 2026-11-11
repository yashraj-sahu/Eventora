import { VendorProfile } from "@/components/vendors/VendorProfile";

export default function CustomerVendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <VendorProfile params={params} embedded />;
}
