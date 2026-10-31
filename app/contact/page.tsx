"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Sparkles, Mail, Phone, Clock, CheckCircle2, Send } from "lucide-react";
import { CITIES } from "@/data/cities";
import { EVENT_CATEGORIES } from "@/data/categories";

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
    <div className="min-h-screen flex flex-col bg-[#FAF8F3] dark:bg-[#151B18] text-[#252522] dark:text-[#F4F0E7] transition-colors duration-200">
      <Navbar />

      <main className="flex-1 py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E7EFEA] dark:bg-[#173F35]/50 border border-[#173F35]/20 text-[#173F35] dark:text-[#A9C7B2] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
            <span>Evntora Concierge Desk</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7] tracking-tight">
            Connect With Our Event Architects.
          </h1>
          <p className="text-[#77746D] dark:text-[#B5B5AA] text-base max-w-2xl mx-auto leading-relaxed">
            Whether you&apos;re planning a royal palace wedding or an international corporate summit, our advisory team responds within 4 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Form */}
          <div className="lg:col-span-7 p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-sm">
            {submitted ? (
              <div className="p-8 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-[#173F35] dark:text-[#A9C7B2] mx-auto" />
                <h2 className="text-2xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">Message Received</h2>
                <p className="text-sm text-[#77746D] dark:text-[#B5B5AA] leading-relaxed max-w-md mx-auto">
                  Thank you, <span className="text-[#173F35] dark:text-[#A9C7B2] font-semibold">{name}</span>. A senior Evntora event architect has been assigned to your {category} inquiry in {city} and will connect with you shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] text-[#252522] dark:text-[#F4F0E7] hover:bg-[#E7EFEA] border border-[#E8E2D7] dark:border-[#344139] text-xs font-semibold cursor-pointer"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1 font-semibold">Your Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Radhika Ambani"
                    className="w-full px-4 py-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1 font-semibold">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.com"
                      className="w-full px-4 py-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1 font-semibold">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98200 12345"
                      className="w-full px-4 py-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1 font-semibold">Celebration Type</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] text-xs cursor-pointer"
                    >
                      {EVENT_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1 font-semibold">Destination / City</label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] text-xs cursor-pointer"
                    >
                      {CITIES.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name} ({c.state})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[#77746D] dark:text-[#B5B5AA] mb-1 font-semibold">Celebration Details & Requirements</label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Share expected guest count, dates, preferred palace estates or themes, and any special requests..."
                    className="w-full px-4 py-3 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-[#252522] dark:text-[#F4F0E7] placeholder-[#77746D] dark:placeholder-[#898D84] focus:outline-none focus:border-[#173F35] dark:focus:border-[#A9C7B2] text-xs"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[#173F35] hover:bg-[#0F2B24] text-[#FAF8F3] font-bold text-xs tracking-wider uppercase transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Transmit Inquiry to Concierge</span>
                </button>
              </form>
            )}
          </div>

          {/* Contact Details & Regional Offices */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-8 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-sm space-y-6">
              <h3 className="text-xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">Direct Advisory Helplines</h3>
              
              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#173F35] dark:text-[#A9C7B2] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#77746D] dark:text-[#B5B5AA] block">General & VIP Concierge</span>
                    <span className="font-semibold text-[#252522] dark:text-[#F4F0E7] text-sm">+91 (022) 6902 4400</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#173F35] dark:text-[#A9C7B2] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#77746D] dark:text-[#B5B5AA] block">Direct Email</span>
                    <span className="font-semibold text-[#252522] dark:text-[#F4F0E7] text-sm">concierge@evntora.com</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#173F35] dark:text-[#A9C7B2] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[#77746D] dark:text-[#B5B5AA] block">Response Commitment</span>
                    <span className="font-semibold text-[#173F35] dark:text-[#A9C7B2]">Guaranteed callback within 4 business hours</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Regional Offices */}
            <div className="p-8 rounded-3xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-sm space-y-4">
              <h3 className="text-xl font-serif font-bold text-[#173F35] dark:text-[#F4F0E7]">Regional Hubs</h3>

              <div className="space-y-3 text-xs text-[#252522] dark:text-[#F4F0E7]">
                <div className="p-3.5 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] space-y-1">
                  <span className="font-bold text-[#173F35] dark:text-[#A9C7B2] block">Mumbai Headquarters</span>
                  <p className="text-[#77746D] dark:text-[#B5B5AA] text-[11px]">Bandra Kurla Complex (BKC), Mumbai, Maharashtra 400051</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] space-y-1">
                  <span className="font-bold text-[#173F35] dark:text-[#A9C7B2] block">Delhi NCR Bureau</span>
                  <p className="text-[#77746D] dark:text-[#B5B5AA] text-[11px]">Worldmark 2, Aerocity, New Delhi, Delhi 110037</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] space-y-1">
                  <span className="font-bold text-[#173F35] dark:text-[#A9C7B2] block">Bengaluru Tech & Innovation Hub</span>
                  <p className="text-[#77746D] dark:text-[#B5B5AA] text-[11px]">100ft Road, Indiranagar, Bengaluru, Karnataka 560038</p>
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
