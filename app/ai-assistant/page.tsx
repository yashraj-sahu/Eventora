import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PublicAIAssistant } from "@/components/ai/PublicAIAssistant";

export default function PublicAIAssistantPage() {
  return <div className="min-h-screen flex flex-col bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#F4F0E7]"><Navbar /><main className="flex-1"><PublicAIAssistant /></main><Footer /></div>;
}
