"use client";

import { useState } from "react";

export default function ShareButton({ className = "", url }: { className?: string; url?: string }) {
  const [message, setMessage] = useState("");

  async function share() {
    const shareUrl = url ? new URL(url, window.location.origin).toString() : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setMessage("Enlace copiado");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setMessage("No se pudo compartir el enlace");
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className={`share-button ${className}`} onClick={share} aria-label="Compartir enlace">
        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <path d="m8.6 10.7 6.8-4.4m-6.8 7 6.8 4.1" />
        </svg>
        Compartir
      </button>
      {message && <span aria-live="polite" className="text-xs text-[var(--mute)]">{message}</span>}
    </span>
  );
}
