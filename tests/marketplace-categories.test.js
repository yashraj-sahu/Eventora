import test from "node:test";
import assert from "node:assert/strict";
import { EVENT_CATEGORIES } from "../data/categories.ts";
import { CITIES } from "../data/cities.ts";

test("Marketplace Categories: All core Indian celebration types defined with imagery & ranges", () => {
  assert.ok(EVENT_CATEGORIES.length >= 5, "Must have at least 5 major celebration categories");

  const requiredCategories = ["Weddings", "Engagements", "Corporate events", "Birthdays", "Anniversaries"];
  const definedIds = EVENT_CATEGORIES.map((c) => c.id);

  for (const req of requiredCategories) {
    assert.ok(definedIds.includes(req), `Category ${req} must be defined`);
  }

  for (const cat of EVENT_CATEGORIES) {
    assert.ok(cat.name && cat.name.length > 3, `Category ${cat.id} must have a descriptive title`);
    assert.ok(cat.description && cat.description.length > 10, `Category ${cat.id} must have description`);
    assert.ok(cat.avgBudgetRange && cat.avgBudgetRange.includes("₹"), `Category ${cat.id} must specify budget in INR`);
    assert.ok(cat.typicalGuestRange && cat.typicalGuestRange.includes("Guest"), `Category ${cat.id} must specify guest range`);
    assert.ok(cat.image && cat.image.startsWith("http"), `Category ${cat.id} must have a valid cover image URL`);
  }
});

test("Marketplace Destinations: Curated Indian event hubs use editorial content, not inventory counts", () => {
  assert.ok(CITIES.length >= 6, "Must support at least 6 premier Indian destinations");

  const expectedCities = ["Udaipur", "Jaipur", "Goa", "Mumbai", "Delhi NCR", "Bengaluru"];
  const cityNames = CITIES.map((c) => c.name);

  for (const expected of expectedCities) {
    assert.ok(cityNames.includes(expected), `City ${expected} must be configured`);
  }

  for (const city of CITIES) {
    assert.ok(city.popularFor.length > 0, `City ${city.name} must list specialty event types`);
    assert.ok(city.state, `City ${city.name} must have state specified`);
  }
  assert.ok(CITIES.every((city) => !("venueCount" in city)), "Static destination content must not claim hardcoded marketplace inventory");
});

test("Marketplace Search & Filter Simulation: Correctly filters vendor sets", () => {
  const mockVendors = [
    { id: "1", name: "Taj Lake Palace", category: "Venues", city: "Udaipur", startingPrice: 1500000, verified: true },
    { id: "2", name: "Royal Rajasthan Decor", category: "Decorators", city: "Udaipur", startingPrice: 300000, verified: true },
    { id: "3", name: "Goa Beachfront Mandaps", category: "Decorators", city: "Goa", startingPrice: 400000, verified: true },
    { id: "4", name: "Mumbai Lens & Cinema", category: "Photographers", city: "Mumbai", startingPrice: 200000, verified: false },
  ];

  // Filter by category
  const filterByCategory = (list, cat) => list.filter((v) => v.category === cat);
  const decor = filterByCategory(mockVendors, "Decorators");
  assert.equal(decor.length, 2);

  // Filter by city
  const filterByCity = (list, city) => list.filter((v) => v.city.toLowerCase() === city.toLowerCase());
  const udaipur = filterByCity(mockVendors, "Udaipur");
  assert.equal(udaipur.length, 2);

  // Combined filter
  const combined = mockVendors.filter((v) => v.city === "Udaipur" && v.category === "Decorators");
  assert.equal(combined.length, 1);
  assert.equal(combined[0].name, "Royal Rajasthan Decor");

  // Empty result handled gracefully
  const noMatches = mockVendors.filter((v) => v.city === "Shimla");
  assert.deepEqual(noMatches, []);
});

