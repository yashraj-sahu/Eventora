"use client";

import { useState } from "react";
import { useEvntoraStore } from "@/lib/store";
import { CheckSquare, Plus, Check, Calendar, Tag, ShieldCheck } from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export default function ChecklistPage() {
  const { activeEvent, activeChecklist, toggleChecklist, addChecklistTask } = useEvntoraStore();

  const [filterStage, setFilterStage] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [task, setTask] = useState("");
  const [category, setCategory] = useState("General");
  const [timelineStage, setTimelineStage] = useState<any>("1 Month Out");
  const [dueDate, setDueDate] = useState("2026-11-05");

  const completedCount = activeChecklist.filter((c) => c.completed).length;
  const progressPct = activeChecklist.length
    ? Math.round((completedCount / activeChecklist.length) * 100)
    : 0;

  const filteredTasks = activeChecklist.filter((c) => {
    return filterStage === "All" || c.timelineStage === filterStage;
  });

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    addChecklistTask({
      eventId: activeEvent?.id || "evt-01",
      task,
      category,
      timelineStage,
      completed: false,
      dueDate,
    });
    setTask("");
    setShowAddModal(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Master Task Tracker</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white">
            Planning Checklist & Action Items
          </h1>
          <p className="text-xs text-slate-400">
            Milestone checkpoints to ensure no cultural ritual or vendor dependency is overlooked
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Task</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-white">
            Overall Completion ({completedCount} of {activeChecklist.length} tasks)
          </span>
          <span className="font-bold text-amber-400">{progressPct}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          ></div>
        </div>
      </div>

      {/* Stage Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {["All", "3+ Months Out", "1 Month Out", "2 Weeks Out", "1 Week Out", "Day Of Event"].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStage(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterStage === st
                ? "bg-amber-500 text-slate-950"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Checklist List */}
      <div className="space-y-3">
        {filteredTasks.map((item) => (
          <div
            key={item.id}
            onClick={() => toggleChecklist(item.id)}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
              item.completed
                ? "bg-slate-950/40 border-slate-900 opacity-60"
                : "glass-card border-white/10 hover:border-amber-500/30"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md mt-0.5 border flex items-center justify-center shrink-0 transition-colors ${
                item.completed
                  ? "bg-emerald-500 border-emerald-500 text-slate-950 font-bold text-xs"
                  : "border-slate-700 bg-slate-900 hover:border-amber-400"
              }`}
            >
              {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>

            <div className="flex-1 space-y-1">
              <h3
                className={`text-sm font-semibold transition-colors ${
                  item.completed ? "line-through text-slate-500" : "text-white"
                }`}
              >
                {item.task}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                <span className="text-amber-400/90 font-mono">{item.timelineStage}</span>
                <span>•</span>
                <span>Category: {item.category}</span>
                {item.dueDate && (
                  <>
                    <span>•</span>
                    <span>Due: {item.dueDate}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-8 rounded-3xl glass-dropdown border border-amber-500/40 shadow-2xl space-y-6">
            <h3 className="text-lg font-serif font-bold text-white">Add Task</h3>
            <form onSubmit={handleAddTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Task Description</label>
                <input
                  type="text"
                  required
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="e.g. Confirm floral chandelier rigging with decorators"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <SearchableSelect label="Category" value={category} options={["Venue", "Catering", "Decor", "Photography", "Entertainment", "Guests", "General"].map((value) => ({ value, label: value }))} onChange={setCategory} allowCustom customLabel="Use category" />
                </div>

                <div>
                  <SearchableSelect label="Timeline Stage" value={timelineStage} options={["3+ Months Out", "1 Month Out", "2 Weeks Out", "1 Week Out", "Day Of Event"].map((value) => ({ value, label: value }))} onChange={(value) => setTimelineStage(value as typeof timelineStage)} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
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
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

