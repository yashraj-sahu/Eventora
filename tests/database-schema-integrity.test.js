import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.resolve(process.cwd(), "supabase/migrations");

test("Database Migrations: All migration files exist and follow chronological naming", () => {
  assert.ok(fs.existsSync(migrationsDir), "Migrations directory must exist");
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  assert.ok(files.length >= 17, `Expected at least 17 migrations, found ${files.length}`);

  // Ensure 001 through 017 exist
  for (let i = 1; i <= 17; i++) {
    const prefix = String(i).padStart(3, "0");
    const found = files.some((f) => f.startsWith(prefix));
    assert.ok(found, `Migration with prefix ${prefix} must exist`);
  }
});

test("Database RLS Security: All public tables have Row Level Security enabled", () => {
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  const allSql = files.map((f) => fs.readFileSync(path.join(migrationsDir, f), "utf8")).join("\n");

  // Find all created tables
  const tableMatches = [...allSql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?public\.([a-zA-Z0-9_]+)/gi)];
  const createdTables = [...new Set(tableMatches.map((m) => m[1]))];

  assert.ok(createdTables.length > 20, "Should have identified at least 20 core tables");

  // Find all tables where RLS was enabled
  const rlsMatches = [...allSql.matchAll(/ALTER TABLE (?:ONLY )?public\.([a-zA-Z0-9_]+) ENABLE ROW LEVEL SECURITY/gi)];
  const rlsTables = new Set(rlsMatches.map((m) => m[1]));

  for (const table of createdTables) {
    // Exemptions: platform_settings or lookup tables if intentionally public or managed by custom functions
    if (table === "marketplace_categories" || table === "admin_permissions") continue;
    assert.ok(
      rlsTables.has(table),
      `Table public.${table} must have ENABLE ROW LEVEL SECURITY defined across migrations`
    );
  }
});

test("Database Critical Stored Procedures: Core business RPC functions are defined", () => {
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
  const allSql = files.map((f) => fs.readFileSync(path.join(migrationsDir, f), "utf8")).join("\n");

  const requiredFunctions = [
    "create_booking_request",
    "transition_booking",
    "create_booking_quotation",
    "respond_to_booking_quotation",
    "withdraw_booking_quotation",
    "apply_razorpay_capture",
    "reserve_payment_refund",
    "complete_payment_refund",
    "notify_booking_participant",
    "has_admin_permission",
  ];

  for (const fn of requiredFunctions) {
    const regex = new RegExp(`CREATE (?:OR REPLACE )?FUNCTION (?:public\\.)?${fn}\\b`, "i");
    assert.ok(regex.test(allSql), `Stored procedure ${fn} must be defined in migrations`);
  }
});

