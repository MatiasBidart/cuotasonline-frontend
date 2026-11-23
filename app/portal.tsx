"use client";

import Image from "next/image";
import { FormEvent, useRef, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useVersiculo } from "./lib/biblia";
import ShareButton from "./components/share-button";
import {
  AccountInput,
  api,
  Client,
  Contact,
  Product,
  Role,
  Snapshot,
  Ticket,
  TicketProduct,
  User,
} from "./lib/api";


type Tab =
  | "overview"
  | "clients"
  | "sellers"
  | "products"
  | "sales"
  | "installments"
  | "accounts"
  | "new-sale"
  | "catalog"
  | "purchases";

interface Identity {
  role: Role;
  user: User;
  entityId: number | null;
}

interface SaleRow {
  ticket: Ticket;
  item: TicketProduct;
  product: Pick<Product, "id" | "name" | "img" | "description"> | undefined;
  client: Client | undefined;
  sellerId: number;
  sellerName: string;
  clientName: string;
  cobradorName: string;
}

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const dateFormat = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const roleLabels: Record<Role, string> = {
  admin: "Administración",
  seller: "Vendedor",
  client: "Cliente",
};

const navigation: Record<Role, { id: Tab; label: string; icon: string }[]> = {
  admin: [
    { id: "overview", label: "Resumen", icon: "grid" },
    { id: "clients", label: "Clientes", icon: "users" },
    { id: "sellers", label: "Vendedores", icon: "briefcase" },
    { id: "products", label: "Productos", icon: "box" },
    { id: "sales", label: "Productos vendidos", icon: "receipt" },
    { id: "installments", label: "Cuotas pendientes", icon: "calendar" },
    { id: "accounts", label: "Crear cuenta", icon: "user-plus" },
  ],
  seller: [
    { id: "overview", label: "Mi resumen", icon: "grid" },
    { id: "clients", label: "Mis clientes", icon: "users" },
    { id: "new-sale", label: "Cargar venta", icon: "plus" },
    { id: "sales", label: "Productos vendidos", icon: "receipt" },
    { id: "installments", label: "Cuotas pendientes", icon: "calendar" },
    { id: "catalog", label: "Catálogo", icon: "box" },
  ],
  client: [
    { id: "overview", label: "Mi resumen", icon: "grid" },
    { id: "purchases", label: "Mis compras", icon: "receipt" },
    { id: "installments", label: "Mis cuotas", icon: "calendar" },
    { id: "catalog", label: "Catálogo", icon: "box" },
  ],
};

const iconPaths: Record<string, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
  box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5M3 8v9l9 5 9-5V8M12 13v9" /></>,
  receipt: <><path d="M4 3h16v18l-3-2-3 2-3-2-3 2-4-2V3Z" /><path d="M8 8h8M8 12h8M8 16h4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" /></>,
  "user-plus": <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M19 8v6M16 11h6" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  moon: <><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
  arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m21 15-5-5L5 20" /></>,
  phone: <><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 3.2a2 2 0 0 1-.6 1.7L7.7 9.9a16 16 0 0 0 6.4 6.4l1.3-1.3a2 2 0 0 1 1.7-.6l3.2.5a2 2 0 0 1 1.7 2Z" /></>,
  pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  warning: <><path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></>,
  message: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 4a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.4Z" /></>,
};

function Icon({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name] ?? iconPaths.grid}
    </svg>
  );
}

function getIdentity(data: Snapshot, userId: string): Identity | null {
  const user = data.users.find((entry) => entry.id === userId);
  if (!user) return null;
  if (user.admin_status) return { role: "admin", user, entityId: null };
  const seller = data.sellers.find((entry) => entry.user_id === userId);
  if (seller) return { role: "seller", user, entityId: seller.id };
  const client = data.clients.find((entry) => entry.user_id === userId);
  if (client) return { role: "client", user, entityId: client.id };
  return null;
}

function getSales(data: Snapshot): SaleRow[] {
  const productById = new Map(data.products.map((product) => [product.id, product]));
  const clientById = new Map(data.clients.map((client) => [client.id, client]));
  const userById = new Map(data.users.map((user) => [user.id, user]));
  const sellerById = new Map(data.sellers.map((seller) => [seller.id, seller]));
  const cobradorById = new Map(data.cobradores.map((item) => [item.id, item]));

  return data.tickets.flatMap((ticket) => {
    const client = clientById.get(ticket.client_id);
    const clientName = client ? userById.get(client.user_id)?.name ?? "Cliente" : "Cliente";
    const seller = sellerById.get(ticket.seller_id);
    const sellerName = seller ? userById.get(seller.user_id)?.name ?? "Vendedor" : "Vendedor";
    const cobrador = ticket.cobrador_id ? cobradorById.get(ticket.cobrador_id) : undefined;
    const cobradorName = cobrador ? userById.get(cobrador.user_id)?.name ?? "Asignado" : "Sin asignar";

    return (ticket.ticket_product ?? []).map((item) => ({
      ticket,
      item,
      product: productById.get(item.product_id) ?? item.product ?? undefined,
      client,
      sellerId: ticket.seller_id,
      sellerName,
      clientName,
      cobradorName,
    }));
  });
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function ProductImage({ product, large = false }: { product: Product; large?: boolean }) {
  const imageUrl = product.img?.trim();
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const failed = imageUrl === failedSource;

  return (
    <div className={`product-image relative flex ${large ? "aspect-[16/10]" : "aspect-[4/3]"} items-center justify-center overflow-hidden`}>
      {imageUrl && !failed ? (
        <Image
          src={imageUrl}
          alt={product.name}
          width={720}
          height={540}
          unoptimized
          className="h-full w-full object-contain p-4"
          onError={() => setFailedSource(imageUrl)}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-[var(--mute)]">
          <Icon name="image" size={large ? 36 : 30} />
          <span className="text-[11px] font-medium tracking-wide">IMAGEN DEL PRODUCTO</span>
        </div>
      )}
    </div>
  );
}

function Button({
  children,
  variant = "primary",
  type = "button",
  className = "",
  disabled = false,
  onClick,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "quiet" | "danger";
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`button button-${variant} ${className}`}
      type={type}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`surface-card ${className}`}>{children}</section>;
}

function SectionHeading({ title, subtitle, action, styles }: { title: string; subtitle?: string; action?: ReactNode; styles?: string }) {
  return (
    <div className={`mb-5 flex flex-wrap items-end justify-between gap-3 p-4 rounded-lg ${styles || ""}`}>
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-[var(--mute)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, change, icon, tone = "violet" }: {
  label: string;
  value: string | number;
  change?: string;
  icon: string;
  tone?: string;
}) {
  return (
    <Card className="stat-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--mute)]">{label}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-[1.8rem]">{value}</p>
          {change && <p className="mt-2 text-xs text-[var(--mute)]">{change}</p>}
        </div>
        <span className={`stat-icon stat-${tone}`}><Icon name={icon} size={19} /></span>
      </div>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="px-5 py-12 text-center text-sm text-[var(--mute)]">{text}</div>;
}

function Table({ headers, children, empty }: { headers: string[]; children: ReactNode; empty: boolean }) {
  return empty ? (
    <EmptyState text="Todavía no hay información para mostrar." />
  ) : (
    <div className="overflow-x-auto">
      <table className="data-table w-full min-w-[680px] text-left">
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function SearchInput({ value, onChange, placeholder = "Buscar..." }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-field">
      <Icon name="search" size={17} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function StatusPill({ children, warn = false }: { children: ReactNode; warn?: boolean }) {
  return <span className={`status-pill ${warn ? "status-warn" : "status-ok"}`}>{children}</span>;
}

function ProductCard({ product, onOpen, compact = false }: {
  product: Product;
  onOpen: (product: Product) => void;
  compact?: boolean;
}) {
  return (
    <button className={`product-card text-left ${compact ? "product-card-compact" : ""}`} onClick={() => onOpen(product)}>
      <ProductImage product={product} />
      <div className="p-4">
        <h3 className="truncate text-sm font-semibold text-[var(--ink)]">{product.name}</h3>
        <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-[var(--mute)]">
          {product.description || "Consultá con tu vendedor para conocer más."}
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
          Ver producto <Icon name="arrow" size={14} />
        </span>
      </div>
    </button>
  );
}

function ContactDetails({ contact }: { contact?: Contact }) {
  return (
    <div className="mt-3 grid gap-2 text-sm text-[var(--mute)]">
      <p className="flex items-center gap-2"><Icon name="phone" size={15} />{contact?.phone || "Teléfono no informado"}</p>
      <p className="flex items-start gap-2"><Icon name="pin" size={15} className="mt-0.5 shrink-0" />
        <span>{contact?.street || "Domicilio no informado"}</span>
      </p>
    </div>
  );
}

function safeMapLink(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
}

function whatsappUrl(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!digits.startsWith("54")) digits = `549${digits}`;
  return digits ? `https://wa.me/${digits}` : null;
}

export default function Portal() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [token, setToken] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  // --------------------17/11
  const [saleClientSearch, setSaleClientSearch] = useState("");
  const [saleClient, setSaleClient] = useState<Client | null>(null);

  const [productSearch, setProductSearch] = useState("");
  const [saleProducts, setSaleProducts] = useState<Product[]>([]);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [clientInviteMode, setClientInviteMode] = useState(false);
  const [accountRole, setAccountRole] = useState<Role>("client");
  const [showAccountInvite, setShowAccountInvite] = useState(false);
  // --------------------17/11
const [productImageFile, setProductImageFile] = useState<File | null>(null);
const [productImagePreview, setProductImagePreview] = useState("");
const productImageInputRef = useRef<HTMLInputElement>(null);
// ....................................
const versiculo = useVersiculo();
//  ....................................
  const loadSnapshot = useCallback(async (accessToken: string) => {
    const result = await api.snapshot(accessToken);
    setSnapshot(result);
    return result;
  }, []);

  const restoreSession = useCallback(async (accessToken: string) => {
    try {
      const result = await loadSnapshot(accessToken);
      const userId = sessionStorage.getItem("cuotas-user-id");
      if (!userId) throw new Error("La sesión venció. Ingresá nuevamente.");
      const resolved = getIdentity(result, userId);
      if (!resolved) throw new Error("La cuenta no tiene un rol asignado en el sistema.");
      setToken(accessToken);
      setIdentity(resolved);
      setTab("overview");
    } catch (restoreError) {
      sessionStorage.removeItem("cuotas-access-token");
      sessionStorage.removeItem("cuotas-user-id");
      setError(restoreError instanceof Error ? restoreError.message : "No se pudo recuperar la sesión.");
    } finally {
      setChecking(false);
    }
  }, [loadSnapshot]);

  useEffect(() => {
    const savedTheme = sessionStorage.getItem("cuotas-theme");
    const accessToken = sessionStorage.getItem("cuotas-access-token");
    window.setTimeout(() => {
      if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
      if (accessToken) void restoreSession(accessToken);
      else setChecking(false);
    }, 0);
  }, [restoreSession]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const sales = useMemo(() => snapshot ? getSales(snapshot) : [], [snapshot]);
  const contactByUserId = useMemo(
    () => new Map((snapshot?.contacts ?? []).map((contact) => [contact.user_id, contact])),
    [snapshot],
  );
  const clientUser = useCallback((client: Client) => snapshot?.users.find((user) => user.id === client.user_id), [snapshot]);
  const ownSales = useMemo(() => {
    if (!identity) return [];
    if (identity.role === "admin") return sales;
    if (identity.role === "seller") return sales.filter((sale) => sale.sellerId === identity.entityId);
    return sales.filter((sale) => sale.ticket.client_id === identity.entityId);
  }, [identity, sales]);
  const sellerClients = useMemo(() => {
    if (!snapshot || !identity) return [];
    if (identity.role === "admin") return snapshot.clients;
    if (identity.role === "seller") return snapshot.clients;
    const clientIds = new Set(ownSales.map((sale) => sale.ticket.client_id));
    return snapshot.clients.filter((client) => clientIds.has(client.id));
  }, [identity, ownSales, snapshot]);
  const matchingClients = useMemo(() => sellerClients.filter((client) => {
    const name = clientUser(client)?.name ?? "";
    const contact = contactByUserId.get(client.user_id);
    return `${name} ${contact?.phone ?? ""} ${contact?.street ?? ""}`.toLowerCase().includes(search.toLowerCase());
  }), [clientUser, contactByUserId, search, sellerClients]);
  const matchingProducts = useMemo(() => (snapshot?.products ?? []).filter((product) =>
    `${product.name} ${product.description ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  ), [search, snapshot]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const session = await api.login(loginEmail.trim(), loginPassword);
      const data = await loadSnapshot(session.accessToken);
      const resolved = getIdentity(data, session.userId);
      if (!resolved) throw new Error("La cuenta no tiene un rol asignado en el sistema.");
      sessionStorage.setItem("cuotas-access-token", session.accessToken);
      sessionStorage.setItem("cuotas-user-id", session.userId);
      setToken(session.accessToken);
      setIdentity(resolved);
      setTab("overview");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "No se pudo iniciar sesión.");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    sessionStorage.removeItem("cuotas-access-token");
    sessionStorage.removeItem("cuotas-user-id");
    setIdentity(null);
    setSnapshot(null);
    setToken("");
    setTab("overview");
    setError("");
  }

  async function refreshData(successMessage?: string): Promise<boolean> {
    if (!token) return false;
    setBusy(true);
    setError("");
    try {
      await loadSnapshot(token);
      if (successMessage) setNotice(successMessage);
      return true;
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "No se pudieron actualizar los datos.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identity || identity.role !== "admin") return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const input: AccountInput = {
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      name: String(formData.get("name") ?? "").trim(),
      dni: String(formData.get("dni") ?? "").trim(),
      role: String(formData.get("role")) as AccountInput["role"],
      phone: String(formData.get("phone") ?? "").trim() || undefined,
      street: String(formData.get("street") ?? "").trim() || undefined,
      map_link: String(formData.get("map_link") ?? "").trim() || undefined,
    };
    setBusy(true);
    setError("");
    try {
      await api.createAccount(input, token);
      form.reset();
      await refreshData("La cuenta quedó creada y ya puede ingresar.");
      setTab("clients");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear la cuenta.");
    } finally {
      setBusy(false);
    }
  }

  async function sendInvitation(email: string, role: Role) {
    if (!token) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.createAccountInvitation({ email: email.trim(), role }, token);
      setNotice(`Enlace de registro enviado a ${email.trim()}. Vence en 20 minutos.`);
      return true;
    } catch (invitationError) {
      setError(invitationError instanceof Error ? invitationError.message : "No se pudo enviar el enlace.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function sendAdminInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const sent = await sendInvitation(String(data.get("invite_email") ?? ""), accountRole);
    if (sent) setShowAccountInvite(false);
  }

  async function createSellerClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || identity?.role !== "seller") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      const created = await api.createAccount({
        email: String(data.get("email") ?? "").trim(),
        password: String(data.get("password") ?? ""),
        name: String(data.get("name") ?? "").trim(),
        dni: String(data.get("dni") ?? "").trim(),
        role: "client",
        phone: String(data.get("phone") ?? "").trim(),
        street: String(data.get("street") ?? "").trim(),
        map_link: String(data.get("map_link") ?? "").trim() || undefined,
      }, token);
      const updatedSnapshot = await api.snapshot(token);
      setSnapshot(updatedSnapshot);
      const client = updatedSnapshot.clients.find((item) => item.user_id === created.userId);
      if (!client) throw new Error("La cuenta se creó, pero no se pudo cargar en la lista de clientes.");
      setSaleClient(client);
      setShowNewClientForm(false);
      setSaleClientSearch("");
      setNotice("Cliente creado y seleccionado para la venta.");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el cliente.");
    } finally {
      setBusy(false);
    }
  }

  async function sendSellerClientInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const sent = await sendInvitation(email, "client");
    if (sent) {
      setShowNewClientForm(false);
      setSaleClientSearch("");
    }
  }

async function createProduct(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (!snapshot || !token) return;

  const form = event.currentTarget;
  const formData = new FormData(form);
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  setBusy(true);
  setError("");

  try {
    const uploadedImage = productImageFile
      ? await api.uploadProductImage(productImageFile, token)
      : null;

    await api.createProduct(
      {
        name,
        description: description || null,
        img: uploadedImage?.url ?? null,
      },
      token,
    );

    form.reset();
    setProductImageFile(null);
    setProductImagePreview("");

    if (productImageInputRef.current) {
      productImageInputRef.current.value = "";
    }

    await refreshData("Producto agregado al catálogo.");
  } catch (createError) {
    setError(
      createError instanceof Error
        ? createError.message
        : "No se pudo cargar el producto.",
    );
  } finally {
    setBusy(false);
  }
}
// funcionalidad sino visibilidad
// Te propuse cambiar createSale para que leyera varios productos, cada uno con su importe y cuotas, y los enviara en ticket_products. Eso modifica el guardado y la validación; no hace falta para trabajar solo la visibilidad.
// Dejala como está. Eso sí: si reemplazás el <select> y quitás los campos actuales de product_id, value y quotas, el envío existente va a fallar porque createSale todavía espera esos datos. Para esta etapa, mantenemos intacta esa función y hacemos solo los cambios visuales.
  async function createSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot || !identity || identity.role !== "seller" || !token) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const clientId = saleClient?.id;
    // --------------------17/11
    const cobradorValue = String(formData.get("cobrador_id") ?? "");
    const cobradorId = cobradorValue ? Number(cobradorValue) : null;
    const values = formData.getAll("item_value").map((value) => Number(value));
    const quotas = formData.getAll("item_quotas").map((value) => Number(value));
    const ticketProducts = saleProducts.map((product, index) => ({
      product_id: product.id,
      value: values[index],
      quotas: quotas[index],
    }));
    if (!clientId || ticketProducts.length === 0 || ticketProducts.some((item) =>
      !Number.isSafeInteger(item.value) || item.value <= 0 ||
      !Number.isSafeInteger(item.quotas) || item.quotas <= 0,
    )
      || (cobradorId !== null && !Number.isFinite(cobradorId))) {
      setError("Seleccioná un cliente, al menos un producto y completá sus importes y cuotas.");
      return;
    }
    // --------------------17/11
    setBusy(true);
    setError("");
    try {
      await api.createTicket({
        client_id: clientId,
        seller_id: identity.entityId!,
        cobrador_id: cobradorId,
        ticket_products: ticketProducts,
      }, token);
      form.reset();
      setSaleProducts([]);
      setSaleClient(null);
      setTab("sales");
      const refreshed = await refreshData();
      if (refreshed) {
        setNotice("La venta se registró correctamente.");
      } else {
        setError("La venta se registró correctamente, pero no se pudo actualizar la vista. Recargá los datos antes de volver a intentarlo.");
      }
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo registrar la venta.");
    } finally {
      setBusy(false);
    }
  }

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    sessionStorage.setItem("cuotas-theme", nextTheme);
    setTheme(nextTheme);
  }

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[var(--mute)]">Cargando tu espacio...</div>;
  }

  if (!identity || !snapshot) {
    return (
      <main className="login-shell">
        <div className="login-aside">
          <div className="brand-mark large p-1"><Image src="/favicon.ico" alt="q" width={64} height={64} /></div>
          <div className="relative z-10 max-w-md">
            <p className="text-xs font-bold uppercase tracking-[.22em] text-white/65">CuotasOnline</p>
            <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
              {versiculo?.frase ?? <>Cada venta,<br />más simple.</>}
            </h1>
            <p className="mt-5 text-lg max-w-sm leading-7 text-white/75">
              {versiculo?.cita ?? "Un sistema de gestión de ventas y cuotas que te ayuda a organizar tu negocio y a tus clientes."}
            </p>
          </div>
          <div className="login-orbit orbit-one" /><div className="login-orbit orbit-two" />
          <p className="relative z-10 text-xs text-white/55">Una forma más clara de crecer.</p>
        </div>
        <div className="login-main">
          <div className="login-top">
            <span className="text-sm font-semibold text-[var(--ink)]">CuotasOnline</span>
            <Button variant="quiet" className="!px-3" onClick={toggleTheme}>
              <Icon name={theme === "light" ? "moon" : "sun"} size={17} />
              <span className="hidden sm:inline">{theme === "light" ? "Modo oscuro" : "Modo claro"}</span>
            </Button>
          </div>
          <form className="login-form" onSubmit={signIn}>
            <div className="mb-2">
              <p className="text-sm font-semibold text-[var(--accent)]">Bienvenido de nuevo</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--ink)]">Ingresá a tu cuenta</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--mute)]">Usá el correo y la contraseña de tu cuenta.</p>
            </div>
            <label className="form-label">Correo electrónico
              <input name="email" type="email" autoComplete="username" required value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)} placeholder="nombre@correo.com" />
            </label>
            <label className="form-label">Contraseña
              <input name="password" type="password" autoComplete="current-password" required value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)} placeholder="Tu contraseña" />
            </label>
            {error && <p className="feedback feedback-error" role="alert">{error}</p>}
            <Button type="submit" className="w-full justify-center" disabled={busy}>
              {busy ? "Verificando..." : "Ingresar"}
              {!busy && <Icon name="arrow" size={17} />}
            </Button>
            <p className="mt-2 text-center text-xs leading-5 text-[var(--mute)]">
              El acceso usa las credenciales de autenticación configuradas para este sistema.
            </p>
            {process.env.NODE_ENV !== "production" && (
              <div className="mt-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3">
                <p className="mb-2 text-xs font-semibold text-[var(--ink)]">Accesos locales de prueba</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["Administrador", "admin.demo@cuotasonline.test", "DemoAdmin-2026!"],
                    ["Cliente", "cliente.demo@cuotasonline.test", "DemoCliente-2026!"],
                    ["Vendedor", "vendedor.demo@cuotasonline.test", "DemoVendedor-2026!"],
                  ].map(([label, email, password]) => (
                    <button key={email} type="button" className="button button-secondary !min-h-8 !px-2.5 !text-[10px]"
                      onClick={() => { setLoginEmail(email); setLoginPassword(password); }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
          <p className="absolute bottom-7 text-xs text-[var(--mute)]">© 2026 CuotasOnline · Gestión segura</p>
        </div>
      </main>
    );
  }

  const firstName = identity.user.name.split(/\s+/)[0];
  const currentNav = navigation[identity.role];
  const title = currentNav.find((item) => item.id === tab)?.label ?? "Resumen";
  const salesOwed = ownSales.reduce((sum, sale) => sum + sale.item.value, 0);
  const totalQuotas = ownSales.reduce((sum, sale) => sum + (sale.item.quotas ?? 0), 0);
  const clientCount = new Set(ownSales.map((sale) => sale.ticket.client_id)).size;
  const sellerCount = snapshot.sellers.filter((seller) => seller.is_active).length;
  const activeClientCount = snapshot.clients.filter((client) => client.is_active).length;
  const topProducts = [...new Set(ownSales.map((sale) => sale.product?.name ?? "Producto"))]
    .map((name) => ({ name, count: ownSales.filter((sale) => sale.product?.name === name).length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxProductCount = Math.max(1, ...topProducts.map((product) => product.count));
  const visibleSales = ownSales.filter((sale) => {
    const query = search.toLowerCase();
    return `${sale.product?.name ?? ""} ${sale.clientName} ${sale.sellerName}`.toLowerCase().includes(query);
  });
  const selectedClientContact = selectedClient ? contactByUserId.get(selectedClient.user_id) : undefined;
  const selectedClientWhatsapp = selectedClientContact?.phone ? whatsappUrl(selectedClientContact.phone) : null;
  const selectedClientMapLink = safeMapLink(selectedClientContact?.map_link);

  const renderClientDirectory = () => (
    <>
      <SectionHeading title={identity.role === "admin" ? "Directorio de clientes" : "Mis clientes"}
        subtitle={identity.role === "seller"
          ? "Clientes activos disponibles para atender y registrar ventas."
          : `${matchingClients.length} ${matchingClients.length === 1 ? "cliente" : "clientes"} en tu cartera`}
          styles="bg-gradient-to-l from-yellow-700 to-yellow-600"/>
      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, teléfono o domicilio" />
        {identity.role === "admin" && <Button onClick={() => setTab("accounts")}><Icon name="user-plus" size={17} /> Nuevo cliente</Button>}
      </div>
      <Card>
        <Table headers={["Cliente", "Contacto", "Compras", "Estado", ""]} empty={matchingClients.length === 0}>
          {matchingClients.map((client) => {
            const user = clientUser(client);
            const contact = contactByUserId.get(client.user_id);
            const purchases = ownSales.filter((sale) => sale.ticket.client_id === client.id).length;
            return (
              <tr key={client.id}>
                <td><div className="flex items-center gap-3"><span className="avatar">{initials(user?.name ?? "CL")}</span>
                  <span><strong className="block text-sm text-[var(--ink)]">{user?.name ?? "Cliente"}</strong><small className="text-[var(--mute)]">DNI {user?.dni ?? "—"}</small></span></div></td>
                <td><span className="block">{contact?.phone || "Sin teléfono"}</span><small className="text-[var(--mute)]">{contact?.street || "Domicilio no informado"}</small></td>
                <td>{purchases}</td>
                <td><StatusPill warn={!client.is_active}>{client.is_active ? "Activo" : "Inactivo"}</StatusPill></td>
                <td className="text-right"><Button variant="quiet" className="!px-3 !py-2" onClick={() => setSelectedClient(client)}>
                  <Icon name="eye" size={16} /> Ver ficha
                </Button></td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </>
  );

  const renderProducts = (isAdmin = false) => (
    <>
      {isAdmin && (
        <Card className="mb-6 p-5 sm:p-6">
          <SectionHeading title="Cargar producto" subtitle="Agregá productos al catálogo de ventas."/>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={createProduct}>
            <label className="form-label">Nombre del producto<input name="name" required placeholder="Ej. Heladera 340 L" /></label>
            {/* <label className="form-label">URL de la foto<input name="img" type="url" placeholder="https://..." /></label> */}
<div className="form-label">
  Imagen del producto

  <input
    ref={productImageInputRef}
    type="file"
    accept="image/*"
    className="hidden"
    onChange={(event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setProductImageFile(file);
      setProductImagePreview(URL.createObjectURL(file));
    }}
  />

  <div className="flex items-center gap-3">
    {productImagePreview && (
      <>
        <Image
          src={productImagePreview}
          alt="Vista previa del producto"
          width={72}
          height={72}
          unoptimized
          className="h-[72px] w-[72px] rounded-lg object-contain"
        />
      </>
    )}

    <Button
      type="button"
      variant="secondary"
      onClick={() => productImageInputRef.current?.click()}
    >
      {productImagePreview ? "Cambiar imagen" : "Elegir imagen"}
    </Button>
  </div>
</div>
            {/*  */}
            <label className="form-label sm:col-span-2">Descripción<textarea name="description" rows={3} placeholder="Características y detalles del producto" /></label>
            <div className="sm:col-span-2"><Button type="submit" disabled={busy}><Icon name="plus" size={17} />{busy ? "Guardando..." : "Agregar al catálogo"}</Button></div>
          </form>
        </Card>
      )}
      <SectionHeading title={isAdmin ? "Catálogo de productos" : "Productos disponibles"}
        subtitle={`${matchingProducts.length} productos`} styles="bg-gradient-to-r from-blue-600 to-blue-900" />
      <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Buscar producto" /></div>
      {matchingProducts.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {matchingProducts.map((product) => <ProductCard key={product.id} product={product} onOpen={setSelectedProduct} />)}
        </div>
      ) : <Card><EmptyState text="No encontramos productos con esa búsqueda." /></Card>}
    </>
  );

  const renderSalesTable = (rows: SaleRow[], isAdmin: boolean) => (
    <Card>
      <Table headers={["Fecha", "Producto", ...(isAdmin ? ["Cliente", "Vendedor"] : identity.role === "seller" ? ["Cliente"] : []), "Plan", "Valor", "Estado"]} empty={rows.length === 0}>
        {rows.map(({ ticket, item, product, clientName, sellerName }) => (
          <tr key={`${ticket.id}-${item.id}`}>
            <td>{formatDate(ticket.created_at)}</td>
            <td><div className="flex items-center gap-3"><span className="table-thumb">{product?.img
              ? <Image src={product.img} alt="" width={48} height={48} unoptimized className="h-full w-full object-contain" />
              : <Icon name="image" size={18} />}</span><strong className="text-[var(--ink)]">{product?.name ?? "Producto"}</strong></div></td>
            {isAdmin && <><td>{clientName}</td><td>{sellerName}</td></>}
            {!isAdmin && identity.role === "seller" && <td>{clientName}</td>}
            <td>{item.quotas} cuotas de {money.format(item.value / item.quotas)}</td>
            <td className="font-semibold text-[var(--ink)]">{money.format(item.value)}</td>
            <td><StatusPill warn>Pendiente</StatusPill></td>
          </tr>
        ))}
      </Table>
    </Card>
  );

  const renderOverview = () => {
    if (identity.role === "client") {
      return (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Saldo pendiente" value={money.format(salesOwed)} icon="calendar" tone="pink" change="Total de tus planes activos" />
            <StatCard label="Productos comprados" value={ownSales.length} icon="box" tone="violet" change="Compras registradas en tu cuenta" />
            <StatCard label="Cuotas del plan" value={totalQuotas} icon="receipt" tone="mint" change="Según los planes de compra" />
          </div>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-xl font-bold text-[var(--ink)]">Hola, {firstName} 👋</h2>
              <p className="mt-1 text-sm text-[var(--mute)]">Este es el estado de tus compras.</p></div>
            <Button variant="secondary" onClick={() => setTab("catalog")}>Explorar catálogo <Icon name="arrow" size={16} /></Button>
          </div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-[var(--ink)]">Tus compras recientes</h3>
            <button className="text-sm font-semibold text-[var(--accent)]" onClick={() => setTab("purchases")}>Ver todas</button>
          </div>
          {renderSalesTable(ownSales.slice(0, 5), false)}
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[var(--mute)]"><Icon name="warning" size={15} className="mt-0.5 shrink-0" />
            El sistema todavía no registra pagos: los planes se muestran completos como pendientes. Consultá con administración por el estado de tus pagos.
          </p>
        </>
      );
    }

    const isAdmin = identity.role === "admin";
    const recent = [...ownSales].sort((a, b) => b.ticket.created_at.localeCompare(a.ticket.created_at)).slice(0, 5);
    return (
      <>
        <div className="mb-6">
          <p className="text-sm font-medium text-[var(--accent)]">{isAdmin ? "Vista general" : "Panel de vendedor"}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--ink)]">Hola, {firstName} <span aria-hidden="true">👋</span></h2>
          <p className="mt-1 text-sm text-[var(--mute)]">{isAdmin ? "Esto es lo que está pasando con tu negocio." : "Acá tenés el resumen de tu actividad."}</p>
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={isAdmin ? "Por cobrar" : "Mis ventas"}
            value={money.format(isAdmin ? sales.reduce((sum, sale) => sum + sale.item.value, 0) : salesOwed)}
            icon="receipt" tone="violet" change="Planes cargados en el sistema" />
          <StatCard label={isAdmin ? "Clientes activos" : "Mis clientes"} value={isAdmin ? activeClientCount : clientCount}
            icon="users" tone="mint" change={isAdmin ? `${snapshot.clients.length - activeClientCount} inactivos` : "Con compras registradas"} />
          <StatCard label={isAdmin ? "Vendedores activos" : "Productos vendidos"}
            value={isAdmin ? sellerCount : ownSales.length} icon="briefcase" tone="blue" change={isAdmin ? `${snapshot.sellers.length} en total` : "Unidades registradas"} />
          <StatCard label="Cuotas pendientes" value={isAdmin ? sales.reduce((sum, sale) => sum + (sale.item.quotas ?? 0), 0) : totalQuotas}
            icon="calendar" tone="pink" change="Todos los planes sin pagos aplicados" />
        </div>
        <div className="mb-6 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <Card>
            <div className="card-heading"><div><h3>Actividad reciente</h3><p>Últimas operaciones registradas</p></div>
              <button className="text-sm font-semibold text-[var(--accent)]" onClick={() => setTab("sales")}>Ver todas <Icon name="arrow" size={14} /></button></div>
            {renderSalesTable(recent, isAdmin)}
          </Card>
          <Card className="p-5">
            <div className="mb-5"><h3 className="font-semibold text-[var(--ink)]">Productos más vendidos</h3>
              <p className="mt-1 text-xs text-[var(--mute)]">Por cantidad de unidades</p></div>
            {topProducts.length ? <ul className="space-y-5">
              {topProducts.map((product, index) => (
                <li key={product.name}><div className="mb-2 flex justify-between gap-2 text-sm">
                  <span className="truncate font-medium text-[var(--ink)]">{product.name}</span><span className="text-[var(--mute)]">{product.count}</span>
                </div><div className="h-2 rounded-full bg-[var(--soft)]"><div className={`bar-fill bar-${index % 4}`}
                  style={{ width: `${Math.round(product.count / maxProductCount * 100)}%` }} /></div></li>
              ))}
            </ul> : <EmptyState text="Todavía no hay ventas para resumir." />}
            {isAdmin && <Button variant="secondary" className="mt-7 w-full justify-center" onClick={() => setTab("accounts")}>
              <Icon name="user-plus" size={16} /> Crear cuenta
            </Button>}
            {!isAdmin && <Button variant="secondary" className="mt-7 w-full justify-center" onClick={() => setTab("new-sale")}>
              <Icon name="plus" size={16} /> Cargar una venta
            </Button>}
          </Card>
        </div>
        {isAdmin && (
          <Card>
            <div className="card-heading"><div><h3>Clientes recientes</h3><p>Acceso rápido a sus datos de contacto</p></div>
              <button className="text-sm font-semibold text-[var(--accent)]" onClick={() => setTab("clients")}>Ver clientes <Icon name="arrow" size={14} /></button></div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {snapshot.clients.slice(0, 3).map((client) => {
                const user = clientUser(client);
                const contact = contactByUserId.get(client.user_id);
                return <button key={client.id} onClick={() => setSelectedClient(client)} className="client-mini">
                  <span className="avatar">{initials(user?.name ?? "CL")}</span>
                  <span className="min-w-0 flex-1 text-left"><strong className="block truncate text-sm text-[var(--ink)]">{user?.name ?? "Cliente"}</strong>
                    <small className="block truncate text-[var(--mute)]">{contact?.phone || "Sin teléfono"}</small></span>
                  <Icon name="arrow" size={16} />
                </button>;
              })}
              {!snapshot.clients.length && <EmptyState text="Todavía no hay clientes cargados." />}
            </div>
          </Card>
        )}
        <p className="mt-4 text-xs leading-5 text-[var(--mute)]">Los planes se muestran completos como pendientes porque el sistema aún no registra pagos de cuotas.</p>
      </>
    );
  };

  const renderSellers = () => {
    const query = search.toLowerCase();
    const filtered = snapshot.sellers.filter((seller) => {
      const user = snapshot.users.find((entry) => entry.id === seller.user_id);
      return `${user?.name ?? ""} ${user?.dni ?? ""}`.toLowerCase().includes(query);
    });
    return <>
      <SectionHeading title="Equipo de ventas" subtitle={`${filtered.length} vendedores`} />
      <div className="mb-4 flex gap-3"><SearchInput value={search} onChange={setSearch} placeholder="Buscar vendedor" />
        <Button onClick={() => setTab("accounts")}><Icon name="user-plus" size={17} /> Nuevo vendedor</Button></div>
      <Card><Table headers={["Vendedor", "DNI", "Ventas", "Estado"]} empty={filtered.length === 0}>
        {filtered.map((seller) => {
          const user = snapshot.users.find((entry) => entry.id === seller.user_id);
          const sellerSales = sales.filter((sale) => sale.sellerId === seller.id);
          return <tr key={seller.id}><td><div className="flex items-center gap-3"><span className="avatar">{initials(user?.name ?? "VE")}</span>
            <strong className="text-[var(--ink)]">{user?.name ?? "Vendedor"}</strong></div></td><td>{user?.dni ?? "—"}</td>
            <td>{sellerSales.length} · {money.format(sellerSales.reduce((sum, sale) => sum + sale.item.value, 0))}</td>
            <td><StatusPill warn={!seller.is_active}>{seller.is_active ? "Activo" : "Inactivo"}</StatusPill></td></tr>;
        })}
      </Table></Card>
    </>;
  };

  const renderInstallments = () => (
    <>
      <SectionHeading title={identity.role === "client" ? "Mis cuotas pendientes" : "Cuotas pendientes"}
        subtitle="Detalle de los planes de pago registrados."  styles="bg-gradient-to-l from-red-600 to-red-700" />
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Saldo total" value={money.format(salesOwed)} icon="calendar" tone="pink" />
        <StatCard label="Cuotas del plan" value={totalQuotas} icon="receipt" tone="violet" />
        <StatCard label="Planes activos" value={ownSales.length} icon="check" tone="mint" />
      </div>
      <div className="feedback feedback-info mb-5"><Icon name="warning" size={18} />
        <p>El backend aún no registra pagos parciales. Por eso, cada plan figura íntegramente pendiente.</p>
      </div>
      {renderSalesTable(visibleSales, identity.role === "admin")}
    </>
  );

  const renderNewSale = () => {
    const myClients = sellerClients;
    // --------------------17/11
    const matchingMyClients = myClients.filter((client) => {
  const user = clientUser(client);
  const contact = contactByUserId.get(client.user_id);

  const searchableText = [
    user?.name,
    user?.dni,
    contact?.phone,
  ].join(" ").toLowerCase();

  return searchableText.includes(saleClientSearch.toLowerCase());
});
    // --------------------17/11
    const myProducts = snapshot.products;
    // --------------------17/11
    const matchingSaleProducts = myProducts.filter((product) =>
  `${product.name} ${product.description ?? ""}`
    .toLowerCase()
    .includes(productSearch.trim().toLowerCase()),
);
    // --------------------17/11
    return <>
      <SectionHeading title="Registrar una venta" subtitle="Seleccioná cliente y producto, y definí el plan de cuotas." styles="bg-gradient-to-l from-green-600 to-green-700" />
      {myClients.length === 0 && <div className="feedback feedback-info mb-5"><Icon name="warning" size={18} />
        <p>Necesitás tener clientes asignados para registrar una venta. Primero cargá un cliente desde administración.</p></div>}
      <Card className="max-w-3xl p-5 sm:p-7">
        <form onSubmit={createSale} className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {/* <select name="client_id" required disabled={!myClients.length}>
              <option value="">Seleccioná un cliente</option>{myClients.map((client) => <option key={client.id} value={client.id}>{clientUser(client)?.name ?? `Cliente ${client.id}`}</option>)}
            </select> */}
            {/* -------------- */}
  <div className="sm:col-span-2">
  <div className="mb-2 flex items-center gap-2">
    <Icon name="users" size={20} />
    <span className="text-lg font-semibold text-[var(--ink)]">Cliente</span>
  </div>

  <SearchInput
    value={saleClientSearch}
    onChange={setSaleClientSearch}
    placeholder="Buscar por nombre, DNI o teléfono"
  />

 {saleClient && (
  <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] p-4">
    <div>
      <p className="font-semibold text-[var(--ink)]">
        {clientUser(saleClient)?.name ?? `Cliente ${saleClient.id}`}
      </p>
      <p className="text-sm text-[var(--mute)]">
        DNI {clientUser(saleClient)?.dni ?? "—"}
        {" · "}
        {contactByUserId.get(saleClient.user_id)?.phone || "Sin teléfono"}
      </p>
      <p className="text-sm text-[var(--mute)]">
        {contactByUserId.get(saleClient.user_id)?.street || "Domicilio no informado"}
      </p>
    </div>

    <button
      type="button"
      className="font-semibold text-[var(--accent)]"
      onClick={() => setSaleClient(null)}
    >
      Cambiar
    </button>
  </div>
)}

{!saleClient && saleClientSearch.trim() !== "" && (
  <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
    {matchingMyClients.map((client) => {
      const user = clientUser(client);
      const contact = contactByUserId.get(client.user_id);

      return (
        <button
          key={client.id}
          type="button"
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] p-3 text-left hover:border-[var(--accent)]"
          onClick={() => {
            setSaleClient(client);
            setSaleClientSearch("");
          }}
        >
          <span className="block font-semibold text-[var(--ink)]">
            {user?.name ?? `Cliente ${client.id}`}
          </span>
          <span className="block text-sm text-[var(--mute)]">
            DNI {user?.dni ?? "—"} · {contact?.phone || "Sin teléfono"}
          </span>
        </button>
      );
    })}

    {matchingMyClients.length === 0 && (
      <p className="p-3 text-sm text-[var(--mute)]">
        No encontramos clientes con esa búsqueda.
      </p>
    )}
  </div>
)}

  <button
    type="button"
    className="mt-4 flex items-center gap-2 font-semibold text-[var(--accent)]"
    onClick={() => setShowNewClientForm(true)}
  >
    <Icon name="plus" size={18} />
    Crear nuevo cliente
  </button>
</div>
            {/* -------------- */}
          </div>
          <div className="sm:col-span-2">
            {/* <select name="product_id" required>
              <option value="">Seleccioná un producto</option>{myProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select> */}
            <div className="sm:col-span-2 rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-4">
  <div className="mb-4 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Icon name="box" size={21} />
      <h3 className="text-lg font-semibold text-[var(--ink)]">Artículos</h3>
    </div>
    <span className="text-sm text-[var(--mute)]">
      {saleProducts.length} {saleProducts.length === 1 ? "artículo" : "artículos"}
    </span>
  </div>

  <SearchInput
    value={productSearch}
    onChange={setProductSearch}
    placeholder="Buscar producto por nombre"
  />

  {productSearch.trim() !== "" && (
    <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
      {matchingSaleProducts.map((product) => (
        <button
          key={product.id}
          type="button"
          className="w-full rounded-xl border border-[var(--line)] p-3 text-left hover:border-[var(--accent)]"
          onClick={() => {
            setSaleProducts((products) => [...products, product]);
            setProductSearch("");
          }}
        >
           {product.img && (
    <Image
      src={product.img}
      alt={product.name}
      width={48}
      height={48}
      unoptimized
      className="h-12 w-12 object-contain"
    />
  )}
          <span className="font-semibold text-[var(--ink)]">{product.name}</span>
          {product.description && (
            <span className="mt-1 block text-sm text-[var(--mute)]">
              {product.description}
            </span>
          )}
        </button>
      ))}

      {matchingSaleProducts.length === 0 && (
        <p className="p-3 text-sm text-[var(--mute)]">
          No encontramos artículos con esa búsqueda.
        </p>
      )}
    </div>
  )}

<div className="mt-3 space-y-2">
  {saleProducts.map((product, index) => (
    <div
      key={`${product.id}-${index}`}
      className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(72px,110px)_minmax(64px,90px)_24px] items-center gap-2 rounded-xl border border-[var(--line)] p-3 sm:gap-3"
    >
      <div className="flex min-w-0 items-center gap-2">
        {product.img && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md">
            <Image
              src={product.img}
              alt={product.name}
              width={40}
              height={40}
              unoptimized
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}

        <strong
          className="min-w-0 truncate text-sm text-[var(--ink)]"
          title={product.name}
        >
          {product.name}
        </strong>
      </div>

      <label className="min-w-0 text-xs text-[var(--mute)]">
        Importe
        <input
          className="mt-1 min-w-0 w-full"
          name="item_value"
          type="number"
          min="1"
          step="1"
          required
          placeholder="$ 0"
        />
      </label>

      <label className="min-w-0 text-xs text-[var(--mute)]">
        Cuotas
        <input
          className="mt-1 min-w-0 w-full"
          name="item_quotas"
          type="number"
          min="1"
          step="1"
          required
          placeholder="12"
        />
      </label>

      <button
        type="button"
        aria-label={`Quitar ${product.name}`}
        className="flex h-8 w-6 shrink-0 items-center justify-center text-lg text-[var(--mute)] hover:text-red-500"
        onClick={() =>
          setSaleProducts((products) =>
            products.filter((_, itemIndex) => itemIndex !== index),
          )
        }
      >
        ×
      </button>
    </div>
  ))}
</div>
  <button
    type="button"
    className="mt-4 w-full rounded-xl border border-[var(--accent)] py-3 font-semibold text-[var(--accent)]"
  >
    Buscar en catálogo
  </button>
</div>
          </div>
          {/* <label className="form-label">Valor total<input name="value" type="number" min="1" step="1" required placeholder="Ej. 980000" /></label>
          <label className="form-label">Cantidad de cuotas<input name="quotas" type="number" min="1" step="1" required placeholder="Ej. 12" /></label>
          <label className="form-label sm:col-span-2">Cobrador <span className="font-normal text-[var(--mute)]">(opcional)</span>
                <select name="cobrador_id">
                  <option value="">Sin asignar</option>{snapshot.cobradores.map((item) => {
                const name = snapshot.users.find((user) => user.id === item.user_id)?.name ?? `Cobrador ${item.id}`;
                return <option key={item.id} value={item.id}>{name}</option>;
              })}
            </select>
          </label> */}
          <div className="sm:col-span-2"><Button type="submit" disabled={busy || !myClients.length || !myProducts.length}>
            <Icon name="check" size={17} />{busy ? "Guardando venta..." : "Confirmar venta"}
          </Button></div>
        </form>
      </Card>
      {showNewClientForm && (
        <div className="modal-backdrop" onClick={() => setShowNewClientForm(false)}>
          <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="new-client-title" onClick={(event) => event.stopPropagation()}>
            <div className="detail-modal-head">
              <div><h2 id="new-client-title" className="text-xl font-bold text-[var(--ink)]">Agregar cliente</h2>
                <p className="mt-1 text-sm text-[var(--mute)]">Creá la cuenta ahora o enviá un enlace para que complete sus datos.</p></div>
              <button type="button" className="icon-button" aria-label="Cerrar" onClick={() => setShowNewClientForm(false)}><Icon name="close" size={18} /></button>
            </div>
            <div className="my-5 flex gap-2">
              <Button variant={clientInviteMode ? "secondary" : "primary"} onClick={() => setClientInviteMode(false)}>Crear ahora</Button>
              <Button variant={clientInviteMode ? "primary" : "secondary"} onClick={() => setClientInviteMode(true)}>Enviar enlace</Button>
            </div>
            {clientInviteMode ? (
              <form className="grid gap-4" onSubmit={sendSellerClientInvitation}>
                <label className="form-label">Correo electrónico<input name="email" type="email" autoComplete="email" required /></label>
                <p className="text-xs leading-5 text-[var(--mute)]">El enlace permitirá al cliente completar sus datos durante los próximos 20 minutos.</p>
                <Button type="submit" disabled={busy}>{busy ? "Enviando..." : "Enviar enlace por email"}</Button>
              </form>
            ) : (
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={createSellerClient}>
                <label className="form-label">Nombre y apellido<input name="name" autoComplete="name" required /></label>
                <label className="form-label">DNI<input name="dni" inputMode="numeric" required /></label>
                <label className="form-label sm:col-span-2">Correo electrónico<input name="email" type="email" autoComplete="email" required /></label>
                <label className="form-label sm:col-span-2">Contraseña inicial<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
                <label className="form-label">Teléfono<input name="phone" type="tel" autoComplete="tel" required /></label>
                <label className="form-label">Domicilio<input name="street" autoComplete="street-address" required /></label>
                <label className="form-label sm:col-span-2">Link al Mapa<input name="map_link" type="url" placeholder="https://maps.google.com/..." /></label>
                <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? "Creando cliente..." : "Crear y usar en la venta"}</Button></div>
              </form>
            )}
          </section>
        </div>
      )}
    </>;
  };

  const renderAccountForm = () => (
    <>
      <SectionHeading title="Crear usuario" subtitle="Elegí el tipo de cuenta y completá todos sus datos."
        action={<Button variant="secondary" onClick={() => setShowAccountInvite((visible) => !visible)}>
          <Icon name="message" size={16} /> Enviar enlace por email
        </Button>} />
      {showAccountInvite && <Card className="mb-5 max-w-4xl p-5">
        <form className="grid gap-4 sm:grid-cols-[1fr_auto]" onSubmit={sendAdminInvitation}>
          <label className="form-label">Correo electrónico para invitar
            <input name="invite_email" type="email" autoComplete="email" required placeholder="persona@correo.com" />
          </label>
          <div className="flex items-end"><Button type="submit" disabled={busy}>
            {busy ? "Enviando..." : `Invitar como ${accountRole === "admin" ? "administrador" : accountRole === "seller" ? "vendedor" : "cliente"}`}
          </Button></div>
          <p className="text-xs text-[var(--mute)] sm:col-span-2">El formulario de invitación pide solo tipo de cuenta y correo. El enlace vence a los 20 minutos.</p>
        </form>
      </Card>}
      <Card className="max-w-4xl p-5 sm:p-7">
        <form onSubmit={createAccount} className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <label className="form-label">Tipo de cuenta<select name="role" value={accountRole} onChange={(event) => setAccountRole(event.target.value as Role)}>
            <option value="client">Cliente</option><option value="seller">Vendedor</option><option value="admin">Administrador</option>
          </select></label>
          <label className="form-label">Nombre y apellido<input name="name" required autoComplete="name" placeholder="Nombre completo" /></label>
          <label className="form-label">Correo electrónico<input name="email" type="email" required autoComplete="email" placeholder="nombre@correo.com" /></label>
          <label className="form-label">Contraseña inicial<input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Mínimo 8 caracteres" /></label>
          <label className="form-label">DNI<input name="dni" required inputMode="numeric" placeholder="Número de documento" /></label>
          <label className="form-label">Teléfono<input name="phone" type="tel" autoComplete="tel" required={accountRole === "client"} placeholder="+54 9 ..." /></label>
          <label className="form-label">Domicilio<input name="street" autoComplete="street-address" required={accountRole === "client"} placeholder="Calle y número" /></label>
          <label className="form-label">Link al Mapa<input name="map_link" type="url" placeholder="https://maps.google.com/..." /></label>
          <div className="feedback feedback-info sm:col-span-2"><Icon name="warning" size={18} />
            <p>Los datos personales son obligatorios para crear la cuenta. Para clientes también se requieren teléfono y domicilio. La invitación por email es una alternativa.</p>
          </div>
          <div className="flex flex-wrap gap-3 sm:col-span-2"><Button type="submit" disabled={busy}><Icon name="user-plus" size={17} />
            {busy ? "Creando cuenta..." : "Crear usuario"}
          </Button></div>
        </form>
      </Card>
    </>
  );

  let pageContent: ReactNode;
  if (tab === "overview") pageContent = renderOverview();
  else if (tab === "clients") pageContent = renderClientDirectory();
  else if (tab === "sellers" && identity.role === "admin") pageContent = renderSellers();
  else if (tab === "products" && identity.role === "admin") pageContent = renderProducts(true);
  else if (tab === "catalog") pageContent = renderProducts();
  else if (tab === "sales" || tab === "purchases") {
    pageContent = <>
      <SectionHeading title={tab === "purchases" ? "Mis compras" : "Productos vendidos"} subtitle={`${visibleSales.length} productos registrados`} />
      {identity.role === "seller" && <div className="mb-4"><Button onClick={() => setTab("new-sale")}><Icon name="plus" size={17} /> Cargar venta</Button></div>}
      <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Buscar producto, cliente o vendedor" /></div>
      {renderSalesTable(visibleSales, identity.role === "admin")}
    </>;
  } else if (tab === "installments") pageContent = renderInstallments();
  else if (tab === "accounts" && identity.role === "admin") pageContent = renderAccountForm();
  else if (tab === "new-sale" && identity.role === "seller") pageContent = renderNewSale();
  else pageContent = renderOverview();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><span className="brand-mark p-1"><Image src="/favicon.ico" alt="q" width={64} height={64} /></span>
          <span><strong>cuotas<span>online</span></strong><small>Gestión simple</small></span>
        </div>
        <div className="sidebar-profile">
          <span className="avatar avatar-profile">{initials(identity.user.name)}</span>
          <span className="min-w-0"><strong className="block truncate text-sm">{identity.user.name}</strong>
            <small>{roleLabels[identity.role]}</small></span>
          <span className="online-dot" />
        </div>
        <p className="nav-caption">MENÚ PRINCIPAL</p>
        <nav className="sidebar-nav" aria-label="Menú principal">
          {currentNav.map((item) => <button key={item.id} className={`nav-item ${tab === item.id ? "nav-active" : ""}`}
            onClick={() => { setTab(item.id); setSearch(""); setError(""); setNotice(""); }}>
            <Icon name={item.icon} size={18} /><span>{item.label}</span>
            {item.id === "installments" && ownSales.length > 0 && <small>{ownSales.length}</small>}
          </button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-bubble">?</div><strong>¿Necesitás ayuda?</strong>
            <p>Contactá al equipo de soporte.</p><a href="mailto:soporte@cuotasonline.com">Contactar soporte <Icon name="arrow" size={13} /></a>
          </div>
          <button className="nav-item" onClick={toggleTheme}><Icon name={theme === "light" ? "moon" : "sun"} size={18} />
            <span>{theme === "light" ? "Modo oscuro" : "Modo claro"}</span></button>
          <button className="nav-item logout-button" onClick={signOut}><Icon name="logout" size={18} /><span>Cerrar sesión</span></button>
          <small className="sidebar-version">CuotasOnline · v1.0</small>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark p-1"><Image src="/favicon.ico" alt="q" width={64} height={64} /></span><strong>cuotas<span>online</span></strong></div>
          <div className="breadcrumb"><span>Panel</span><span>/</span><strong>{title}</strong></div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label={theme === "light" ? "Activar modo oscuro" : "Activar modo claro"} onClick={toggleTheme}>
              <Icon name={theme === "light" ? "moon" : "sun"} size={18} />
            </button>
            <span className="topbar-avatar">{initials(identity.user.name)}</span>
          </div>
        </header>
        <div className="mobile-nav">
          {currentNav.map((item) => <button key={item.id} className={tab === item.id ? "mobile-nav-active" : ""}
            onClick={() => { setTab(item.id); setSearch(""); setError(""); setNotice(""); }}>
            <Icon name={item.icon} size={17} /><span>{item.label}</span>
          </button>)}
        </div>
        <div className="page-content">
          {(error || notice) && <div className={`feedback mb-5 ${error ? "feedback-error" : "feedback-success"}`} role={error ? "alert" : "status"}>
            <Icon name={error ? "warning" : "check"} size={18} /><p>{error || notice}</p>
            <button aria-label="Cerrar aviso" onClick={() => { setError(""); setNotice(""); }}><Icon name="close" size={16} /></button>
          </div>}
          {pageContent}
          <footer className="page-footer"><span>© 2026 CuotasOnline</span><span>Una gestión más clara, todos los días.</span></footer>
        </div>
      </main>

      {selectedClient && (
        <div className="modal-backdrop" onClick={() => setSelectedClient(null)}>
          <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="client-detail-title" onClick={(event) => event.stopPropagation()}>
            <div className="detail-modal-head">
              <span className="avatar avatar-large">{initials(clientUser(selectedClient)?.name ?? "CL")}</span>
              <button className="icon-button" aria-label="Cerrar ficha" onClick={() => setSelectedClient(null)}><Icon name="close" size={19} /></button>
            </div>
            <h2 id="client-detail-title" className="mt-4 text-xl font-bold text-[var(--ink)]">{clientUser(selectedClient)?.name ?? "Cliente"}</h2>
            <p className="mt-1 text-sm text-[var(--mute)]">DNI {clientUser(selectedClient)?.dni ?? "No informado"} · Cliente {selectedClient.is_active ? "activo" : "inactivo"}</p>
            <div className="detail-separator" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-[var(--ink)]">Datos de contacto</h3>
              <div className="flex flex-wrap gap-2">
                {selectedClientContact?.phone && selectedClientWhatsapp && (
                  <a className="whatsapp-button" target="_blank" rel="noopener noreferrer"
                    href={`${selectedClientWhatsapp}?text=${encodeURIComponent(`Hola ${clientUser(selectedClient)?.name ?? ""}, te contacto por CuotasOnline.`)}`}>
                    <Icon name="message" size={17} /> WhatsApp
                  </a>
                )}
                {selectedClientMapLink && (
                  <a className="button button-secondary" target="_blank" rel="noopener noreferrer"
                    href={selectedClientMapLink}>
                    <Icon name="pin" size={17} /> Ubicación
                  </a>
                )}
                {!selectedClientMapLink && (
                  <p className="text-xs text-[var(--mute)]" role="status">
                    Este cliente todavía no tiene una ubicación cargada.
                  </p>
                )}
              </div>
            </div>
            <ContactDetails contact={selectedClientContact} />
            <div className="detail-separator" />
            <h3 className="mb-2 font-semibold text-[var(--ink)]">Compras registradas</h3>
            <div className="space-y-2">
              {sales.filter((sale) => sale.ticket.client_id === selectedClient.id).map(({ ticket, item, product, sellerName }) => (
                <div key={`${ticket.id}-${item.id}`} className="purchase-detail">
                  <span className="min-w-0"><strong className="block truncate text-sm">{product?.name ?? "Producto"}</strong>
                    <small className="text-[var(--mute)]">{formatDate(ticket.created_at)} · {sellerName}</small></span>
                  <span className="shrink-0 text-right text-sm font-semibold">{money.format(item.value)}
                    <small className="block font-normal text-[var(--mute)]">{item.quotas} cuotas</small></span>
                </div>
              ))}
              {!sales.some((sale) => sale.ticket.client_id === selectedClient.id) && <p className="text-sm text-[var(--mute)]">Sin compras registradas.</p>}
            </div>
            <Button variant="secondary" className="mt-5 w-full justify-center" onClick={() => setSelectedClient(null)}>Cerrar ficha</Button>
          </section>
        </div>
      )}

      {selectedProduct && (
        <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="product-detail-title" onClick={(event) => event.stopPropagation()}>
            <div className="relative"><ProductImage product={selectedProduct} large />
              <button className="icon-button absolute right-3 top-3 bg-white/90" aria-label="Cerrar detalle" onClick={() => setSelectedProduct(null)}><Icon name="close" size={18} /></button>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <h2 id="product-detail-title" className="text-xl font-bold text-[var(--ink)]">{selectedProduct.name}</h2>
              <ShareButton url={`/producto/${selectedProduct.id}`} />
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--mute)]">{selectedProduct.description || "Consultá con tu vendedor para conocer más sobre este producto."}</p>
            <p className="mt-4 text-xs text-[var(--mute)]">Cargado el {formatDate(selectedProduct.created_at)}</p>
            <Button variant="secondary" className="mt-5 w-full justify-center" onClick={() => setSelectedProduct(null)}>Cerrar detalle</Button>
          </section>
        </div>
      )}
    </div>
  );
}
