import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PublicAIAssistant } from "@/components/ai/PublicAIAssistant";

export default function PublicAIAssistantPage() {
  return <div className="min-h-screen flex flex-col bg-[#FAF8F3] dark:bg-[#151B18] text-[#252522] dark:text-[#F4F0E7]"><Navbar /><main className="flex-1"><PublicAIAssistant /></main><Footer /></div>;
}
