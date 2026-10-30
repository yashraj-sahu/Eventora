export interface InspirationItem {
  id: string;
  title: string;
  category: "Theme" | "Color Palette" | "Decor" | "Lighting" | "Mandap" | "Table Setting";
  description: string;
  image: string;
  tags: string[];
  colors?: { name: string; hex: string }[];
}

export const INSPIRATION_ITEMS: InspirationItem[] = [
  {
    id: "insp-01",
    title: "Royal Mewari Heritage",
    category: "Theme",
    description: "Opulent Rajputana architecture, rich crimson drapes, antique brass lamps, and fragrant marigold arches.",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
    tags: ["Royal", "Traditional", "Udaipur", "Palace"],
    colors: [
      { name: "Mewari Crimson", hex: "#991b1b" },
      { name: "Antique Gold", hex: "#d97706" },
      { name: "Ivory Pearl", hex: "#fef3c7" },
    ],
  },
  {
    id: "insp-02",
    title: "Enchanted Glasshouse & Fairy Lights",
    category: "Decor",
    description: "Botanical transparent conservatory setup filled with cascading eucalyptus, suspended crystal chandeliers, and warm amber pin-spots.",
    image: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&q=80",
    tags: ["Modern", "Romantic", "Evening", "Indoor"],
    colors: [
      { name: "Forest Emerald", hex: "#065f46" },
      { name: "Champagne Warmth", hex: "#fde68a" },
      { name: "Slate Velvet", hex: "#1e293b" },
    ],
  },
  {
    id: "insp-03",
    title: "Goan Coastal Sunset Chic",
    category: "Theme",
    description: "Breezy bohemian macramé canopies, driftwood accents, pastel coral blooms, and sandy sundowner cocktail vibes.",
    image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80",
    tags: ["Beach", "Sundowner", "Goa", "Bohemian"],
    colors: [
      { name: "Sunset Peach", hex: "#fb923c" },
      { name: "Seafoam Teal", hex: "#2dd4bf" },
      { name: "Sand Dune", hex: "#fef08a" },
    ],
  },
  {
    id: "insp-04",
    title: "Minimalist High-Impact Tech Gala",
    category: "Lighting",
    description: "Sculptural neon geometries, matte black acrylic stages, futuristic tunnel entrances, and intelligent kinetic LED trusses.",
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80",
    tags: ["Corporate", "Tech", "Futuristic", "Bengaluru"],
    colors: [
      { name: "Electric Cyan", hex: "#06b6d4" },
      { name: "Deep Obsidian", hex: "#090a0f" },
      { name: "Platinum Grey", hex: "#94a3b8" },
    ],
  },
  {
    id: "insp-05",
    title: "Floating Lotus Sacred Mandap",
    category: "Mandap",
    description: "Circular mirrored stage surrounded by calm reflective water, floating pink lotus blossoms, and brass diya urns.",
    image: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=800&q=80",
    tags: ["Sacred", "Pheras", "Floral", "Water"],
    colors: [
      { name: "Lotus Pink", hex: "#f472b6" },
      { name: "Pure Sandalwood", hex: "#fff7ed" },
      { name: "Royal Saffron", hex: "#ea580c" },
    ],
  },
  {
    id: "insp-06",
    title: "Imperial Banqueting Tablescape",
    category: "Table Setting",
    description: "Velvet runners, gold-rimmed fine bone china, personalized calligraphed menu scrolls, and low fragrant floral runner arrangements.",
    image: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800&q=80",
    tags: ["Dining", "Luxury", "Gold", "Couture"],
    colors: [
      { name: "Polished Gold", hex: "#eab308" },
      { name: "Midnight Navy", hex: "#0f172a" },
      { name: "Crisp Snow", hex: "#ffffff" },
    ],
  },
];

