"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerVendor } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", shop_name: "" });
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await registerVendor(form);
      router.push("/login");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const field = "w-full rounded border border-gray-300 p-2";

  return (
    <main className="mx-auto mt-16 max-w-sm p-4">
      <h1 className="mb-4 text-2xl font-bold">Create your shop</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className={field} placeholder="Your name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className={field} type="email" placeholder="Email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className={field} type="password" placeholder="Password (min 6)" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
        <input className={field} placeholder="Shop name" value={form.shop_name}
          onChange={(e) => setForm({ ...form, shop_name: e.target.value })} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-black p-2 text-white">Register</button>
      </form>
      <p className="mt-4 text-sm">
        Already have an account? <Link href="/login" className="underline">Login</Link>
      </p>
    </main>
  );
}