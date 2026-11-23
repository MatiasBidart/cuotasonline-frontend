import Image from "next/image";
import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="public-header">
      <Link href="/" className="public-brand" aria-label="CuotasOnline, inicio">
        <Image src="/favicon.ico" alt="" width={38} height={38} />
        <span>cuotas<span>online</span></span>
      </Link>
      <span className="text-xs text-[var(--mute)]">Gestión simple, todos los días.</span>
    </header>
  );
}
