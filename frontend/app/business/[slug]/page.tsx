"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_URL } from "@/lib/api";

type PublicProduct = {
  id: number;
  title: string;
  description: string;
  price: number;
  image_url: string;
  variants: { id: number; size: string; colour: string }[];
};
type Shop = { shop_name: string; shop_slug: string; products: PublicProduct[] };

const grads = ["from-indigo-500 to-violet-500", "from-sky-500 to-cyan-400", "from-emerald-500 to-teal-400", "from-rose-500 to-orange-400", "from-fuchsia-500 to-pink-400"];

export default function ShopPage() {
  const { slug } = useParams<{ slug: string }>();
  const [shop, setShop] = useState<Shop | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [ok, setOk] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/shops/${slug}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        setShop(await res.json());
      })
      .catch(() => setStatus("Could not reach the server."));
  }, [slug]);

  useEffect(() => {
    if (!status || !ok) return;
    const t = setTimeout(() => setStatus(""), 4000);
    return () => clearTimeout(t);
  }, [status, ok]);

  async function send(e: React.FormEvent, productId: number) {
    e.preventDefault();
    setStatus("");
    const res = await fetch(`${API_URL}/shops/${slug}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: name,
        customer_contact: contact,
        text,
        product_id: productId,
      }),
    });
    if (res.ok) {
      setOk(true);
      setStatus("Message sent. The seller will reply soon.");
      setText("");
      setOpenId(null);
    } else {
      setOk(false);
      setStatus("Could not send the message. Please try again.");
    }
  }

  if (notFound)
    return (
      <main className="flex min-h-screen flex-col items-center justify-center text-center">
        <p className="text-6xl">🛍️</p>
        <h1 className="mt-4 text-2xl text-slate-900">Shop not found</h1>
        <p className="mt-1 text-slate-500">Please check the link and try again.</p>
      </main>
    );
  if (!shop)
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-400">
        {status || "Loading shop..."}
      </main>
    );

  const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";
  const list = shop.products.filter((p) => p.title.toLowerCase().includes(q.toLowerCase()));
  const openProduct = shop.products.find((p) => p.id === openId);

  return (
    <div className="min-h-screen">
      <header className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 px-6 pb-16 pt-12 text-white">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-fuchsia-400/20" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white text-4xl font-black text-indigo-600 shadow-xl">
            {shop.shop_name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h1 className="text-4xl text-white">{shop.shop_name}</h1>
            <p className="mt-1 text-indigo-100">Browse products and message the seller directly.</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white/20 px-3 py-1">💬 Chat with seller</span>
              <span className="rounded-full bg-white/20 px-3 py-1">📦 {shop.products.length} products</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto -mt-8 max-w-5xl px-6 pb-16">
        <div className="mb-8 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-indigo-500/10">
          <span className="pl-2 text-lg">🔍</span>
          <input
            className="w-full border-0 bg-transparent px-1 py-2 shadow-none focus:shadow-none"
            placeholder="Search products..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {shop.products.length === 0 && (
          <p className="py-16 text-center text-slate-400">No products yet. Please check back soon.</p>
        )}
        {shop.products.length > 0 && list.length === 0 && (
          <p className="py-16 text-center text-slate-400">No product matches "{q}".</p>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <div key={p.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-indigo-500/20">
              <div className="relative h-56 overflow-hidden">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={p.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                ) : (
                  <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${grads[p.title.length % grads.length]} text-7xl font-black text-white/70`}>
                    {p.title.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-sm font-extrabold text-indigo-600 shadow">
                  PKR {p.price.toLocaleString()}
                </span>
                {p.variants.length === 0 && (
                  <span className="absolute left-3 top-3 rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white">Out of stock</span>
                )}
              </div>
              <div className="p-5">
                <p className="text-lg font-bold text-slate-900">{p.title}</p>
                {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description}</p>}
                {p.variants.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.variants.map((v) => (
                      <span key={v.id} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        {v.size || "-"} / {v.colour || "-"}
                      </span>
                    ))}
                  </div>
                )}
                <button className="mt-4 w-full rounded-xl py-3 text-sm" onClick={() => setOpenId(p.id)}>
                  💬 Message seller
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-16 text-center text-xs text-slate-400">Powered by AIOOMS</p>
      </main>

      {openProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 backdrop-blur-sm sm:items-center" onClick={() => setOpenId(null)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => send(e, openProduct.id)}
            className="w-full max-w-md space-y-3 rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Message seller</p>
                <p className="text-xl font-extrabold text-slate-900">{openProduct.title}</p>
              </div>
              <button type="button" onClick={() => setOpenId(null)}
                className="h-9 w-9 rounded-full bg-slate-100 p-0 text-slate-500 hover:bg-slate-200 hover:shadow-none">✕</button>
            </div>
            <input className={field} placeholder="Your name" value={name}
              onChange={(e) => setName(e.target.value)} required />
            <input className={field} placeholder="Phone or email (optional)" value={contact}
              onChange={(e) => setContact(e.target.value)} />
            <textarea className={field} rows={3} placeholder="e.g. Is medium available? Price kitne ka hai?"
              value={text} onChange={(e) => setText(e.target.value)} required />
            <button className="w-full rounded-xl py-3">Send message</button>
          </form>
        </div>
      )}

      {status && (
        <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-xl ${ok ? "bg-emerald-600" : "bg-rose-600"}`}>
          {ok ? "✓ " : ""}{status}
        </div>
      )}
    </div>
  );
}