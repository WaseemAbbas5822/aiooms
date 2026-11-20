export const API_URL = "http://127.0.0.1:8000";

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