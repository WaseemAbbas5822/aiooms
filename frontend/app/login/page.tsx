"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { loginVendor } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await loginVendor(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const field = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3";

  return (
    <AuthShell
      title="Welcome back 👋"
      subtitle="Log in to manage your shop and orders."
      footer={<>New vendor? <Link href="/register" className="font-bold">Create a shop</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-semibold text-slate-700">
          Email
          <input className={`${field} mt-1 font-normal`} type="email" placeholder="you@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Password
          <input className={`${field} mt-1 font-normal`} type="password" placeholder="Your password" value={password}
            onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl py-3 text-base">{busy ? "Logging in..." : "Login"}</button>
      </form>
    </AuthShell>
  );
}