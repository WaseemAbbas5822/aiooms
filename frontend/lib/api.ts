export const API_URL = "http://127.0.0.1:8000";

export type Variant = { id?: number; size: string; colour: string; stock: number };
export type Product = {
  id: number;
  title: string;
  description: string;
  price: number;
  image_url: string;
  low_stock_level: number;
  variants: Variant[];
  low_stock: boolean;
};
export type ProductInput = Omit<Product, "id" | "low_stock">;

export async function registerVendor(data: {
  name: string;
  email: string;
  password: string;
  shop_name: string;
}) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.detail || "Registration failed");
  return body;
}

export async function loginVendor(email: string, password: string) {
  const form = new URLSearchParams();
  form.set("username", email);
  form.set("password", password);
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.detail || "Login failed");
  localStorage.setItem("token", body.access_token);
  return body;
}

export function logout() {
  localStorage.removeItem("token");
}

async function authFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token") || "";
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.status === 401) {
    localStorage.removeItem("token");
    throw new Error("UNAUTHORIZED");
  }
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(typeof b.detail === "string" ? b.detail : "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

export const getMe = () => authFetch("/auth/me");
export const listProducts = (): Promise<Product[]> => authFetch("/products");
export const createProduct = (d: ProductInput) =>
  authFetch("/products", { method: "POST", body: JSON.stringify(d) });
export const updateProduct = (id: number, d: ProductInput) =>
  authFetch(`/products/${id}`, { method: "PUT", body: JSON.stringify(d) });
export const deleteProduct = (id: number) =>
  authFetch(`/products/${id}`, { method: "DELETE" });


export type InboxMessage = {
  id: number;
  customer_name: string;
  customer_contact: string;
  channel: string;
  direction: string;
  text: string;
  created_at: string | null;
  product: {
    id: number;
    title: string;
    variants: { id: number; size: string; colour: string; stock: number }[];
  } | null;
};
export type Order = {
  id: number;
  customer_name: string;
  product_title: string;
  variant_label: string;
  quantity: number;
  unit_price: number;
  total: number;
  status: string;
};

export const listMessages = (): Promise<InboxMessage[]> => authFetch("/messages");
export const replyMessage = (id: number, text: string) =>
  authFetch(`/messages/${id}/reply`, { method: "POST", body: JSON.stringify({ text }) });
export const simulateMessage = (d: {
  customer_name: string;
  channel: string;
  text: string;
  product_id: number | null;
}) => authFetch("/messages/simulate", { method: "POST", body: JSON.stringify(d) });
export const listOrders = (): Promise<Order[]> => authFetch("/orders");
export const createOrder = (d: { message_id: number; variant_id: number; quantity: number }) =>
  authFetch("/orders", { method: "POST", body: JSON.stringify(d) });
export const setOrderStatus = (id: number, status: string) =>
  authFetch(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });

export type DashboardSummary = {
  shop_name: string;
  shop_link: string;
  totals: { products: number; orders: number; messages: number };
  products: { id: number; title: string; total_stock: number; variant_count: number }[];
  low_stock_items: {
    product_id: number;
    title: string;
    size: string;
    colour: string;
    stock: number;
    low_stock_level: number;
  }[];
  orders_by_status: Record<string, number>;
  messages_by_channel: Record<string, number>;
  products_performance: { title: string; enquiries: number; orders: number }[];
  daily: {
    date: string;
    orders_today: number;
    sales_today: number;
    cod_to_collect: number;
    low_stock_count: number;
  };
};

export const getDashboardSummary = (): Promise<DashboardSummary> =>
  authFetch("/dashboard/summary");
