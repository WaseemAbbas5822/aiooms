"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AdminOverview,
  AdminVendor,
  getAdminOverview,
  getMe,
  listAdminVendors,
  logout,
  setVendorActive,
} from "@/lib/api";

const channelStyle: Record<string, string> = {
  shop: "bg-emerald-500/15 text-emerald-300",
  facebook: "bg-blue-500/15 text-blue-300",
  instagram: "bg-fuchsia-500/15 text-fuchsia-300",
};

const statusStyle: Record<string, string> = {
  Pending: "bg-amber-500/15 text-amber-300",
  Confirmed: "bg-sky-500/15 text-sky-300",
  Dispatched: "bg-indigo-500/15 text-indigo-300",
  Delivered: "bg-emerald-500/15 text-emerald-300",
  Returned: "bg-orange-500/15 text-orange-300",
  Cancelled: "bg-rose-500/15 text-rose-300",
};

function Card({
  label,
  value,
  note,
  accent = "text-white",
}: {
  label: string;
  value: string | number;
  note?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition hover:bg-white/10">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${accent}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [vendors, setVendors] = useState<AdminVendor[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const handleError = useCallback(
    (err: unknown) => {
      const msg = (err as Error).message;
      if (msg === "UNAUTHORIZED") router.replace("/login");
      else setError(msg);
    },
    [router]
  );

  const load = useCallback(
    async (q: string) => {
      try {
        const [o, v] = await Promise.all([getAdminOverview(), listAdminVendors(q)]);
        setOverview(o);
        setVendors(v);
        setError("");
      } catch (err) {
        handleError(err);
      }
    },
    [handleError]
  );

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.replace("/login");
      return;
    }
    getMe()
      .then((me) => {
        if (me.role !== "admin") {
          router.replace("/dashboard");
          return;
        }
        setReady(true);
        load("");
      })
      .catch(handleError);
  }, [router, load, handleError]);

  async function toggle(v: AdminVendor) {
    const action = v.is_active ? "Suspend" : "Reactivate";
    if (!confirm(`${action} ${v.shop_name}?`)) return;
    try {
      await setVendorActive(v.id, !v.is_active);
      await load(search);
    } catch (err) {
      handleError(err);
    }
  }

  if (!ready)
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-500">Loading...</div>;

  const o = overview;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(900px_400px_at_80%_-10%,rgba(99,102,241,0.25),transparent),radial-gradient(700px_350px_at_0%_0%,rgba(217,70,239,0.15),transparent)]" />

      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-lg font-black text-white">A</span>
            <div>
              <p className="text-lg font-extrabold leading-none tracking-tight text-white">AIOOMS</p>
              <p className="text-[11px] font-bold uppercase tracking-widest text-fuchsia-400">Platform admin</p>
            </div>
          </div>
          <button
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm hover:bg-white/20 hover:shadow-none"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl p-6 lg:p-10">
        <h1 className="text-3xl text-white">Platform overview</h1>
        <p className="mb-8 mt-1 text-slate-400">All shops and sellers on AIOOMS (counts only, no message text)</p>

        {error && <p className="mb-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}

        {o && (
          <section className="mb-10 space-y-8">
            <div>
              <h2 className="mb-3 text-sm uppercase tracking-widest text-slate-400">Vendors</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                <Card label="Total vendors" value={o.vendors.total} accent="text-indigo-300" />
                <Card label="Active" value={o.vendors.active} accent="text-emerald-300" />
                <Card label="Suspended" value={o.vendors.suspended} accent="text-rose-300" />
                <Card label="New today" value={o.vendors.new_today} />
                <Card label="New, 7 days" value={o.vendors.new_7_days} />
                <Card label="New, 30 days" value={o.vendors.new_30_days} />
              </div>
            </div>

            <div>
              <h2 className="mb-3 text-sm uppercase tracking-widest text-slate-400">Platform totals</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                <Card label="Products" value={o.totals.products} />
                <Card label="Orders" value={o.totals.orders} accent="text-sky-300" />
                <Card label="Incoming messages" value={o.totals.messages} accent="text-fuchsia-300" />
                <Card label="Sales (PKR)" value={o.totals.sales.toLocaleString()} note="Excludes cancelled and returned" accent="text-emerald-300" />
                <Card label="Low-stock items" value={o.low_stock_items} accent={o.low_stock_items > 0 ? "text-amber-300" : "text-white"} />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h2 className="mb-3 text-sm uppercase tracking-widest text-slate-400">Orders by status</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(o.orders_by_status).map(([status, n]) => (
                    <span key={status} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${statusStyle[status] ?? "bg-white/10 text-slate-300"}`}>
                      {status} <b className="ml-1">{n}</b>
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h2 className="mb-3 text-sm uppercase tracking-widest text-slate-400">Messages per channel</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(o.messages_by_channel).map(([channel, n]) => (
                    <span key={channel} className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize ${channelStyle[channel] ?? "bg-white/10 text-slate-300"}`}>
                      {channel} <b className="ml-1">{n}</b>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl text-white">Shops and sellers ({vendors.length})</h2>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              load(search);
            }}
          >
            <input
              className="w-64 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500"
              placeholder="Search by name, email or shop"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="rounded-xl px-5 text-sm">Search</button>
          </form>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
          <table className="[&_td]:border-white/5 [&_td]:text-slate-300 [&_th]:border-white/10 [&_th]:text-slate-400">
            <thead>
              <tr>
                <th>Shop</th>
                <th>Owner email</th>
                <th>Joined</th>
                <th>Products</th>
                <th>Orders</th>
                <th>Messages</th>
                <th>Sales (PKR)</th>
                <th>Facebook</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="hover:[&>td]:bg-white/5">
                  <td>
                    <p className="font-bold text-white">{v.shop_name}</p>
                    <Link href={`/business/${v.shop_slug}`} className="text-xs text-indigo-300 hover:text-indigo-200">
                      /business/{v.shop_slug}
                    </Link>
                  </td>
                  <td>{v.email}</td>
                  <td>{v.joined ? new Date(v.joined).toLocaleDateString() : "-"}</td>
                  <td>{v.products}</td>
                  <td>{v.orders}</td>
                  <td>{v.messages}</td>
                  <td className="font-semibold text-emerald-300">{v.sales.toLocaleString()}</td>
                  <td>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${v.facebook_connected ? "bg-blue-500/15 text-blue-300" : "bg-white/10 text-slate-500"}`}>
                      {v.facebook_connected ? "Connected" : "No"}
                    </span>
                  </td>
                  <td>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${v.is_active ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                      {v.is_active ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`rounded-lg px-3 py-1.5 text-xs hover:shadow-none ${v.is_active ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600"}`}
                      onClick={() => toggle(v)}
                    >
                      {v.is_active ? "Suspend" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {vendors.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No shops found.</p>}
        </div>
      </main>
    </div>
  );
}