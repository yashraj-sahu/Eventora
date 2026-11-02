"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export interface SelectOption { value: string; label: string; description?: string }
interface SearchableSelectProps {
  id?: string; label: string; value: string; options: SelectOption[]; onChange: (value: string) => void;
  placeholder?: string; allowCustom?: boolean; customLabel?: string; clearable?: boolean;
  loading?: boolean; error?: string; emptyMessage?: string; disabled?: boolean; className?: string; labelClassName?: string;
}

/** Accessible searchable single-select with optional manual entry, suitable for desktop and touch. */
export function SearchableSelect({ id, label, value, options, onChange, placeholder = "Select or search…", allowCustom = false, customLabel = "Use custom entry", clearable = true, loading = false, error, emptyMessage = "No options found", disabled = false, className = "", labelClassName = "" }: SearchableSelectProps) {
  const generatedId = useId(); const controlId = id ?? generatedId;
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(""); const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null); const input = useRef<HTMLInputElement>(null); const trigger = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => options.filter((option) => `${option.label} ${option.description ?? ""}`.toLowerCase().includes(query.toLowerCase())), [options, query]);
  const canUseCustom = allowCustom && query.trim().length > 0 && !options.some((option) => option.value.toLowerCase() === query.trim().toLowerCase());

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close); input.current?.focus();
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const choose = (next: string) => { onChange(next); setQuery(""); setOpen(false); trigger.current?.focus(); };
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") { setOpen(false); setQuery(""); trigger.current?.focus(); }
    else if (event.key === "ArrowDown") { event.preventDefault(); setActive((current) => Math.min(current + 1, filtered.length + (canUseCustom ? 0 : -1))); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((current) => Math.max(0, current - 1)); }
    else if (event.key === "Enter") { event.preventDefault(); if (canUseCustom && active === filtered.length) choose(query.trim()); else if (filtered[active]) choose(filtered[active].value); }
  };

  return <div className={`relative ${className}`} ref={root}>
    <label htmlFor={`${controlId}-trigger`} className={`block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-bold uppercase tracking-wider ${labelClassName}`}>{label}</label>
    <div className="flex items-center w-full min-h-11 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] focus-within:border-[#173F35] dark:focus-within:border-[#A9C7B2]">
      <button ref={trigger} id={`${controlId}-trigger`} type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => { setOpen((v) => !v); setQuery(""); }} className="flex-1 min-w-0 px-4 py-3 text-left text-[#252522] dark:text-[#F4F0E7] font-medium text-xs disabled:opacity-50">
        <span className={selected || value ? "" : "text-[#77746D] dark:text-[#898D84]"}>{selected?.label ?? (value || placeholder)}</span>
      </button>
      {clearable && value && <button type="button" aria-label={`Clear ${label}`} onClick={() => choose("")} className="p-2 text-[#77746D] hover:text-[#173F35] dark:hover:text-[#A9C7B2]"><X className="w-4 h-4" /></button>}
      <button type="button" disabled={disabled} tabIndex={-1} aria-hidden="true" onClick={() => setOpen((v) => !v)} className="px-3 text-[#77746D]"><ChevronDown className="w-4 h-4" /></button>
    </div>
    {error && <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    {open && <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-[#E8E2D7] dark:border-[#344139] bg-white dark:bg-[#232F28] shadow-xl">
      <div className="flex items-center gap-2 px-3 border-b border-[#E8E2D7] dark:border-[#344139]"><Search className="w-4 h-4 text-[#77746D]"/><input ref={input} id={`${controlId}-search`} role="combobox" aria-expanded="true" aria-controls={`${controlId}-options`} aria-autocomplete="list" aria-label={`Search ${label}`} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} onKeyDown={onKeyDown} placeholder="Search options…" className="w-full bg-transparent py-3 text-xs text-[#252522] dark:text-[#F4F0E7] outline-none" /></div>
      <ul id={`${controlId}-options`} role="listbox" aria-label={label} className="max-h-64 overflow-y-auto p-1">
        {loading ? <li className="px-3 py-3 text-xs text-[#77746D]" role="status">Loading options…</li> : <>
          {filtered.map((option, index) => <li key={option.value} role="option" aria-selected={option.value === value} onMouseEnter={() => setActive(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option.value)} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-xs cursor-pointer ${index === active ? "bg-[#E7EFEA] dark:bg-[#173F35]/60" : "hover:bg-[#FAF8F3] dark:hover:bg-[#1C2520]"}`}><span><span className="block text-[#252522] dark:text-[#F4F0E7]">{option.label}</span>{option.description && <span className="text-[10px] text-[#77746D] dark:text-[#B5B5AA]">{option.description}</span>}</span>{option.value === value && <Check className="w-4 h-4 text-[#173F35] dark:text-[#A9C7B2]"/>}</li>)}
          {canUseCustom && <li role="option" aria-selected={active === filtered.length} onMouseEnter={() => setActive(filtered.length)} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(query.trim())} className="rounded-lg px-3 py-2.5 text-xs cursor-pointer text-[#173F35] dark:text-[#A9C7B2] hover:bg-[#FAF8F3] dark:hover:bg-[#1C2520]">{customLabel}: “{query.trim()}”</li>}
          {!filtered.length && !canUseCustom && <li className="px-3 py-3 text-xs text-[#77746D]">{emptyMessage}</li>}
        </>}
      </ul>
    </div>}
  </div>;
}

interface SearchableMultiSelectProps {
  id?: string; label: string; value: string[]; options: SelectOption[]; onChange: (value: string[]) => void;
  placeholder?: string; allowCustom?: boolean; loading?: boolean; error?: string; disabled?: boolean; className?: string;
}

/** Searchable accessible multi-select for fields that accept several controlled values. */
export function SearchableMultiSelect({ id, label, value, options, onChange, placeholder = "Select options…", allowCustom = false, loading = false, error, disabled = false, className = "" }: SearchableMultiSelectProps) {
  const generatedId = useId(); const controlId = id ?? generatedId;
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(""); const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null); const input = useRef<HTMLInputElement>(null); const trigger = useRef<HTMLButtonElement>(null);
  const filtered = useMemo(() => options.filter((option) => `${option.label} ${option.description ?? ""}`.toLowerCase().includes(query.toLowerCase())), [options, query]);
  const canUseCustom = allowCustom && query.trim() && !options.some((option) => option.value.toLowerCase() === query.trim().toLowerCase());
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close); input.current?.focus();
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const toggle = (option: string) => onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  const clear = () => onChange([]);
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    else if (event.key === "ArrowDown") { event.preventDefault(); setActive((current) => Math.min(current + 1, filtered.length + (canUseCustom ? 0 : -1))); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((current) => Math.max(0, current - 1)); }
    else if (event.key === "Enter") { event.preventDefault(); if (canUseCustom && active === filtered.length) toggle(query.trim()); else if (filtered[active]) toggle(filtered[active].value); }
  };
  return <div className={`relative ${className}`} ref={root}>
    <label htmlFor={`${controlId}-trigger`} className="block text-[#77746D] dark:text-[#B5B5AA] mb-1.5 font-bold uppercase tracking-wider">{label}</label>
    <button ref={trigger} id={`${controlId}-trigger`} type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen((current) => !current)} className="w-full min-h-11 px-3 py-2 rounded-xl bg-[#FAF8F3] dark:bg-[#1C2520] border border-[#E8E2D7] dark:border-[#344139] text-left text-xs text-[#252522] dark:text-[#F4F0E7]">{value.length ? value.join(", ") : placeholder}</button>
    {value.length > 0 && <button type="button" onClick={clear} aria-label={`Clear ${label}`} className="absolute right-3 top-9 text-[#77746D]"><X className="w-4 h-4"/></button>}
    {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    {open && <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-[#E8E2D7] dark:border-[#344139] bg-white dark:bg-[#232F28] shadow-xl"><div className="flex items-center gap-2 px-3 border-b border-[#E8E2D7] dark:border-[#344139]"><Search className="w-4 h-4 text-[#77746D]"/><input ref={input} role="combobox" aria-expanded="true" aria-controls={`${controlId}-options`} aria-autocomplete="list" aria-label={`Search ${label}`} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} onKeyDown={onKeyDown} placeholder="Search options…" className="w-full bg-transparent py-3 text-xs text-[#252522] dark:text-[#F4F0E7] outline-none"/></div>
      <ul id={`${controlId}-options`} role="listbox" aria-label={label} aria-multiselectable="true" className="max-h-64 overflow-y-auto p-1">{loading ? <li className="px-3 py-3 text-xs text-[#77746D]">Loading options…</li> : <>{filtered.map((option, index) => <li key={option.value} role="option" aria-selected={value.includes(option.value)} onMouseEnter={() => setActive(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => toggle(option.value)} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-xs cursor-pointer ${index === active ? "bg-[#E7EFEA] dark:bg-[#173F35]/60" : "hover:bg-[#FAF8F3] dark:hover:bg-[#1C2520]"}`}><span>{option.label}</span>{value.includes(option.value) && <Check className="w-4 h-4 text-[#173F35] dark:text-[#A9C7B2]"/>}</li>)}{canUseCustom && <li role="option" aria-selected={active === filtered.length} onMouseEnter={() => setActive(filtered.length)} onMouseDown={(event) => event.preventDefault()} onClick={() => toggle(query.trim())} className="rounded-lg px-3 py-2.5 text-xs cursor-pointer text-[#173F35] dark:text-[#A9C7B2]">Add “{query.trim()}”</li>}{!filtered.length && !canUseCustom && <li className="px-3 py-3 text-xs text-[#77746D]">No options found</li>}</>}</ul>
      <div className="border-t border-[#E8E2D7] dark:border-[#344139] px-3 py-2 flex justify-between"><span className="text-[10px] text-[#77746D]">{value.length} selected</span><button type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }} className="text-[10px] font-semibold text-[#173F35] dark:text-[#A9C7B2]">Done</button></div>
    </div>}
  </div>;
}
