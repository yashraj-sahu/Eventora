import { Star, Quote, MapPin, Calendar, ShieldCheck } from "lucide-react";

export function Testimonials() {
  const stories = [
    {
      couple: "Ananya & Aarav Singhania",
      eventType: "Royal 3-Day Destination Wedding",
      city: "Udaipur, Rajasthan",
      venue: "The Oberoi Udaivilas",
      guestCount: 350,
      budget: "₹85 Lakhs",
      quote:
        "Evntora’s AI blueprint was pure magic. Managing 350 guests arriving from London and Mumbai across Mehendi, Sangeet, and the Pheras seemed overwhelming. Evntora orchestrated every vendor, diet nuance, and boat transfer without a single hiccup.",
      rating: 5,
    },
    {
      couple: "Siddharth Malhotra",
      eventType: "Global AI & Cloud Leadership Summit",
      city: "Bengaluru, Karnataka",
      venue: "The Leela Palace Bengaluru",
      guestCount: 500,
      budget: "₹35 Lakhs",
      quote:
        "For our annual CXO summit, we needed millimeter precision for staging, simultaneous breakout halls, and 5-star catering. Evntora eliminated weeks of vendor back-and-forth and delivered complete budget transparency.",
      rating: 5,
    },
    {
      couple: "Tara & Kabir Mehra",
      eventType: "Beachfront Sunset Wedding & Sundowner",
      city: "Goa",
      venue: "W Goa Vagator Beach",
      guestCount: 220,
      budget: "₹42 Lakhs",
      quote:
        "We wanted a contemporary boho vibe with a killer DJ and molecular cocktails. Evntora matched us with DJ Rohit and botanical decorators who brought our dream to life. Our guests are still raving about the afterparty!",
      rating: 5,
    },
  ];

  return (
    <section className="py-24 bg-[#06070a] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Clearly Identified Sample Case Stories</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-tight">
            Celebrated Moments, Flawlessly Delivered.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Read how hosts, couples, and enterprise leaders use Evntora to orchestrate unforgettable events across India.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stories.map((story, i) => (
            <div
              key={i}
              className="p-8 rounded-2xl glass-card border border-white/10 hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(story.rating)].map((_, idx) => (
                      <Star key={idx} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <Quote className="w-6 h-6 text-slate-700" />
                </div>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                  &ldquo;{story.quote}&rdquo;
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-2">
                <div>
                  <h3 className="text-sm font-serif font-bold text-white">{story.couple}</h3>
                  <div className="text-xs text-amber-400/90 font-medium">{story.eventType}</div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    {story.city}
                  </span>
                  <span>•</span>
                  <span>{story.guestCount} Guests</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-300">{story.budget}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

