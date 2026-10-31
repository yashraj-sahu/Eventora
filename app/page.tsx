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
    <div className="min-h-screen flex flex-col w-full bg-[#FAF8F3] dark:bg-[#151B18] text-[#252522] dark:text-[#F4F0E7] selection:bg-[#173F35] dark:selection:bg-[#A9C7B2] selection:text-white dark:selection:text-[#151B18] font-sans transition-colors duration-200">
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
