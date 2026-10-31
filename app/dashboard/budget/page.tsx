"use client";

import { useState } from "react";
import { useEvntoraStore } from "@/lib/store";
import { formatINR } from "@/lib/utils";
import {
  Coins,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  PieChart as PieIcon,
  ShieldCheck,
} from "lucide-react";

export default function BudgetTrackerPage() {
  const { activeEvent, activeExpenses, addExpense, deleteExpense } = useEvntoraStore();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Venue");
  const [vendorName, setVendorName] = useState("");
  const [amount, setAmount] = useState<number>(100000);
  const [status, setStatus] = useState<"paid" | "pending" | "due">("pending");
  const [dueDate, setDueDate] = useState("2026-11-10");
  const [showAddModal, setShowAddModal] = useState(false);

  const totalBudget = activeEvent?.totalBudget || 4500000;
  const totalSpent = activeExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBudget = totalBudget - totalSpent;
  const isOverBudget = remainingBudget < 0;

  // Category breakdown
  const categoryBudgets = [
    { name: "Venue", defaultPct: 35, color: "bg-amber-400" },
    { name: "Catering", defaultPct: 28, color: "bg-emerald-400" },
    { name: "Decor", defaultPct: 16, color: "bg-indigo-400" },
    { name: "Photography", defaultPct: 9, color: "bg-rose-400" },
    { name: "Entertainment", defaultPct: 7, color: "bg-purple-400" },
    { name: "Logistics & Misc", defaultPct: 5, color: "bg-slate-400" },
  ];

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;

    addExpense({
      eventId: activeEvent?.id || "evt-01",
      title,
      category,
      vendorName,
      amount,
      status,
      dueDate,
    });

    setTitle("");
    setVendorName("");
    setAmount(100000);
    setShowAddModal(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20">
            <Coins className="w-3.5 h-3.5" />
            <span>Fiscal Management System</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white">
            Budget Intelligence & Expense Ledger
          </h1>
          <p className="text-xs text-slate-400">
            Real-time tracking of committed contracts, advance deposits, and remaining budget in INR
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense Item</span>
        </button>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-2">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
            Total Allocated Budget
          </span>
          <div className="text-3xl font-serif font-bold text-white">{formatINR(totalBudget)}</div>
          <p className="text-[11px] text-slate-500">Configured in Event Blueprint</p>
        </div>

        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-2">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
            Actual Committed / Spent
          </span>
          <div className="text-3xl font-serif font-bold text-amber-400">{formatINR(totalSpent)}</div>
          <p className="text-[11px] text-slate-500">
            {Math.round((totalSpent / totalBudget) * 100)}% of total funds committed
          </p>
        </div>

        <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-2">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
            Remaining Available Funds
          </span>
          <div
            className={`text-3xl font-serif font-bold ${
              isOverBudget ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {formatINR(remainingBudget)}
          </div>
          {isOverBudget ? (
            <div className="flex items-center gap-1 text-[11px] text-rose-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Budget exceeded by {formatINR(Math.abs(remainingBudget))}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Safe operational runway</span>
            </div>
          )}
        </div>
      </div>

      {/* Category Breakdown Progress */}
      <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-6">
        <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
          <PieIcon className="w-5 h-5 text-amber-400" />
          <span>Category-Wise Allocation vs. Actual Spending</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryBudgets.map((cat, i) => {
            const catSpent = activeExpenses
              .filter((e) => e.category.toLowerCase().includes(cat.name.toLowerCase()))
              .reduce((sum, e) => sum + e.amount, 0);
            const targetAlloc = Math.round((totalBudget * cat.defaultPct) / 100);
            const spentPct = Math.round((catSpent / targetAlloc) * 100);

            return (
              <div key={i} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${cat.color}`}></span>
                    <span className="font-semibold text-white">{cat.name}</span>
                  </div>
                  <span className="text-slate-400">{cat.defaultPct}% Target</span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <span className="font-serif font-bold text-white text-sm">
                    {formatINR(catSpent)}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    of {formatINR(targetAlloc)}
                  </span>
                </div>

                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${cat.color} rounded-full transition-all duration-300`}
                    style={{ width: `${Math.min(spentPct, 100)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expense Ledger Table */}
      <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-white">Expense Ledger</h2>
          <span className="text-xs text-slate-400">{activeExpenses.length} Total Line Items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Item & Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Artisan / Vendor</th>
                <th className="py-3 px-4">Amount (INR)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activeExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white">{exp.title}</td>
                  <td className="py-3.5 px-4 text-slate-300">{exp.category}</td>
                  <td className="py-3.5 px-4 text-slate-400">{exp.vendorName || "—"}</td>
                  <td className="py-3.5 px-4 font-serif font-bold text-amber-400">
                    {formatINR(exp.amount)}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          exp.status === "paid"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : exp.status === "due"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {exp.status}
                      </span>
                      {exp.status !== "paid" && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/bookings/create", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  vendorId: "v-01",
                                  vendorName: exp.vendorName || exp.title,
                                  vendorCategory: exp.category || "Vendor Services",
                                  packageName: exp.title,
                                  eventDate: exp.dueDate || "2026-11-20",
                                  eventCity: activeEvent?.city || "Udaipur",
                                  totalAmount: exp.amount,
                                  advancePercentage: 100,
                                  requirements: `Settlement for ${exp.title}`,
                                }),
                              });
                              const data = await res.json();
                              if (data.bookingId) {
                                window.location.assign(`/checkout?bookingId=${data.bookingId}`);
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase transition-all cursor-pointer shadow-xs inline-flex items-center gap-1"
                        >
                          Pay
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => deleteExpense(exp.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      title="Remove expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-8 rounded-3xl glass-dropdown border border-amber-500/40 shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-serif font-bold text-white">Record New Expense</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Expense Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sangeet Sound Rigging Deposit"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="Venue">Venue</option>
                    <option value="Catering">Catering</option>
                    <option value="Decor">Decor</option>
                    <option value="Photography">Photography</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Logistics">Logistics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Amount (INR)</label>
                  <input
                    type="number"
                    min="1000"
                    step="5000"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Vendor / Payee</label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="e.g. DJ Rohit Music"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Payment Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="due">Due Soon</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

