export type Role = "admin" | "seller" | "client";

export interface User {
  id: string;
  name: string;
  dni: string | number | null;
  admin_status: boolean;
}

export interface Seller {
  id: number;
  user_id: string;
  is_active: boolean;
}

export type Client = Seller;

export interface Contact {
  id: number;
  user_id: string;
  phone?: string | null;
  street?: string | null;
  map_link?: string | null;
}

export interface Product {
  id: number;
  name: string;
  description?: string | null;
  img?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface Cobrador {
  id: number;
  user_id: string;
}

export interface TicketProduct {
  id: number;
  product_id: number;
  ticket_id: number;
  value: number;
  quotas: number;
  product?: Pick<Product, "id" | "name" | "img" | "description"> | null;
}

export interface Ticket {
  id: number;
  created_at: string;
  client_id: number;
  seller_id: number;
  cobrador_id: number | null;
  ticket_product: TicketProduct[];
}

export interface Snapshot {
  users: User[];
  sellers: Seller[];
  clients: Client[];
  contacts: Contact[];
  products: Product[];
  cobradores: Cobrador[];
  tickets: Ticket[];
}

export interface AccountInput {
  email: string;
  password: string;
  name: string;
  dni: string;
  role: Role;
  phone?: string;
  street?: string;
  map_link?: string;
}

export interface InvitationInput {
  email: string;
  role: Role;
}

export type InvitationCompletionInput = Omit<AccountInput, "role">;

export function getApiBaseUrl(): string | null {
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000/api";
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");
  return null;
}

const apiBase = getApiBaseUrl();

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  if (!apiBase) {
    throw new Error("Falta configurar NEXT_PUBLIC_API_URL con la URL pública del backend.");
  }
  const headers = new Headers(options.headers);
  // if (options.body) headers.set("Content-Type", "application/json");
  if (options.body && !(options.body instanceof FormData)) {
  headers.set("Content-Type", "application/json");
}
// ---------------------------------------------------------------------
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, { ...options, headers, cache: "no-store" });
  } catch (error) {
    const detail = error instanceof Error && error.message
      ? ` Detalle: ${error.message}`
      : "";
    throw new Error(`No se pudo conectar con el backend en ${apiBase}. Verificá que esté iniciado.${detail}`);
  }

  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; data?: T; error?: string }
    | null;

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || `Error del servidor (${response.status})`);
  }
  return payload.data as T;
}

export const api = {
  request,
  login: (email: string, password: string) =>
    request<{ userId: string; email: string; accessToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  snapshot: (token: string) => request<Snapshot>("/dashboard", {}, token),
  createAccount: (input: AccountInput, token: string) =>
    request<{ userId: string; email: string; role: Role }>("/accounts", {
      method: "POST",
      body: JSON.stringify(input),
    }, token),
  createAccountInvitation: (input: InvitationInput, token: string) =>
    request<{ email: string; role: Role; expiresAt: string }>("/account-invitations", {
      method: "POST",
      body: JSON.stringify(input),
    }, token),
  getAccountInvitation: (invitationToken: string) =>
    request<{ email: string; role: Role; expiresAt: string }>(
      `/public/account-invitations/${encodeURIComponent(invitationToken)}`,
    ),
  completeAccountInvitation: (invitationToken: string, input: InvitationCompletionInput) =>
    request<{ userId: string; email: string; role: Role; requiresEmailConfirmation: boolean }>(
      `/public/account-invitations/${encodeURIComponent(invitationToken)}/complete`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  getPublicProduct: (id: number) => request<Product>(`/public/products/${id}`),
  createProduct: (input: Pick<Product, "name" | "description" | "img">, token: string) =>
    request<Product>("/products", { method: "POST", body: JSON.stringify(input) }, token),
  createTicket: (
    input: {
      client_id: number;
      seller_id: number;
      cobrador_id: number | null;
      ticket_products: { product_id: number; value: number; quotas: number }[];
    },
    token: string,
  ) => request<Ticket>("/tickets", { method: "POST", body: JSON.stringify(input) }, token),
  uploadProductImage: (file: File, token: string) => {
  const body = new FormData();
  body.append("image", file);

  return request<{ url: string }>(
    "/products/image",
    { method: "POST", body },
    token,
  );
},
};
