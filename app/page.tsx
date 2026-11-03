import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/home/Hero";
import { CategoryShowcase } from "@/components/home/CategoryShowcase";
import { HowItWorks } from "@/components/home/HowItWorks";
import { FeaturedVendors } from "@/components/home/FeaturedVendors";
import { DestinationShowcase } from "@/components/home/DestinationShowcase";
import { AIPlannerShowcase } from "@/components/home/AIPlannerShowcase";
import { BudgetShowcase } from "@/components/home/BudgetShowcase";
import { Testimonials } from "@/components/home/Testimonials";
import { FinalCTA } from "@/components/home/FinalCTA";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col w-full bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#FFF3E3] selection:bg-[#681B1D] dark:selection:bg-[#EAD2B0] selection:text-[#FFF3E3] dark:selection:text-[#4B1117] font-sans transition-colors duration-200">
      <Navbar />

      {/* Page Body */}
      <main className="flex-1 w-full">
        <Hero />
        <CategoryShowcase />
        <HowItWorks />
        <AIPlannerShowcase />
        <FeaturedVendors />
        <DestinationShowcase />
        <BudgetShowcase />
        <Testimonials />
        <FinalCTA />
      </main>

      {/* Comprehensive Footer */}
      <Footer />
    </div>
  );
}
