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
    <div className="min-h-screen flex flex-col bg-[#08090d] text-slate-100 selection:bg-amber-500 selection:text-slate-950 font-sans">
      <Navbar />

      {/* Page Body */}
      <main className="flex-1">
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
