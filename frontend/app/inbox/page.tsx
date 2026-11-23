"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  InboxMessage,
  Order,
  Product,
  createOrder,
  listMessages,
  listOrders,
  listProducts,
  replyMessage,
  setOrderStatus,
  simulateMessage,
} from "@/lib/api";

const STATUSES = ["Pending", "Confirmed", "Dispatched", "Delivered", "Returned", "Cancelled"];
const badge: Record<string, string> = {
  shop: "bg-green-100 text-green-700",
  facebook: "bg-blue-100 text-blue-700",
  instagram: "bg-pink-100 text-pink-700",
};

export default function InboxPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [orderFor, setOrderFor] = useState<number | null>(null);
  const [variantId, setVariantId] = useState(0);
  const [qty, setQty] = useState(1);
  const [sim, setSim] = useState({ customer_name: "", channel: "facebook", text: "", product_id: 0 });

  const handleError = useCallback(
    (err: unknown) => {
      const msg = (err as Error).message;
      if (msg === "UNAUTHORIZED") router.replace("/login");
      else setError(msg);
    },
    [router]
  );

  const load = useCallback(async () => {
    try {
      const [m, o, p] = await Promise.all([listMessages(), listOrders(), listProducts()]);
      setMessages(m);
      setOrders(o);
      setProducts(p);
    } catch (err) {
      handleError(err);
    }
  }, [handleError]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.replace("/login");
      return;
    }
    load();
  }, [router, load]);

  async function act(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
      await load();
    } catch (err) {
      handleError(err);
    }
  }

  const field = "rounded border border-gray-300 p-2";

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inbox and orders</h1>
        <Link href="/dashboard" className="text-sm underline">Back to dashboard</Link>
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <form
        className="mb-6 space-y-2 rounded border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          act(async () => {
            await simulateMessage({ ...sim, product_id: sim.product_id || null });
            setSim({ ...sim, text: "" });
          });
        }}
      >
        <h2 className="font-semibold">Demo: simulate a Facebook / Instagram message</h2>
        <div className="flex gap-2">
          <input className={`${field} w-1/3`} placeholder="Customer name" value={sim.customer_name}
            onChange={(e) => setSim({ ...sim, customer_name: e.target.value })} required />
          <select className={`${field} w-1/3`} value={sim.channel}
            onChange={(e) => setSim({ ...sim, channel: e.target.value })}>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
          </select>
          <select className={`${field} w-1/3`} value={sim.product_id}
            onChange={(e) => setSim({ ...sim, product_id: Number(e.target.value) })}>
            <option value={0}>No product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
        <input className={`${field} w-full`} placeholder="Message, e.g. medium available hai? kitne ka?"
          value={sim.text} onChange={(e) => setSim({ ...sim, text: e.target.value })} required />
        <button className="rounded border px-3 py-1 text-sm">Add message</button>
      </form>

      <h2 className="mb-2 text-lg font-semibold">Messages ({messages.length})</h2>
      {messages.length === 0 && <p className="mb-4 text-gray-500">No messages yet.</p>}
      <div className="mb-8 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={`rounded border p-3 ${m.direction === "out" ? "bg-gray-50" : ""}`}>
            <div className="flex items-center gap-2 text-sm">
              <span className={`rounded px-2 py-0.5 text-xs ${badge[m.channel] ?? ""}`}>{m.channel}</span>
              <span className="font-medium">
                {m.direction === "out" ? `You to ${m.customer_name}` : m.customer_name}
              </span>
              {m.product && <span className="text-gray-500">about {m.product.title}</span>}
            </div>
            <p className="mt-1">{m.text}</p>

            {m.direction === "in" && (
              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <input className={`${field} flex-1`} placeholder="Reply..." value={replyText[m.id] ?? ""}
                    onChange={(e) => setReplyText({ ...replyText, [m.id]: e.target.value })} />
                  <button className="rounded border px-3 text-sm"
                    onClick={() => {
                      const t = (replyText[m.id] ?? "").trim();
                      if (!t) return;
                      act(async () => {
                        await replyMessage(m.id, t);
                        setReplyText({ ...replyText, [m.id]: "" });
                      });
                    }}>
                    Reply
                  </button>
                  {m.product && (
                    <button className="rounded bg-black px-3 text-sm text-white"
                      onClick={() => {
                        setOrderFor(orderFor === m.id ? null : m.id);
                        setVariantId(m.product!.variants[0]?.id ?? 0);
                        setQty(1);
                      }}>
                      Add to order
                    </button>
                  )}
                </div>

                {orderFor === m.id && m.product && (
                  <div className="flex gap-2 rounded bg-gray-50 p-2">
                    <select className={`${field} flex-1`} value={variantId}
                      onChange={(e) => setVariantId(Number(e.target.value))}>
                      {m.product.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.size || "-"} / {v.colour || "-"} ({v.stock} in stock)
                        </option>
                      ))}
                    </select>
                    <input className={`${field} w-20`} type="number" min={1} value={qty}
                      onChange={(e) => setQty(Number(e.target.value))} />
                    <button className="rounded bg-black px-3 text-sm text-white"
                      onClick={() =>
                        act(async () => {
                          await createOrder({ message_id: m.id, variant_id: variantId, quantity: qty });
                          setOrderFor(null);
                        })
                      }>
                      Create order
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <h2 className="mb-2 text-lg font-semibold">Orders ({orders.length})</h2>
      {orders.length === 0 && <p className="text-gray-500">No orders yet.</p>}
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="flex items-center justify-between rounded border p-3">
            <div>
              <p className="font-medium">{o.customer_name}: {o.product_title}</p>
              <p className="text-sm text-gray-600">
                {o.variant_label} x {o.quantity} = PKR {o.total}
              </p>
            </div>
            <select className={field} value={o.status}
              onChange={(e) => act(() => setOrderStatus(o.id, e.target.value))}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </main>
  );
}