import { AIEventBlueprint, EventCategory } from "@/types";

interface GenerateBlueprintParams {
  category: EventCategory;
  city: string;
  date: string;
  guestCount: number;
  totalBudget: number;
  venuePreference?: string;
  styleTheme?: string;
  requirements?: string;
}

export function generateAIBlueprint(params: GenerateBlueprintParams): AIEventBlueprint {
  const { category, city, date, guestCount, totalBudget, styleTheme, venuePreference } = params;
  const blueprintSeed = `${category}|${city}|${date}|${guestCount}|${totalBudget}`;
  const blueprintHash = Array.from(blueprintSeed).reduce(
    (hash, character) => (Math.imul(hash, 31) + character.charCodeAt(0)) | 0,
    0
  );

  // Calculate intelligent budget allocation percentages based on Indian event standards
  let venuePct = 0.35;
  let cateringPct = 0.28;
  let decorPct = 0.16;
  let photoPct = 0.09;
  let entertainPct = 0.07;
  let miscPct = 0.05;

  if (category === "Corporate events") {
    venuePct = 0.40;
    cateringPct = 0.25;
    decorPct = 0.12;
    photoPct = 0.08;
    entertainPct = 0.10;
    miscPct = 0.05;
  } else if (category === "Birthdays" || category === "Private parties") {
    venuePct = 0.30;
    cateringPct = 0.30;
    decorPct = 0.18;
    entertainPct = 0.12;
    photoPct = 0.06;
    miscPct = 0.04;
  }

  const budgetBreakdown = [
    {
      category: "Venue & Accommodations",
      percentage: Math.round(venuePct * 100),
      amount: Math.round(totalBudget * venuePct),
      description: `Premium reservation in ${city} for ${guestCount} attendees, including banquet setup and staging rights.`,
    },
    {
      category: "Culinary & Beverage Experiences",
      percentage: Math.round(cateringPct * 100),
      amount: Math.round(totalBudget * cateringPct),
      description: `Bespoke menu tasting, 6-8 live Vendoral counters, signature welcome mocktails, and royal service staff.`,
    },
    {
      category: "Haute Decor & Spatial Production",
      percentage: Math.round(decorPct * 100),
      amount: Math.round(totalBudget * decorPct),
      description: `${styleTheme || "Contemporary Indian Luxe"} aesthetic, dynamic intelligent lighting, thematic floral installations.`,
    },
    {
      category: "Cinematography & Photography",
      percentage: Math.round(photoPct * 100),
      amount: Math.round(totalBudget * photoPct),
      description: `4K multi-camera documentary coverage, drone aerial captures, same-day edit reel, and handcrafted albums.`,
    },
    {
      category: "Entertainment & Live Artists",
      percentage: Math.round(entertainPct * 100),
      amount: Math.round(totalBudget * entertainPct),
      description: `Curated performance ensemble, celebrity DJ, sound engineering, and guest engagement hosts.`,
    },
    {
      category: "Logistics, Licenses & Contingency",
      percentage: Math.round(miscPct * 100),
      amount: Math.round(totalBudget * miscPct),
      description: `Sound permissions (PPL/IPRS), guest hospitality kits, valet services, and contingency reserve.`,
    },
  ];

  const themeColors = styleTheme?.toLowerCase().includes("royal")
    ? [
        { name: "Mewari Gold", hex: "#D4AF37" },
        { name: "Deep Ruby", hex: "#881337" },
        { name: "Ivory Silk", hex: "#FFFBEB" },
        { name: "Soft Champagne", hex: "#EAD2B0" },
      ]
    : styleTheme?.toLowerCase().includes("beach") || city.toLowerCase() === "goa"
    ? [
        { name: "Sunset Tangerine", hex: "#F97316" },
        { name: "Coastal Aqua", hex: "#06B6D4" },
        { name: "Sandy Champagne", hex: "#FDE68A" },
        { name: "Crisp Linen", hex: "#F8FAFC" },
      ]
    : [
        { name: "Obsidian Slate", hex: "#0F172A" },
        { name: "Champagne Amber", hex: "#F59E0B" },
        { name: "Blush Rose", hex: "#FB7185" },
        { name: "Warm Pearl", hex: "#F1F5F9" },
      ];

  return {
    blueprintId: `EVN-BP-${Math.abs(blueprintHash).toString().padStart(6, "0").slice(-6)}`,
    title: `${category} in ${city} for ${guestCount} Guests`,
    executiveSummary: `An intelligently calibrated ${category.toLowerCase()} blueprint tailored for ${guestCount} distinguished guests in ${city} on ${date || "the selected date"}. Designed to maximize attendee enchantment while enforcing strict fiscal discipline within your ₹${(totalBudget / 100000).toFixed(1)} Lakh budget allocation.`,
    themeAndAtmosphere: {
      themeName: styleTheme || "Contemporary Heritage Elegance",
      colorPalette: themeColors,
      designNotes: `A harmonious fusion of regional Indian architectural charm and crisp international minimalism. Warm atmospheric up-lighting, textured fabrics, and fragrant native floral garlands.`,
    },
    recommendedBudget: {
      total: totalBudget,
      breakdown: budgetBreakdown,
    },
    venueRecommendations: [
      {
        name: venuePreference || `Premier Palace & Convention Grounds, ${city}`,
        city: city,
        type: "Heritage Resort & Grand Lawn",
        capacity: `${guestCount + 100} Pax`,
        estimatedCost: `₹${(Math.round(totalBudget * venuePct) / 100000).toFixed(1)} Lakhs`,
        highlight: "Exclusive private entry, expansive lawn, weather-proof banquet pavilion.",
      },
      {
        name: `The Grand Luxury Collection, ${city}`,
        city: city,
        type: "5-Star Luxury Ballroom",
        capacity: `${guestCount + 50} Pax`,
        estimatedCost: `₹${(Math.round(totalBudget * venuePct * 0.9) / 100000).toFixed(1)} Lakhs`,
        highlight: "Column-free ballroom, soundproof partitions, dedicated valet lobby.",
      },
    ],
    culinaryStrategy: {
      cuisineStyle: "Progressive Indian Heritage & Mediterranean Fusion",
      recommendedCounters: [
        "Vendoral Delhi & Lucknow Chaat Street with modern gastronomy flair",
        "Wood-fired Vendoral thin crust flatbreads and burrata bar",
        "Awadhi Dum Biryani & Slow-cooked Dal Bukhara station",
        "Nitro Kulfi & Belgian Chocolate fondue dessert island",
      ],
      beverageHighlights: [
        "Signature Smoked Rosemary botanical mocktails",
        "Fresh tender coconut & rose-infused welcome elixirs",
        "Specialty Vendoral coffee & saffron chai bar",
      ],
    },
    decorAndFloral: {
      mandapOrStage: "Sculptural floral pavilion adorned with brass lanterns and cascading jasmine blooms.",
      lightingConcept: "Warm ambient 2700K tungsten washes, intelligent pin-spotting on guest dining tables, and starry fairy-light canopies.",
      floralSelections: ["Indian Tuberose (Rajnigandha)", "Imported Holland Garden Roses", "Fragrant Mogra", "Eucalyptus & Pampas Grass"],
    },
    photographyGuidelines: {
      coverageType: "Editorial Photojournalism & Cinematic 4K Film",
      mustHaveShots: [
        "Candid emotional moments with immediate family and key guests",
        "Sunset golden-hour couple and VIP portraits against scenic architecture",
        "Sweeping drone aerial perspective of venue layout and guest arrival",
        "Detailed macro captures of jewelry, floral textures, and culinary plating",
      ],
    },
    entertainmentProgram: {
      welcomeAct: "Acoustic Santoor and Flute instrumentalists greeting arriving guests.",
      mainPerformances: [
        "Curated 45-minute high-energy performance segment",
        "Interactive celebrity percussionist jamming with contemporary hits",
      ],
      afterParty: "Club DJ spinning progressive Bollywood remixes and global house until closing.",
    },
    runOfShowTimeline: [
      {
        time: "16:00 - 17:00",
        activity: "Guest Arrival & Welcome Refreshments",
        location: "Foyer & Courtyard",
        responsiblePerson: "Hospitality Lead",
        notes: "Acoustic melodies playing, cold towels and signature welcome coolers served.",
      },
      {
        time: "17:15 - 18:30",
        activity: "Main Ceremony / Keynote Proceedings",
        location: "Central Pavilion",
        responsiblePerson: "Event Producer",
        notes: "Audio checks completed 30 mins prior; VIP seating verified.",
      },
      {
        time: "18:45 - 20:15",
        activity: "Sunset Cocktails & Golden Hour Photography",
        location: "Open Terrace Lawn",
        responsiblePerson: "Lead Cinematographer",
        notes: "Pass-around hors d'oeuvres and interactive live counters open.",
      },
      {
        time: "20:30 - 22:30",
        activity: "Gourmet Banquet Feast & Stage Performances",
        location: "Grand Banquet Hall",
        responsiblePerson: "Banquet Captain",
        notes: "Live performance kicks off, main dining stations fully activated.",
      },
      {
        time: "22:45 onwards",
        activity: "Celebration Dancefloor & Late Night Bites",
        location: "Lounge & Club Zone",
        responsiblePerson: "DJ & Sound Coordinator",
        notes: "Late night sliders, chai, and dessert salon open for remaining guests.",
      },
    ],
    planningChecklist: [
      { task: "Lock venue contract & secure dates with deposit", timeframe: "3+ Months Prior" },
      { task: "Finalize menu tasting & beverage selections", timeframe: "6 Weeks Prior" },
      { task: "Review and approve 3D floral & stage decor renders", timeframe: "4 Weeks Prior" },
      { task: "Send digital RSVP reminders and collect dietary preferences", timeframe: "3 Weeks Prior" },
      { task: "Conduct technical walk-through with AV & lighting team", timeframe: "10 Days Prior" },
      { task: "Confirm final headcount with master caterer", timeframe: "5 Days Prior" },
      { task: "Full day-of rehearsal with emcee and event coordinators", timeframe: "Day Before" },
    ],
    culturalAndLogisticalReminders: [
      "Obtain required PPL/IPRS music licenses for commercial DJ sets.",
      "Ensure alternate indoor or rain-proof backup arrangements if outdoor lawn is utilized.",
      "Provide separate dietary station for Jain and strict vegetarian guests.",
      "Arrange air-conditioned bridal/speaker green rooms with dedicated mirrors and refreshment stations.",
    ],
  };
}

