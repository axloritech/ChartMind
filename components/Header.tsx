"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="28" height="28" rx="8" fill="#ffffff" stroke="#dc2626" strokeWidth="1.5" />
        {/* candlesticks */}
        <line x1="10" y1="8" x2="10" y2="24" stroke="#1e293b" strokeWidth="1.5" />
        <rect x="7.5" y="12" width="5" height="8" rx="1" fill="#1e293b" />
        <line x1="16" y1="10" x2="16" y2="26" stroke="#dc2626" strokeWidth="1.5" />
        <rect x="13.5" y="13" width="5" height="9" rx="1" fill="#dc2626" />
        <line x1="22" y1="6" x2="22" y2="20" stroke="#1e293b" strokeWidth="1.5" />
        <rect x="19.5" y="9" width="5" height="7" rx="1" fill="#1e293b" />
      </svg>
      <span className="text-lg font-bold tracking-tight text-slate-900">
        Chart<span className="text-red-600">Mind</span>
      </span>
    </span>
  );
}

export default function Header() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home" },
    { href: "/analyze", label: "Analyze" },
    { href: "/knowledge", label: "Knowledge" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="ChartMind home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-red-50 text-red-600"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
