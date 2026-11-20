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