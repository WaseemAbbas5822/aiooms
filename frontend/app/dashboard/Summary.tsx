"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardSummary, getDashboardSummary } from "@/lib/api";

const channelStyle: Record<string, string> = {
  shop: "bg-emerald-500/10 text-emerald-600",
  facebook: "bg-[#1877F2]/10 text-[#1877F2]",
  instagram: "bg-gradient-to-r from-fuchsia-500 to-orange-400 text-white",
};

const statusStyle: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Confirmed: "bg-sky-100 text-sky-700",
  Dispatched: "bg-indigo-100 text-indigo-700",
  Delivered: "bg-emerald-100 text-emerald-700",
  Returned: "bg-orange-100 text-orange-700",
  Cancelled: "bg-rose-100 text-rose-700",
};

export default function Summary({ refreshKey }: { refreshKey?: unknown }) {
  const router = useRouter();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboardSummary()
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((err: Error) => {
        if (err.message === "UNAUTHORIZED") router.replace("/login");
        else setError(err.message);
      });
  }, [refreshKey, router]);

  if (error) return <p className="mb-6 rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</p>;
  if (!data) return <p className="mb-6 text-sm text-slate-400">Loading summary...</p>;

  const d = data.daily;
  const maxEnq = Math.max(1, ...data.products_performance.map((r) => r.enquiries));

  const cards = [
    { label: "Orders today", value: d.orders_today, note: "", grad: "from-indigo-500 to-violet-500", icon: "🛒" },
    { label: "Sales today (PKR)", value: d.sales_today.toLocaleString(), note: "", grad: "from-emerald-500 to-teal-400", icon: "💰" },
    { label: "Cash to collect (PKR)", value: d.cod_to_collect.toLocaleString(), note: "Pending, confirmed and dispatched", grad: "from-amber-500 to-orange-400", icon: "💵" },
    {
      label: "Low-stock items",
      value: d.low_stock_count,
      note: d.low_stock_count > 0 ? "Restock soon" : "All good",
      grad: d.low_stock_count > 0 ? "from-rose-500 to-pink-500" : "from-slate-500 to-slate-400",
      icon: "⚠️",
    },
  ];

  return (
    <section className="mb-10 space-y-8">
      <div>
        <h2 className="mb-3 text-lg text-slate-900">Today <span className="font-normal text-slate-400">({d.date})</span></h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.grad} p-5 text-white shadow-lg shadow-indigo-500/10`}>
              <span className="absolute -right-2 -top-2 text-6xl opacity-20">{c.icon}</span>
              <p className="text-sm text-white/80">{c.label}</p>
              <p className="mt-1 text-3xl font-extrabold">{c.value}</p>
              {c.note && <p className="mt-1 text-xs text-white/80">{c.note}</p>}
            </div>
          ))}
        </div>
      </div>

      {data.low_stock_items.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="mb-2 font-bold text-rose-700">⚠️ Running low</p>
          <ul className="space-y-1 text-sm text-rose-700">
            {data.low_stock_items.map((i, idx) => (
              <li key={idx}>
                <b>{i.title}</b>: {i.size || "-"} / {i.colour || "-"} has only {i.stock} left
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base text-slate-900">Orders by status</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.orders_by_status).map(([status, n]) => (
              <span key={status} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${statusStyle[status] ?? "bg-slate-100 text-slate-600"}`}>
                {status} <b className="ml-1">{n}</b>
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base text-slate-900">Messages per channel</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.messages_by_channel).map(([channel, n]) => (
              <span key={channel} className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize ${channelStyle[channel] ?? "bg-slate-100 text-slate-600"}`}>
                {channel} <b className="ml-1">{n}</b>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base text-slate-900">Enquiries and orders per product</h2>
        {data.products_performance.length === 0 ? (
          <p className="text-sm text-slate-400">No enquiries or orders yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Enquiries</th>
                <th>Orders</th>
              </tr>
            </thead>
            <tbody>
              {data.products_performance.map((r) => (
                <tr key={r.title}>
                  <td className="font-semibold text-slate-800">{r.title}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${(r.enquiries / maxEnq) * 100}%` }} />
                      </div>
                      <span className="text-sm">{r.enquiries}</span>
                    </div>
                  </td>
                  <td><span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-sm font-bold text-emerald-700">{r.orders}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}