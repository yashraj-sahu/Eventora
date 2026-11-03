"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  id?: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
  customLabel?: string;
  clearable?: boolean;
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
}

/** Accessible searchable single-select with optional manual entry, styled in traditional Indian royal luxury palette. */
export function SearchableSelect({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = "Select or search…",
  allowCustom = false,
  customLabel = "Use custom entry",
  clearable = true,
  loading = false,
  error,
  emptyMessage = "No options found",
  disabled = false,
  className = "",
  labelClassName = "",
}: SearchableSelectProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const [open, setOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(
    () =>
      options.filter((option) =>
        `${option.label} ${option.description ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [options, query]
  );
  const canUseCustom =
    allowCustom &&
    query.trim().length > 0 &&
    !options.some(
      (option) => option.value.toLowerCase() === query.trim().toLowerCase()
    );

  useEffect(() => {
    if (!open) return;
    const position = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (rect) setOpenAbove(window.innerHeight - rect.bottom < 300 && rect.top > 300);
    };
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    position();
    window.addEventListener("resize", position);
    document.addEventListener("scroll", position, true);
    document.addEventListener("mousedown", close);
    input.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("resize", position);
      document.removeEventListener("scroll", position, true);
      document.removeEventListener("mousedown", close);
    };
  }, [open]);

  const choose = (next: string) => {
    onChange(next);
    setQuery("");
    setOpen(false);
    trigger.current?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setQuery("");
      trigger.current?.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) =>
        Math.min(current + 1, filtered.length + (canUseCustom ? 0 : -1))
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(0, current - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (canUseCustom && active === filtered.length) choose(query.trim());
      else if (filtered[active]) choose(filtered[active].value);
    }
  };

  return (
    <div className={`relative ${className}`} ref={root}>
      <label
        htmlFor={`${controlId}-trigger`}
        className={`block text-[#7D6B63] dark:text-[#D4C3B7] mb-1 font-bold uppercase tracking-wider text-[10px] ${labelClassName}`}
      >
        {label}
      </label>
      <div className="flex items-center w-full min-h-10 rounded-xl bg-[#FFFCF6]/90 dark:bg-[#1A1211] border border-[#EAD2B0] dark:border-[#4D3331] px-3 py-1 focus-within:border-[#B77A36] focus-within:ring-2 focus-within:ring-[#B77A36]/15 transition-colors">
        <button
          ref={trigger}
          id={`${controlId}-trigger`}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={label}
          title={selected?.label ?? value}
          onClick={() => {
            setOpen((v) => !v);
            setQuery("");
          }}
          className="flex-1 min-w-0 py-1 text-left text-[#30221D] dark:text-[#FFF3E3] font-semibold text-xs sm:text-[13px] disabled:opacity-50 cursor-pointer truncate focus:outline-none"
        >
          <span className={selected || value ? "" : "text-[#7D6B63] dark:text-[#9E897F]"}>
            {selected?.label ?? (value || placeholder)}
          </span>
        </button>
        {clearable && value && (
          <button
            type="button"
            aria-label={`Clear ${label}`}
            onClick={() => choose("")}
            className="p-1 text-[#7D6B63] hover:text-[#681B1D] dark:hover:text-[#EAD2B0] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => setOpen((v) => !v)}
          className="pl-1 text-[#7D6B63] dark:text-[#D4C3B7] cursor-pointer"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
      {open && (
        <div className={`absolute z-[100] left-0 right-0 ${openAbove ? "bottom-full mb-2" : "top-full mt-2"} overflow-hidden rounded-2xl border border-[#EAD2B0] dark:border-[#4D3331] bg-[#FFF3E3] dark:bg-[#2E1F1E] shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col`}>
          <div className="flex items-center gap-2 px-3 border-b border-[#EAD2B0]/80 dark:border-[#4D3331]">
            <Search className="w-3.5 h-3.5 text-[#B77A36]" />
            <input
              ref={input}
              id={`${controlId}-search`}
              role="combobox"
              aria-expanded="true"
              aria-controls={`${controlId}-options`}
              aria-autocomplete="list"
              aria-label={`Search ${label}`}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search options…"
              className="w-full bg-transparent py-2.5 text-xs text-[#30221D] dark:text-[#FFF3E3] outline-none placeholder:text-[#9E897F]"
            />
          </div>
          <ul
            id={`${controlId}-options`}
            role="listbox"
            aria-label={label}
            className="min-h-0 max-h-[min(15rem,calc(100dvh-5rem))] overflow-y-auto overscroll-contain p-1.5"
          >
            {loading ? (
              <li className="px-3 py-3 text-xs text-[#7D6B63]" role="status">
                Loading options…
              </li>
            ) : (
              <>
                {filtered.map((option, index) => (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={option.value === value}
                    onMouseEnter={() => setActive(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(option.value)}
                    className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs cursor-pointer transition-colors ${
                      index === active
                        ? "bg-[#EAD2B0]/60 dark:bg-[#3D2624] text-[#681B1D] dark:text-[#FFF3E3] font-medium"
                        : "hover:bg-[#EAD2B0]/30 dark:hover:bg-[#3D2624] text-[#30221D] dark:text-[#FFF3E3]"
                    }`}
                  >
                    <span>
                      <span className="block font-medium">{option.label}</span>
                      {option.description && (
                        <span className="text-[10px] text-[#7D6B63] dark:text-[#D4C3B7]">
                          {option.description}
                        </span>
                      )}
                    </span>
                    {option.value === value && (
                      <Check className="w-3.5 h-3.5 text-[#681B1D] dark:text-[#EAD2B0]" />
                    )}
                  </li>
                ))}
                {canUseCustom && (
                  <li
                    role="option"
                    aria-selected={active === filtered.length}
                    onMouseEnter={() => setActive(filtered.length)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(query.trim())}
                    className="rounded-xl px-3 py-2 text-xs cursor-pointer text-[#681B1D] dark:text-[#EAD2B0] hover:bg-[#EAD2B0]/30 font-medium"
                  >
                    {customLabel}: “{query.trim()}”
                  </li>
                )}
                {!filtered.length && !canUseCustom && (
                  <li className="px-3 py-3 text-xs text-[#7D6B63] text-center">
                    {emptyMessage}
                  </li>
                )}
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

interface SearchableMultiSelectProps {
  id?: string;
  label: string;
  value: string[];
  options: SelectOption[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  allowCustom?: boolean;
  loading?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
}

/** Searchable accessible multi-select for fields that accept several controlled values. */
export function SearchableMultiSelect({
  id,
  label,
  value,
  options,
  onChange,
  placeholder = "Select options…",
  allowCustom = false,
  loading = false,
  error,
  disabled = false,
  className = "",
}: SearchableMultiSelectProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const [open, setOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const filtered = useMemo(
    () =>
      options.filter((option) =>
        `${option.label} ${option.description ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [options, query]
  );
  const canUseCustom =
    allowCustom &&
    query.trim() &&
    !value.includes(query.trim()) &&
    !options.some(
      (option) => option.value.toLowerCase() === query.trim().toLowerCase()
    );

  useEffect(() => {
    if (!open) return;
    const position = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (rect) setOpenAbove(window.innerHeight - rect.bottom < 300 && rect.top > 300);
    };
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    position();
    window.addEventListener("resize", position);
    document.addEventListener("scroll", position, true);
    document.addEventListener("mousedown", close);
    input.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("resize", position);
      document.removeEventListener("scroll", position, true);
      document.removeEventListener("mousedown", close);
    };
  }, [open]);

  const toggle = (option: string) =>
    onChange(
      value.includes(option)
        ? value.filter((item) => item !== option)
        : [...value, option]
    );

  const clear = () => onChange([]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      trigger.current?.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) =>
        Math.min(current + 1, filtered.length + (canUseCustom ? 0 : -1))
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(0, current - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (canUseCustom && active === filtered.length) toggle(query.trim());
      else if (filtered[active]) toggle(filtered[active].value);
    }
  };

  return (
    <div className={`relative ${className}`} ref={root}>
      <label
        htmlFor={`${controlId}-trigger`}
        className="block text-[#7D6B63] dark:text-[#D4C3B7] mb-1 font-bold uppercase tracking-wider text-[10px]"
      >
        {label}
      </label>
      <button
        ref={trigger}
        id={`${controlId}-trigger`}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
        className="w-full min-h-10 px-3 py-2 rounded-xl bg-[#FFFCF6]/80 dark:bg-[#1A1211]/80 border border-[#EAD2B0] dark:border-[#4D3331] text-left text-xs text-[#30221D] dark:text-[#FFF3E3] cursor-pointer"
      >
        {value.length ? value.join(", ") : placeholder}
      </button>
      {value.length > 0 && (
        <button
          type="button"
          onClick={clear}
          aria-label={`Clear ${label}`}
          className="absolute right-3 top-8 text-[#7D6B63] hover:text-[#681B1D] cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {error && <p role="alert" className="mt-1 text-xs text-rose-600">{error}</p>}
      {open && (
        <div className={`absolute z-[100] left-0 right-0 ${openAbove ? "bottom-full mb-2" : "top-full mt-2"} w-full overflow-hidden rounded-2xl border border-[#EAD2B0] dark:border-[#4D3331] bg-[#FFF3E3] dark:bg-[#2E1F1E] shadow-2xl flex flex-col`}>
          <div className="flex items-center gap-2 px-3 border-b border-[#EAD2B0] dark:border-[#4D3331]">
            <Search className="w-3.5 h-3.5 text-[#B77A36]" />
            <input
              ref={input}
              role="combobox"
              aria-expanded="true"
              aria-controls={`${controlId}-options`}
              aria-autocomplete="list"
              aria-label={`Search ${label}`}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search options…"
              className="w-full bg-transparent py-2.5 text-xs text-[#30221D] dark:text-[#FFF3E3] outline-none"
            />
          </div>
          <ul
            id={`${controlId}-options`}
            role="listbox"
            aria-label={label}
            aria-multiselectable="true"
            className="min-h-0 max-h-[min(15rem,calc(100dvh-5rem))] overflow-y-auto overscroll-contain p-1.5"
          >
            {loading ? (
              <li className="px-3 py-3 text-xs text-[#7D6B63]">Loading options…</li>
            ) : (
              <>
                {filtered.map((option, index) => (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={value.includes(option.value)}
                    onMouseEnter={() => setActive(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => toggle(option.value)}
                    className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs cursor-pointer ${
                      index === active
                        ? "bg-[#EAD2B0]/60 dark:bg-[#3D2624] text-[#681B1D] dark:text-[#FFF3E3]"
                        : "hover:bg-[#EAD2B0]/30 text-[#30221D] dark:text-[#FFF3E3]"
                    }`}
                  >
                    <span>{option.label}</span>
                    {value.includes(option.value) && (
                      <Check className="w-3.5 h-3.5 text-[#681B1D] dark:text-[#EAD2B0]" />
                    )}
                  </li>
                ))}
                {canUseCustom && (
                  <li
                    role="option"
                    aria-selected={active === filtered.length}
                    onMouseEnter={() => setActive(filtered.length)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => toggle(query.trim())}
                    className="rounded-xl px-3 py-2 text-xs cursor-pointer text-[#681B1D] dark:text-[#EAD2B0]"
                  >
                    Add “{query.trim()}”
                  </li>
                )}
                {!filtered.length && !canUseCustom && (
                  <li className="px-3 py-3 text-xs text-[#7D6B63] text-center">
                    No options found
                  </li>
                )}
              </>
            )}
          </ul>
          <div className="border-t border-[#EAD2B0] dark:border-[#4D3331] px-3 py-2 flex justify-between">
            <span className="text-[10px] text-[#7D6B63] dark:text-[#D4C3B7]">
              {value.length} selected
            </span>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
              className="text-[10px] font-semibold text-[#681B1D] dark:text-[#EAD2B0] cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
