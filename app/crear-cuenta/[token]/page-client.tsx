"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "../../components/site-header";
import { api, Role } from "../../lib/api";

const roleLabels: Record<Role, string> = {
  admin: "administrador",
  seller: "vendedor",
  client: "cliente",
};

const expiredMessage = "El enlace ya caducó, contactese para generar uno nuevo.";

export default function AccountCompletion({ token }: { token: string }) {
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => {
    let active = true;
    api.getAccountInvitation(token)
      .then((invitation) => {
        if (!active) return;
        setRole(invitation.role);
        setEmail(invitation.email);
        setExpiresAt(invitation.expiresAt);
      })
      .catch(() => {
        if (active) setError(expiredMessage);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setBusy(true);
    setError("");
    try {
      const result = await api.completeAccountInvitation(token, {
        email: String(data.get("email") ?? "").trim(),
        password: String(data.get("password") ?? ""),
        name: String(data.get("name") ?? "").trim(),
        dni: String(data.get("dni") ?? "").trim(),
        phone: String(data.get("phone") ?? "").trim() || undefined,
        street: String(data.get("street") ?? "").trim() || undefined,
        map_link: String(data.get("map_link") ?? "").trim() || undefined,
      });
      setEmailConfirmationRequired(result.requiresEmailConfirmation);
      setComplete(true);
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "No se pudo completar el registro.";
      setError(message.includes("caducó") ? expiredMessage : message);
    } finally {
      setBusy(false);
    }
  }

  const clientRequired = role === "client";

  return (
    <main className="public-page">
      <SiteHeader />
      <section className="public-content mx-auto max-w-3xl">
        {loading ? (
          <div className="surface-card p-8 text-center text-sm text-[var(--mute)]">Verificando enlace...</div>
        ) : complete ? (
          <div className="surface-card p-8 text-center">
            <h1 className="text-2xl font-bold text-[var(--ink)]">
              {emailConfirmationRequired ? "Revisá tu correo" : "¡Tu cuenta está lista!"}
            </h1>
            <p className="mt-3 text-sm text-[var(--mute)]">
              {emailConfirmationRequired
                ? `Enviamos un enlace de verificación a ${email}. Confirmá tu correo para activar la cuenta y luego ingresá.`
                : "Ya podés ingresar a CuotasOnline con tu correo y contraseña."}
            </p>
            <Link href="/" className="button button-primary mt-6">Ir a iniciar sesión</Link>
          </div>
        ) : error === expiredMessage ? (
          <div className="feedback feedback-error justify-center p-6 text-center" role="alert">{expiredMessage}</div>
        ) : (
          <div className="surface-card p-6 sm:p-9">
            <p className="text-sm font-semibold text-[var(--accent)]">Registro de {role ? roleLabels[role] : "usuario"}</p>
            <h1 className="mt-2 text-2xl font-bold text-[var(--ink)]">Completá tus datos</h1>
            <p className="mt-2 text-sm text-[var(--mute)]">Este enlace es personal y tiene una vigencia de 20 minutos.</p>
            {expiresAt && <p className="mt-1 text-xs text-[var(--mute)]">Vence: {new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(expiresAt))}</p>}

            <form onSubmit={submit} className="mt-7 grid gap-4 sm:grid-cols-2">
              <label className="form-label">Nombre y apellido<input name="name" autoComplete="name" required /></label>
              <label className="form-label">DNI<input name="dni" inputMode="numeric" required /></label>
              <label className="form-label sm:col-span-2">Correo electrónico<input name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
              <label className="form-label sm:col-span-2">Contraseña<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
              <label className="form-label">Teléfono<input name="phone" type="tel" autoComplete="tel" required={clientRequired} /></label>
              <label className="form-label">Domicilio<input name="street" autoComplete="street-address" required={clientRequired} /></label>
              <label className="form-label sm:col-span-2">Link al Mapa<input name="map_link" type="url" placeholder="https://maps.google.com/..." /></label>
              {error && <p className="feedback feedback-error sm:col-span-2" role="alert">{error}</p>}
              <div className="sm:col-span-2"><button className="button button-primary" type="submit" disabled={busy}>
                {busy ? "Guardando..." : "Crear mi cuenta"}
              </button></div>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
