"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
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

const avatarColors = ["from-indigo-500 to-violet-500", "from-sky-500 to-cyan-400", "from-emerald-500 to-teal-400", "from-rose-500 to-orange-400", "from-fuchsia-500 to-pink-400"];

type Thread = { key: string; name: string; channel: string; msgs: InboxMessage[]; last: InboxMessage };

function Avatar({ name, size = "h-12 w-12" }: { name: string; size?: string }) {
  return (
    <div className={`${size} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarColors[name.length % avatarColors.length]} font-bold text-white shadow`}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function InboxPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"chats" | "orders">("chats");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [orderFor, setOrderFor] = useState<number | null>(null);
  const [variantId, setVariantId] = useState(0);
  const [qty, setQty] = useState(1);
  const [showDemo, setShowDemo] = useState(false);
  const [sim, setSim] = useState({ customer_name: "", channel: "facebook", text: "", product_id: 0 });
  const boxRef = useRef<HTMLDivElement>(null);

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
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
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

  const threads = useMemo(() => {
    const map = new Map<string, Thread>();
    [...messages].sort((a, b) => a.id - b.id).forEach((m) => {
      const key = `${m.channel}|${m.customer_name}`;
      let t = map.get(key);
      if (!t) {
        t = { key, name: m.customer_name, channel: m.channel, msgs: [], last: m };
        map.set(key, t);
      }
      t.msgs.push(m);
      t.last = m;
    });
    return Array.from(map.values()).sort((a, b) => b.last.id - a.last.id);
  }, [messages]);

  useEffect(() => {
    if (selectedKey === null && threads.length > 0 && typeof window !== "undefined" && window.innerWidth >= 768) {
      setSelectedKey(threads[0].key);
    }
  }, [threads, selectedKey]);

  const current = threads.find((t) => t.key === selectedKey) ?? null;
  const shownThreads = threads.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
  const lastIncoming = current ? [...current.msgs].reverse().find((m) => m.direction === "in") : undefined;

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [selectedKey, current?.msgs.length]);

  function sendReply() {
    const t = draft.trim();
    if (!t || !lastIncoming) return;
    act(async () => {
      await replyMessage(lastIncoming.id, t);
      setDraft("");
    });
  }

  const incoming = messages.filter((m) => m.direction === "in").length;
  const pending = orders.filter((o) => o.status === "Pending").length;
  const field = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

  const stats = [
    { label: "Customer messages", value: incoming, grad: "from-indigo-500 to-violet-500" },
    { label: "Total orders", value: orders.length, grad: "from-sky-500 to-cyan-400" },
    { label: "Pending orders", value: pending, grad: "from-amber-500 to-orange-400" },
  ];

  const tabBtn = (active: boolean) =>
    `rounded-full px-5 py-2 text-sm font-semibold hover:shadow-none ${
      active ? "" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    }`;

  return (
    <Shell title="Inbox & Orders" subtitle="Every customer gets their own chat">
      {error && <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-2xl bg-gradient-to-br ${s.grad} p-4 text-white shadow-lg shadow-indigo-500/10`}>
            <p className="text-sm text-white/80">{s.label}</p>
            <p className="text-3xl font-extrabold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button className={tabBtn(tab === "chats")} onClick={() => setTab("chats")}>💬 Chats ({threads.length})</button>
          <button className={tabBtn(tab === "orders")} onClick={() => setTab("orders")}>🧾 Orders ({orders.length})</button>
        </div>
        <button
          className="rounded-full border-indigo-300 bg-indigo-50 px-4 py-2 text-sm text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 hover:shadow-none"
          onClick={() => setShowDemo(!showDemo)}
        >
          {showDemo ? "Close demo" : "＋ Simulate message"}
        </button>
      </div>

      {showDemo && (
        <form
          className="mb-4 space-y-3 rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/60 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            act(async () => {
              await simulateMessage({ ...sim, product_id: sim.product_id || null });
              setSim({ ...sim, text: "" });
              setSelectedKey(`${sim.channel}|${sim.customer_name}`);
              setTab("chats");
            });
          }}
        >
          <p className="font-bold text-indigo-700">Demo: simulate a Facebook / Instagram message</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <input className={field} placeholder="Customer name" value={sim.customer_name}
              onChange={(e) => setSim({ ...sim, customer_name: e.target.value })} required />
            <select className={field} value={sim.channel} onChange={(e) => setSim({ ...sim, channel: e.target.value })}>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
            </select>
            <select className={field} value={sim.product_id} onChange={(e) => setSim({ ...sim, product_id: Number(e.target.value) })}>
              <option value={0}>No product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <input className={`${field} w-full`} placeholder="Message, e.g. medium available hai? kitne ka?"
            value={sim.text} onChange={(e) => setSim({ ...sim, text: e.target.value })} required />
          <button className="rounded-xl px-5 py-2.5 text-sm">Add message</button>
        </form>
      )}

      {tab === "chats" && (
        <div className="flex h-[calc(100vh-20rem)] min-h-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-indigo-500/5">
          <div className={`${selectedKey ? "hidden md:flex" : "flex"} w-full flex-col border-r border-slate-200 md:w-80 md:shrink-0`}>
            <div className="border-b border-slate-100 p-3">
              <input className={`${field} w-full rounded-full bg-slate-50`} placeholder="🔍 Search chats"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex-1 overflow-y-auto">
              {shownThreads.length === 0 && (
                <p className="p-8 text-center text-sm text-slate-400">No chats yet. Customer messages will appear here.</p>
              )}
              {shownThreads.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setSelectedKey(t.key)}
                  className={`flex w-full items-center gap-3 rounded-none border-0 border-b border-slate-100 px-4 py-3 text-left font-normal hover:translate-y-0 hover:shadow-none ${
                    t.key === selectedKey ? "bg-indigo-50 text-slate-900 hover:bg-indigo-50" : "bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <Avatar name={t.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-bold">{t.name}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${channelStyle[t.channel] ?? "bg-slate-100 text-slate-600"}`}>{t.channel}</span>
                    </div>
                    <p className="truncate text-sm text-slate-500">
                      {t.last.direction === "out" ? "You: " : ""}{t.last.text}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className={`${selectedKey ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-slate-50`}>
            {!current ? (
              <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
                <p className="text-6xl">💬</p>
                <p className="mt-3">Select a chat to start replying</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
                  <button
                    className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 hover:bg-slate-200 hover:shadow-none md:hidden"
                    onClick={() => setSelectedKey(null)}
                  >
                    ←
                  </button>
                  <Avatar name={current.name} size="h-10 w-10" />
                  <div>
                    <p className="font-bold text-slate-900">{current.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${channelStyle[current.channel] ?? "bg-slate-100 text-slate-600"}`}>{current.channel}</span>
                  </div>
                </div>

                <div ref={boxRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                  {current.msgs.map((m) => {
                    const out = m.direction === "out";
                    return (
                      <div key={m.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] ${out ? "items-end" : "items-start"} flex flex-col`}>
                          {m.product && (
                            <span className="mb-1 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 shadow-sm">
                              🛍 {m.product.title}
                            </span>
                          )}
                          <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                            out ? "rounded-br-sm bg-gradient-to-br from-indigo-600 to-violet-600 text-white" : "rounded-bl-sm bg-white text-slate-800"
                          }`}>
                            {m.text}
                          </div>
                          {!out && m.product && (
                            <button
                              className="mt-1 rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-200 hover:text-emerald-800 hover:shadow-none"
                              onClick={() => {
                                setOrderFor(orderFor === m.id ? null : m.id);
                                setVariantId(m.product!.variants[0]?.id ?? 0);
                                setQty(1);
                              }}
                            >
                              🧾 Make order
                            </button>
                          )}
                          {orderFor === m.id && m.product && (
                            <div className="mt-2 flex flex-wrap gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                              <select className={`${field} min-w-0 flex-1`} value={variantId}
                                onChange={(e) => setVariantId(Number(e.target.value))}>
                                {m.product.variants.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.size || "-"} / {v.colour || "-"} ({v.stock} in stock)
                                  </option>
                                ))}
                              </select>
                              <input className={`${field} w-20`} type="number" min={1} value={qty}
                                onChange={(e) => setQty(Number(e.target.value))} />
                              <button className="rounded-xl bg-emerald-600 px-4 text-sm hover:bg-emerald-700"
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
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2 border-t border-slate-200 bg-white p-3">
                  <input
                    className={`${field} min-w-0 flex-1 rounded-full`}
                    placeholder={lastIncoming ? `Reply to ${current.name}...` : "No customer message to reply to"}
                    value={draft}
                    disabled={!lastIncoming}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
                  />
                  <button className="rounded-full px-6" disabled={!lastIncoming || !draft.trim()} onClick={sendReply}>Send ➤</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "orders" && (
        <div>
          {orders.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-sm">
              <p className="text-4xl">🛍</p>
              <p className="mt-2">No orders yet. Open a chat and use "Make order".</p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orders.map((o) => (
              <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">{o.customer_name}</p>
                    <p className="truncate text-sm text-slate-500">{o.product_title}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[o.status] ?? "bg-slate-100 text-slate-600"}`}>{o.status}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{o.variant_label} × {o.quantity}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-lg font-extrabold text-indigo-600">PKR {o.total}</p>
                  <select className={`${field} py-1.5`} value={o.status}
                    onChange={(e) => act(() => setOrderStatus(o.id, e.target.value))}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}