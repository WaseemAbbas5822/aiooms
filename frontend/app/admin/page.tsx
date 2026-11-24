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

const channelBadge: Record<string, string> = {
  shop: "bg-green-100 text-green-700",
  facebook: "bg-blue-100 text-blue-700",
  instagram: "bg-pink-100 text-pink-700",
};

function Card({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded border p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {note && <p className="text-xs text-gray-500">{note}</p>}
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

  if (!ready) return <p className="p-6 text-sm text-gray-500">Loading...</p>;

  const o = overview;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform admin</h1>
          <p className="text-sm text-gray-500">All shops and sellers on AIOOMS (counts only, no message text)</p>
        </div>
        <button
          className="rounded border px-3 py-1 text-sm"
          onClick={() => {
            logout();
            router.replace("/login");
          }}
        >
          Logout
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {o && (
        <section className="mb-8 space-y-6">
          <div>
            <h2 className="mb-2 text-lg font-semibold">Vendors</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              <Card label="Total vendors" value={o.vendors.total} />
              <Card label="Active" value={o.vendors.active} />
              <Card label="Suspended" value={o.vendors.suspended} />
              <Card label="New today" value={o.vendors.new_today} />
              <Card label="New, 7 days" value={o.vendors.new_7_days} />
              <Card label="New, 30 days" value={o.vendors.new_30_days} />
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold">Platform totals</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Card label="Products" value={o.totals.products} />
              <Card label="Orders" value={o.totals.orders} />
              <Card label="Incoming messages" value={o.totals.messages} />
              <Card label="Sales (PKR)" value={o.totals.sales.toLocaleString()} note="Excludes cancelled and returned" />
              <Card label="Low-stock items" value={o.low_stock_items} />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="mb-2 text-lg font-semibold">Orders by status</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(o.orders_by_status).map(([status, n]) => (
                  <span key={status} className="rounded border px-3 py-1 text-sm">
                    {status}: <b>{n}</b>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold">Messages per channel</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(o.messages_by_channel).map(([channel, n]) => (
                  <span
                    key={channel}
                    className={`rounded px-3 py-1 text-sm ${channelBadge[channel] ?? "bg-gray-100"}`}
                  >
                    {channel}: <b>{n}</b>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <h2 className="mb-2 text-lg font-semibold">Shops and sellers ({vendors.length})</h2>
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          load(search);
        }}
      >
        <input
          className="w-full max-w-sm rounded border border-gray-300 p-2 text-sm"
          placeholder="Search by name, email or shop"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="rounded border px-3 py-1 text-sm">Search</button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-600">
              <th className="py-2 pr-3">Shop</th>
              <th className="py-2 pr-3">Owner email</th>
              <th className="py-2 pr-3">Joined</th>
              <th className="py-2 pr-3">Products</th>
              <th className="py-2 pr-3">Orders</th>
              <th className="py-2 pr-3">Messages</th>
              <th className="py-2 pr-3">Sales (PKR)</th>
              <th className="py-2 pr-3">Facebook</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id} className="border-b">
                <td className="py-2 pr-3">
                  <p className="font-medium">{v.shop_name}</p>
                  <Link href={`/business/${v.shop_slug}`} className="text-xs underline">
                    /business/{v.shop_slug}
                  </Link>
                </td>
                <td className="py-2 pr-3">{v.email}</td>
                <td className="py-2 pr-3">{v.joined ? new Date(v.joined).toLocaleDateString() : "-"}</td>
                <td className="py-2 pr-3">{v.products}</td>
                <td className="py-2 pr-3">{v.orders}</td>
                <td className="py-2 pr-3">{v.messages}</td>
                <td className="py-2 pr-3">{v.sales.toLocaleString()}</td>
                <td className="py-2 pr-3">{v.facebook_connected ? "Connected" : "No"}</td>
                <td className="py-2 pr-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      v.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {v.is_active ? "Active" : "Suspended"}
                  </span>
                </td>
                <td className="py-2">
                  <button className="rounded border px-2 py-1 text-xs" onClick={() => toggle(v)}>
                    {v.is_active ? "Suspend" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {vendors.length === 0 && <p className="mt-3 text-sm text-gray-500">No shops found.</p>}
      </div>
    </main>
  );
}
