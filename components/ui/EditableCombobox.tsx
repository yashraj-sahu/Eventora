"use client";

import { useState, useRef, useEffect, useId, useMemo } from "react";
import { ChevronDown, Check, X, Sparkles } from "lucide-react";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

interface EditableComboboxProps {
  id?: string;
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  formatAsCurrency?: boolean;
  className?: string;
}

export function EditableCombobox({
  id,
  label,
  icon,
  value,
  onChange,
  options,
  placeholder = "Type or select...",
  formatAsCurrency = false,
  className = "",
}: EditableComboboxProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal query with external value when value changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        // On blur/close, if query differs from value, commit query as custom value
        if (query.trim() && query !== value) {
          onChange(query.trim());
        }
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [query, value, onChange]);

  // Filter options based on typed query
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const lower = query.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lower) ||
        opt.value.toLowerCase().includes(lower) ||
        (opt.description && opt.description.toLowerCase().includes(lower))
    );
  }, [options, query]);

  const selectedOption = options.find((option) => option.value === value);
  const displayValue = open
    ? query
    : selectedOption?.label ?? (formatAsCurrency && /^\d+$/.test(value)
      ? `₹${Number(value).toLocaleString("en-IN")}`
      : value);

  useEffect(() => setActiveIndex(0), [query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setQuery(nextVal);
    onChange(nextVal);
    if (!open) setOpen(true);
  };

  const handleSelectOption = (option: ComboboxOption) => {
    setQuery(option.label);
    onChange(option.value);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery("");
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${open ? "z-[80]" : "z-20"} ${className}`}
    >
      {/* ── CARD INPUT WRAPPER ── */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={`w-full min-h-[62px] px-3.5 py-2 rounded-2xl bg-[#FFFCF6]/95 dark:bg-[#1A1211]/95 border transition-all duration-200 cursor-text flex flex-col justify-center shadow-xs ${
          open
            ? "border-[#B77A36] ring-2 ring-[#B77A36]/20 shadow-md bg-[#FFFCF6] dark:bg-[#1A1211]"
            : "border-[#EAD2B0] dark:border-[#4D3331] hover:border-[#B77A36]/80"
        }`}
      >
        {/* Field Label & Icon */}
        <div className="flex items-center gap-1.5 mb-0.5">
          {icon && <span className="text-[#681B1D] dark:text-[#EAD2B0] shrink-0">{icon}</span>}
          <label
            htmlFor={inputId}
            className="block text-[10px] uppercase font-bold tracking-wider text-[#B77A36] dark:text-[#EAD2B0] cursor-text truncate select-none"
          >
            {label}
          </label>
        </div>

        {/* Input & Action Icons */}
        <div className="flex items-center gap-1.5 w-full">
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            onChange={handleInputChange}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={`${inputId}-options`}
            onFocus={() => {
              setQuery(value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && filteredOptions.length) {
                e.preventDefault();
                setActiveIndex((index) => (index + 1) % filteredOptions.length);
              } else if (e.key === "ArrowUp" && filteredOptions.length) {
                e.preventDefault();
                setActiveIndex((index) => (index - 1 + filteredOptions.length) % filteredOptions.length);
              } else if (e.key === "Enter") {
                e.preventDefault();
                const activeOption = filteredOptions[activeIndex];
                if (open && activeOption) handleSelectOption(activeOption);
                else {
                  onChange(query.trim());
                  setOpen(false);
                }
                inputRef.current?.blur();
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            value={displayValue}
            placeholder={placeholder}
            autoComplete="off"
            className="w-full bg-transparent text-[#30221D] dark:text-[#FFF3E3] font-semibold text-xs sm:text-[13px] outline-none placeholder:text-[#9E897F] placeholder:font-normal truncate"
          />

          {query && (
            <button
              type="button"
              onClick={handleClear}
              aria-label={`Clear ${label}`}
              className="p-1 rounded-md text-[#9E897F] hover:text-[#681B1D] dark:hover:text-[#FFF3E3] hover:bg-[#EAD2B0]/30 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }}
            tabIndex={-1}
            aria-label={`Toggle ${label} options`}
            className="p-1 rounded-md text-[#9E897F] hover:text-[#681B1D] dark:hover:text-[#FFF3E3] hover:bg-[#EAD2B0]/30 transition-colors cursor-pointer shrink-0"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                open ? "rotate-180 text-[#681B1D] dark:text-[#EAD2B0]" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* ── HIGH Z-INDEX FLOATING OPTIONS DROPDOWN ── */}
      {open && (
        <div id={`${inputId}-options`} role="listbox" className="absolute top-[calc(100%+6px)] left-0 right-0 z-[90] w-full max-h-60 overflow-y-auto overscroll-contain rounded-2xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-[0_16px_36px_rgba(75,17,23,0.22),0_4px_12px_rgba(183,122,54,0.12)] p-1.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Custom entry chip if typed value doesn't match any option */}
          {query.trim() &&
            !options.some((opt) => opt.label.toLowerCase() === query.trim().toLowerCase()) && (
              <div
                onClick={() => {
                  onChange(query.trim());
                  setOpen(false);
                }}
                className="p-2.5 mb-1 rounded-xl bg-gradient-to-r from-[#681B1D]/10 to-[#B77A36]/15 hover:from-[#681B1D]/20 hover:to-[#B77A36]/25 border border-[#B77A36]/30 text-xs font-semibold text-[#681B1D] dark:text-[#EAD2B0] cursor-pointer flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Sparkles className="w-3.5 h-3.5 text-[#B77A36] shrink-0" />
                  <span className="truncate">
                    Use custom: <span className="font-bold underline">“{query.trim()}”</span>
                  </span>
                </div>
                <Check className="w-3.5 h-3.5 text-[#B77A36] shrink-0" />
              </div>
            )}

          {/* Options list */}
          {filteredOptions.length > 0 ? (
            <div className="space-y-0.5">
              {filteredOptions.map((opt) => {
                const isSelected =
                  value.toLowerCase() === opt.value.toLowerCase() ||
                  query.toLowerCase() === opt.label.toLowerCase();
                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    key={opt.value}
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      activeIndex === filteredOptions.indexOf(opt)
                        ? "bg-[#EAD2B0]/40 dark:bg-[#3D2624]"
                        : isSelected
                        ? "bg-[#681B1D] text-[#FFF3E3] font-semibold"
                        : "text-[#30221D] dark:text-[#FFF3E3] hover:bg-[#EAD2B0]/40 dark:hover:bg-[#3D2624]"
                    }`}
                  >
                    <div className="truncate">
                      <p className="truncate leading-snug">{opt.label}</p>
                      {opt.description && (
                        <p
                          className={`text-[10px] truncate ${
                            isSelected
                              ? "text-[#EAD2B0]"
                              : "text-[#7D6B63] dark:text-[#D4C3B7]"
                          }`}
                        >
                          {opt.description}
                        </p>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-3 text-center text-xs text-[#7D6B63] dark:text-[#D4C3B7]">
              Press Enter or click above to use “{query.trim()}”
            </div>
          )}
        </div>
      )}
    </div>
  );
}

