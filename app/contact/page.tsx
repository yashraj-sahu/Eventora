"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Sparkles, Mail, Phone, Clock, CheckCircle2, Send } from "lucide-react";
import { CITIES } from "@/data/cities";
import { EVENT_CATEGORIES } from "@/data/categories";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("Weddings");
  const [city, setCity] = useState("Udaipur");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#FFF3E3] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#681B1D]/10 dark:bg-[#B77A36]/20 border border-[#B77A36]/30 text-[#681B1D] dark:text-[#EAD2B0] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#B77A36]" />
            <span>Evntora Concierge Desk</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-serif font-bold text-[#30221D] dark:text-[#FFF3E3] tracking-tight">
            Connect With Our Event Architects.
          </h1>
          <p className="text-[#30221D]/70 dark:text-[#FFF3E3]/70 text-base max-w-2xl mx-auto leading-relaxed">
            Whether you&apos;re planning a royal palace wedding or an international corporate summit, our advisory team responds within 4 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Form */}
          <div className="lg:col-span-7 p-8 sm:p-10 rounded-3xl bg-[#FFFDF9] dark:bg-[#231715] border border-[#EAD2B0] dark:border-[#4D3331] shadow-sm">
            {submitted ? (
              <div className="p-8 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-[#B77A36] dark:text-[#EAD2B0] mx-auto" />
                <h2 className="text-2xl font-serif font-bold text-[#681B1D] dark:text-[#FFF3E3]">Message Received</h2>
                <p className="text-sm text-[#30221D]/70 dark:text-[#FFF3E3]/70 leading-relaxed max-w-md mx-auto">
                  Thank you, <span className="text-[#681B1D] dark:text-[#EAD2B0] font-semibold">{name}</span>. A senior Evntora event architect has been assigned to your {category} inquiry in {city} and will connect with you shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-[#FFF3E3] dark:bg-[#1A1211] text-[#30221D] dark:text-[#FFF3E3] hover:bg-[#FFF3E3]/80 border border-[#EAD2B0] dark:border-[#4D3331] text-xs font-semibold cursor-pointer"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#30221D]/80 dark:text-[#FFF3E3]/80 mb-1 font-semibold">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Radhika Ambani"
                    className="w-full px-4 py-3 rounded-xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] focus:outline-none focus:border-[#B77A36] text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#30221D]/80 dark:text-[#FFF3E3]/80 mb-1 font-semibold">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.com"
                      className="w-full px-4 py-3 rounded-xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] focus:outline-none focus:border-[#B77A36] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[#30221D]/80 dark:text-[#FFF3E3]/80 mb-1 font-semibold">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98200 12345"
                      className="w-full px-4 py-3 rounded-xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] focus:outline-none focus:border-[#B77A36] text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#30221D]/80 dark:text-[#FFF3E3]/80 mb-1 font-semibold">Celebration Type</label>
                    <SearchableSelect label="Celebration Type" labelClassName="sr-only" value={category} options={EVENT_CATEGORIES.map((cat) => ({ value: cat.id, label: cat.name }))} onChange={setCategory} allowCustom customLabel="Use category" />
                  </div>

                  <div>
                    <label className="block text-[#30221D]/80 dark:text-[#FFF3E3]/80 mb-1 font-semibold">Destination / City</label>
                    <SearchableSelect label="Destination / City" labelClassName="sr-only" value={city} options={CITIES.map((c) => ({ value: c.name, label: c.name, description: c.state }))} onChange={setCity} allowCustom customLabel="Use city" />
                  </div>
                </div>

                <div>
                  <label className="block text-[#30221D]/80 dark:text-[#FFF3E3]/80 mb-1 font-semibold">Celebration Details & Requirements</label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share expected guest count, dates, preferred palace estates or themes, and any special requests..."
                    className="w-full px-4 py-3 rounded-xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] text-[#30221D] dark:text-[#FFF3E3] placeholder-[#30221D]/40 dark:placeholder-[#FFF3E3]/40 focus:outline-none focus:border-[#B77A36] text-xs"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[#681B1D] hover:bg-[#4B1117] text-[#FFF3E3] font-bold text-xs tracking-wider uppercase transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Transmit Inquiry to Concierge</span>
                </button>
              </form>
            )}
          </div>

          {/* Contact Details & Regional Offices */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#231715] border border-[#EAD2B0] dark:border-[#4D3331] shadow-sm space-y-6">
              <h3 className="text-xl font-serif font-bold text-[#681B1D] dark:text-[#FFF3E3]">Direct Advisory Helplines</h3>
              
              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#B77A36] dark:text-[#EAD2B0] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#30221D]/70 dark:text-[#FFF3E3]/70 block">General & VIP Concierge</span>
                    <span className="font-semibold text-[#30221D] dark:text-[#FFF3E3] text-sm">+91 (022) 6902 4400</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#B77A36] dark:text-[#EAD2B0] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#30221D]/70 dark:text-[#FFF3E3]/70 block">Direct Email</span>
                    <span className="font-semibold text-[#30221D] dark:text-[#FFF3E3] text-sm">concierge@evntora.com</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#B77A36] dark:text-[#EAD2B0] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#30221D]/70 dark:text-[#FFF3E3]/70 block">Response Commitment</span>
                    <span className="font-semibold text-[#681B1D] dark:text-[#EAD2B0]">Guaranteed callback within 4 business hours</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Regional Offices */}
            <div className="p-8 rounded-3xl bg-[#FFFDF9] dark:bg-[#231715] border border-[#EAD2B0] dark:border-[#4D3331] shadow-sm space-y-4">
              <h3 className="text-xl font-serif font-bold text-[#681B1D] dark:text-[#FFF3E3]">Regional Hubs</h3>

              <div className="space-y-3 text-xs text-[#30221D] dark:text-[#FFF3E3]">
                <div className="p-3.5 rounded-2xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] space-y-1">
                  <span className="font-bold text-[#681B1D] dark:text-[#EAD2B0] block">Mumbai Headquarters</span>
                  <p className="text-[#30221D]/70 dark:text-[#FFF3E3]/70 text-[11px]">Bandra Kurla Complex (BKC), Mumbai, Maharashtra 400051</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] space-y-1">
                  <span className="font-bold text-[#681B1D] dark:text-[#EAD2B0] block">Delhi NCR Bureau</span>
                  <p className="text-[#30221D]/70 dark:text-[#FFF3E3]/70 text-[11px]">Worldmark 2, Aerocity, New Delhi, Delhi 110037</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FFF3E3]/50 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] space-y-1">
                  <span className="font-bold text-[#681B1D] dark:text-[#EAD2B0] block">Bengaluru Tech & Innovation Hub</span>
                  <p className="text-[#30221D]/70 dark:text-[#FFF3E3]/70 text-[11px]">100ft Road, Indiranagar, Bengaluru, Karnataka 560038</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
