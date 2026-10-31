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
      <div className={`w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 animate-pulse ${className}`} />
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
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#E8E2D7] dark:border-[#344139] bg-white/80 dark:bg-[#232F28]/80 hover:bg-[#F0EDE5] dark:hover:bg-[#1C2520] text-[#252522] dark:text-[#F4F0E7] transition-all text-xs font-medium cursor-pointer shadow-xs"
        aria-label="Toggle theme"
        title={`Current theme: ${theme} (${resolvedTheme})`}
      >
        <IconComponent className="w-3.5 h-3.5 text-[#173F35] dark:text-[#A9C7B2]" />
        <ChevronDown className={`w-3 h-3 text-[#77746D] dark:text-[#B5B5AA] transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-1.5 w-32 rounded-xl bg-white dark:bg-[#232F28] border border-[#E8E2D7] dark:border-[#344139] shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
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
                    ? "bg-[#E7EFEA] dark:bg-[#1C2520] text-[#173F35] dark:text-[#A9C7B2] font-semibold"
                    : "text-[#252522] dark:text-[#F4F0E7] hover:bg-[#F0EDE5] dark:hover:bg-[#1C2520]/70"
                }`}
              >
                <OptIcon className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
                {isSelected && <span className="ml-auto text-[10px] text-[#173F35] dark:text-[#A9C7B2]">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

