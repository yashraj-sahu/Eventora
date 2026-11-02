"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

type PlannerDatePickerProps = {
  value: string;
  onChange: (isoDate: string) => void;
  requiredAttempted?: boolean;
};

const fieldClass = "rounded-lg border border-[#E8E2D7] dark:border-[#344139] bg-white dark:bg-[#1C2520] px-2 py-1.5 text-xs text-[#252522] dark:text-[#F4F0E7] focus:border-[#173F35] focus:outline-none dark:focus:border-[#A9C7B2]";

function localIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseManualDate(value: string) {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed;
}

function isoToManual(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

export function PlannerDatePicker({ value, onChange, requiredAttempted = false }: PlannerDatePickerProps) {
  const [text, setText] = useState(() => isoToManual(value));
  const [open, setOpen] = useState(false);
  const [showInputError, setShowInputError] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const calendarRef = useRef<HTMLDivElement>(null);
  const lastParentValue = useRef(value);
  const skipNextSyncValue = useRef<string | null>(null);
  const today = localIsoDate(new Date());

  useEffect(() => {
    if (value === lastParentValue.current) return;
    lastParentValue.current = value;
    if (value === skipNextSyncValue.current) {
      skipNextSyncValue.current = null;
      return;
    }
    skipNextSyncValue.current = null;
    setText(isoToManual(value));
    if (value) {
      const [year, month] = value.split("-").map(Number);
      setVisibleMonth(new Date(year, month - 1, 1));
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (!calendarRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const parsed = parseManualDate(text);
  const invalidDate = showInputError && Boolean(text) && !parsed;
  const pastDate = Boolean(parsed) && localIsoDate(parsed!) < today;
  const message = invalidDate
    ? "Enter a valid date in DD-MM-YYYY format."
    : pastDate
      ? "Choose today or a future date."
      : requiredAttempted && !value
        ? "Choose a target date."
        : "";

  const updateManualDate = (nextText: string) => {
    setText(nextText);
    const nextDate = parseManualDate(nextText);
    if (!nextText) {
      skipNextSyncValue.current = "";
      onChange("");
      setShowInputError(false);
    } else if (nextDate) {
      const iso = localIsoDate(nextDate);
      if (iso >= today) {
        skipNextSyncValue.current = iso;
        onChange(iso);
        setShowInputError(false);
      } else {
        skipNextSyncValue.current = "";
        onChange("");
        setShowInputError(true);
      }
    } else {
      skipNextSyncValue.current = "";
      onChange("");
      setShowInputError(nextText.length >= 10);
    }
  };

  const days = (() => {
    const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const start = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1 - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  })();
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const selectedDate = value;

  const chooseDate = (date: Date) => {
    const iso = localIsoDate(date);
    if (iso < today) return;
    skipNextSyncValue.current = iso;
    onChange(iso);
    setText(isoToManual(iso));
    setShowInputError(false);
    setOpen(false);
  };

  return (
    <div className="relative" ref={calendarRef}>
      <label htmlFor="planner-target-date" className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-bold uppercase tracking-wider">
        Target Date
      </label>
      <div className="relative">
        <input
          id="planner-target-date"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD-MM-YYYY"
          value={text}
          onChange={(event) => updateManualDate(event.target.value)}
          onBlur={() => setShowInputError(Boolean(text))}
          aria-invalid={Boolean(message)}
          aria-describedby={message ? "planner-date-error" : undefined}
          className="w-full rounded-xl border border-[#E8E2D7] dark:border-[#344139] bg-[#FAF8F3] dark:bg-[#1C2520] py-3 pl-4 pr-12 text-xs font-medium text-[#252522] dark:text-[#F4F0E7] focus:border-[#173F35] focus:outline-none dark:focus:border-[#A9C7B2]"
        />
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? "Close calendar" : "Open calendar"}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="absolute inset-y-0 right-0 flex items-center rounded-r-xl px-3 text-[#173F35] transition-colors hover:bg-[#E7EFEA] dark:text-[#A9C7B2] dark:hover:bg-[#344139]"
        >
          <CalendarDays className="h-4 w-4" />
        </button>
      </div>
      {message && <p id="planner-date-error" role="alert" className="mt-1.5 text-[11px] text-red-700 dark:text-red-300">{message}</p>}

      {open && (
        <div role="dialog" aria-label="Choose target event date" className="absolute left-0 top-full z-40 mt-2 w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-[#E8E2D7] bg-white p-4 shadow-xl dark:border-[#344139] dark:bg-[#232F28]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button type="button" aria-label="Previous month" onClick={() => setVisibleMonth(new Date(year, month - 1, 1))} className="rounded-lg p-2 text-[#173F35] hover:bg-[#FAF8F3] dark:text-[#A9C7B2] dark:hover:bg-[#1C2520]"><ChevronLeft className="h-4 w-4" /></button>
            <div className="flex items-center gap-2">
              <select aria-label="Month" value={month} onChange={(event) => setVisibleMonth(new Date(year, Number(event.target.value), 1))} className={fieldClass}>
                {Array.from({ length: 12 }, (_, index) => <option key={index} value={index}>{new Date(2000, index, 1).toLocaleString("en", { month: "long" })}</option>)}
              </select>
              <select aria-label="Year" value={year} onChange={(event) => setVisibleMonth(new Date(Number(event.target.value), month, 1))} className={fieldClass}>
                {Array.from({ length: 101 }, (_, index) => new Date().getFullYear() - 1 + index).map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <button type="button" aria-label="Next month" onClick={() => setVisibleMonth(new Date(year, month + 1, 1))} className="rounded-lg p-2 text-[#173F35] hover:bg-[#FAF8F3] dark:text-[#A9C7B2] dark:hover:bg-[#1C2520]"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wide text-[#77746D] dark:text-[#B5B5AA]">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day} className="py-2">{day}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`${visibleMonth.toLocaleString("en", { month: "long" })} ${year}`}>
            {days.map((day) => {
              const iso = localIsoDate(day);
              const isDisabled = iso < today;
              const isSelected = iso === selectedDate;
              const inMonth = day.getMonth() === month;
              return <button key={iso} type="button" role="gridcell" disabled={isDisabled} aria-label={day.toLocaleDateString("en-IN", { dateStyle: "full" })} aria-selected={isSelected} onClick={() => chooseDate(day)} className={`aspect-square rounded-lg text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C6A66B] ${isSelected ? "bg-[#173F35] font-bold text-white dark:bg-[#A9C7B2] dark:text-[#151B18]" : inMonth ? "text-[#252522] hover:bg-[#E7EFEA] dark:text-[#F4F0E7] dark:hover:bg-[#344139]" : "text-[#B8B3A9] dark:text-[#6E776F]"} ${isDisabled ? "cursor-not-allowed opacity-35" : ""}`}>
                {day.getDate()}
              </button>;
            })}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[#E8E2D7] pt-3 dark:border-[#344139]">
            <button type="button" onClick={() => chooseDate(new Date())} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#173F35] hover:bg-[#E7EFEA] dark:text-[#A9C7B2] dark:hover:bg-[#344139]">Today</button>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => { skipNextSyncValue.current = ""; onChange(""); setText(""); setShowInputError(false); }} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#77746D] hover:bg-[#FAF8F3] dark:text-[#B5B5AA] dark:hover:bg-[#1C2520]">Clear</button>
              <button type="button" aria-label="Close calendar" onClick={() => setOpen(false)} className="rounded-lg p-2 text-[#77746D] hover:bg-[#FAF8F3] dark:text-[#B5B5AA] dark:hover:bg-[#1C2520]"><X className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
