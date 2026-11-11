"use client";

import { useEffect, useState } from "react";

const countryCodes = [
  ["India", "+91"], ["United States / Canada", "+1"], ["United Kingdom", "+44"],
  ["Australia", "+61"], ["New Zealand", "+64"], ["United Arab Emirates", "+971"],
  ["Saudi Arabia", "+966"], ["Singapore", "+65"], ["Malaysia", "+60"],
  ["Pakistan", "+92"], ["Bangladesh", "+880"], ["Nepal", "+977"],
  ["Sri Lanka", "+94"], ["South Africa", "+27"], ["Ireland", "+353"],
  ["Germany", "+49"], ["France", "+33"], ["Italy", "+39"],
  ["Spain", "+34"], ["Netherlands", "+31"], ["Switzerland", "+41"],
  ["Japan", "+81"], ["China", "+86"], ["Hong Kong", "+852"],
  ["Indonesia", "+62"], ["Philippines", "+63"], ["Thailand", "+66"],
  ["Brazil", "+55"], ["Mexico", "+52"], ["Other — enter full international number", "other"],
] as const;

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  className?: string;
};

const baseInput = "min-w-0 w-full rounded-xl border border-[#EAD2B0] bg-[#FFF3E3] px-3 py-2.5 text-sm text-[#30221D] placeholder-[#7D6B63]/70 focus:border-[#681B1D] focus:outline-none dark:border-[#4D3331] dark:bg-[#241918] dark:text-[#FFF3E3]";

export function PhoneNumberField({ id, value, onChange, required = true, autoComplete = "tel", className = "" }: Props) {
  const [callingCode, setCallingCode] = useState<string>("+91");
  const [localNumber, setLocalNumber] = useState("");

  useEffect(() => {
    const compact = value.replace(/[\s()-]/g, "");
    if (!compact) { setLocalNumber(""); return; }
    const match = countryCodes
      .filter((entry) => entry[1] !== "other" && compact.startsWith(entry[1]))
      .sort((a, b) => b[1].length - a[1].length)[0];
    if (match) {
      setCallingCode(match[1]);
      setLocalNumber(compact.slice(match[1].length));
    } else {
      setCallingCode("other");
      setLocalNumber(value);
    }
  }, [value]);

  const changeCode = (nextCode: string) => {
    setCallingCode(nextCode);
    onChange(nextCode === "other" ? "" : `${nextCode} ${localNumber}`.trim());
  };
  const changeNumber = (nextNumber: string) => {
    setLocalNumber(nextNumber);
    onChange(callingCode === "other" ? nextNumber : `${callingCode} ${nextNumber}`.trim());
  };

  return <div className={`grid grid-cols-[minmax(150px,0.8fr)_minmax(0,1.4fr)] gap-2 ${className}`}>
    <label className="sr-only" htmlFor={`${id}-country`}>Country calling code</label>
    <select id={`${id}-country`} value={callingCode} onChange={(event) => changeCode(event.target.value)} className={baseInput} aria-label="Country calling code">
      {countryCodes.map(([country, code]) => <option key={code} value={code}>{code === "other" ? country : `${country} (${code})`}</option>)}
    </select>
    <label className="sr-only" htmlFor={id}>Phone number</label>
    <input id={id} type="tel" inputMode="tel" required={required} maxLength={40} autoComplete={autoComplete} value={localNumber} onChange={(event) => changeNumber(event.target.value)} placeholder={callingCode === "other" ? "+<country code> number" : "98765 43210"} className={baseInput}/>
  </div>;
}
