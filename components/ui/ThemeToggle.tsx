"use client";

import { useEffect, useState, useRef } from "react";
import { Sun, Moon, Laptop, ChevronDown } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme-context";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <div className={`w-8 h-8 rounded-full bg-black/5 dark:bg-[#FFFCF6]/5 animate-pulse ${className}`} />
    );
  }

  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Laptop },
  ];

  const currentIcon =
    theme === "system"
      ? Laptop
      : resolvedTheme === "dark"
      ? Moon
      : Sun;

  const IconComponent = currentIcon;

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-[#EAD2B0] dark:border-[#4D3331] bg-[#FFFCF6]/90 dark:bg-[#2E1F1E]/90 hover:bg-[#FAF3E8] dark:hover:bg-[#3D2624] text-[#30221D] dark:text-[#FFF3E3] transition-all text-xs font-medium cursor-pointer shadow-xs"
        aria-label="Toggle theme"
        title={`Current theme: ${theme} (${resolvedTheme})`}
      >
        <IconComponent className="w-3.5 h-3.5 text-[#B77A36] dark:text-[#EAD2B0]" />
        <ChevronDown
          className={`w-3 h-3 text-[#7D6B63] dark:text-[#D4C3B7] transition-transform duration-200 ${
            dropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-1.5 w-32 rounded-2xl bg-[#FFF3E3] dark:bg-[#2E1F1E] border border-[#EAD2B0] dark:border-[#4D3331] shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
          {options.map((opt) => {
            const OptIcon = opt.icon;
            const isSelected = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setTheme(opt.value);
                  setDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[#EAD2B0]/50 dark:bg-[#3D2624] text-[#681B1D] dark:text-[#EAD2B0] font-semibold"
                    : "text-[#30221D] dark:text-[#FFF3E3] hover:bg-[#EAD2B0]/25 dark:hover:bg-[#1A1211]"
                }`}
              >
                <OptIcon className="w-3.5 h-3.5 text-[#B77A36] dark:text-[#EAD2B0]" />
                <span>{opt.label}</span>
                {isSelected && (
                  <span className="ml-auto text-[10px] text-[#681B1D] dark:text-[#EAD2B0] font-bold">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
