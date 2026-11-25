"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { registerVendor } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", shop_name: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await registerVendor(form);
      router.push("/login");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const field = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3";

  return (
    <AuthShell
      title="Create your shop 🚀"
      subtitle="Get your own shop link in less than a minute."
      footer={<>Already have an account? <Link href="/login" className="font-bold">Login</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-semibold text-slate-700">
          Your name
          <input className={`${field} mt-1 font-normal`} placeholder="e.g. Naseem Khan" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Email
          <input className={`${field} mt-1 font-normal`} type="email" placeholder="you@example.com" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Password
          <input className={`${field} mt-1 font-normal`} type="password" placeholder="Minimum 6 characters" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Shop name
          <input className={`${field} mt-1 font-normal`} placeholder="e.g. NaseemMart" value={form.shop_name}
            onChange={(e) => setForm({ ...form, shop_name: e.target.value })} required />
        </label>
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl py-3 text-base">{busy ? "Creating..." : "Create my shop"}</button>
      </form>
    </AuthShell>
  );
}