"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardSummary, getDashboardSummary } from "@/lib/api";

const channelBadge: Record<string, string> = {
  shop: "bg-green-100 text-green-700",
  facebook: "bg-blue-100 text-blue-700",
  instagram: "bg-pink-100 text-pink-700",
};

function Card({
  label,
  value,
  note,
  warn,
}: {
  label: string;
  value: string | number;
  note?: string;
  warn?: boolean;
}) {
  return (
    <div className={`rounded border p-3 ${warn ? "border-red-300 bg-red-50" : ""}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {note && <p className="text-xs text-gray-500">{note}</p>}
    </div>
  );
}

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

  if (error) return <p className="mb-6 text-sm text-red-600">{error}</p>;
  if (!data) return <p className="mb-6 text-sm text-gray-500">Loading summary...</p>;

  const d = data.daily;

  return (
    <section className="mb-8 space-y-6">
      <div>
        <h2 className="mb-2 text-lg font-semibold">Today ({d.date})</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card label="Orders today" value={d.orders_today} />
          <Card label="Sales today (PKR)" value={d.sales_today.toLocaleString()} />
          <Card
            label="Cash to collect (PKR)"
            value={d.cod_to_collect.toLocaleString()}
            note="Pending, confirmed and dispatched orders"
          />
          <Card label="Low-stock items" value={d.low_stock_count} warn={d.low_stock_count > 0} />
        </div>
      </div>

      {data.low_stock_items.length > 0 && (
        <div className="rounded border border-red-300 bg-red-50 p-3">
          <p className="mb-1 text-sm font-semibold text-red-700">Running low</p>
          <ul className="text-sm text-red-700">
            {data.low_stock_items.map((i, idx) => (
              <li key={idx}>
                {i.title}: {i.size || "-"} / {i.colour || "-"} has {i.stock} left
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-2 text-lg font-semibold">Orders by status</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.orders_by_status).map(([status, n]) => (
              <span key={status} className="rounded border px-3 py-1 text-sm">
                {status}: <b>{n}</b>
              </span>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-lg font-semibold">Messages per channel</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.messages_by_channel).map(([channel, n]) => (
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

      <div>
        <h2 className="mb-2 text-lg font-semibold">Enquiries and orders per product</h2>
        {data.products_performance.length === 0 ? (
          <p className="text-sm text-gray-500">No enquiries or orders yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-600">
                <th className="py-1">Product</th>
                <th className="py-1">Enquiries</th>
                <th className="py-1">Orders</th>
              </tr>
            </thead>
            <tbody>
              {data.products_performance.map((r) => (
                <tr key={r.title} className="border-b">
                  <td className="py-1">{r.title}</td>
                  <td className="py-1">{r.enquiries}</td>
                  <td className="py-1">{r.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
