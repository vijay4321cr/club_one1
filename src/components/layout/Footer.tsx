export default function Footer() {
  return (
    <footer className="border-t border-line bg-coal">
      {/* giant wordmark */}
      <div className="overflow-hidden">
        <p className="h-display -mb-[0.16em] whitespace-nowrap text-center text-[26vw] leading-none text-cream/[0.06]">
          2BHK
        </p>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto max-w-7xl px-5 py-6 text-center text-xs text-muted md:px-8">
          © {new Date().getFullYear()} — 2BHK
        </div>
      </div>
    </footer>
  );
}
