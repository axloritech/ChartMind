export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-6">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center text-xs leading-relaxed text-slate-500">
          ChartMind is an educational tool. It analyzes static chart screenshots and explains what
          is visible — it never predicts future prices and does not provide financial advice.
          Trading involves substantial risk.
        </p>
        <p className="mt-2 text-center text-[10px] text-slate-400">Build v2 · 2026-09-14 · light theme</p>
      </div>
    </footer>
  );
}
