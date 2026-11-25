"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import Summary from "./Summary";
import {
  Product,
  ProductInput,
  Variant,
  createProduct,
  deleteProduct,
  getMe,
  listProducts,
  updateProduct,
} from "@/lib/api";

const emptyForm: ProductInput = {
  title: "",
  description: "",
  price: 0,
  image_url: "",
  low_stock_level: 5,
  variants: [{ size: "", colour: "", stock: 0 }],
};

const grads = ["from-indigo-500 to-violet-500", "from-sky-500 to-cyan-400", "from-emerald-500 to-teal-400", "from-rose-500 to-orange-400", "from-fuchsia-500 to-pink-400"];

export default function DashboardPage() {
  const router = useRouter();
  const [shop, setShop] = useState<{ shop_name: string; shop_slug: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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
      setProducts(await listProducts());
    } catch (err) {
      handleError(err);
    }
  }, [handleError]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      router.replace("/login");
      return;
    }
    getMe()
      .then((me) => {
        if (me.role === "admin") router.replace("/admin");
        else setShop(me);
      })
      .catch(handleError);
    load();
  }, [router, load, handleError]);

  function setVariant(i: number, patch: Partial<Variant>) {
    setForm({
      ...form,
      variants: form.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)),
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const payload: ProductInput = {
      ...form,
      variants: form.variants.map((v) => ({
        size: v.size,
        colour: v.colour,
        stock: Number(v.stock) || 0,
      })),
    };
    try {
      if (editingId) await updateProduct(editingId, payload);
      else await createProduct(payload);
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (err) {
      handleError(err);
    }
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      title: p.title,
      description: p.description,
      price: p.price,
      image_url: p.image_url,
      low_stock_level: p.low_stock_level,
      variants: p.variants.length
        ? p.variants.map((v) => ({ size: v.size, colour: v.colour, stock: v.stock }))
        : [{ size: "", colour: "", stock: 0 }],
    });
    document.getElementById("product-form")?.scrollIntoView({ behavior: "smooth" });
  }

  async function onDelete(id: number) {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct(id);
      await load();
    } catch (err) {
      handleError(err);
    }
  }

  function copyLink() {
    if (!shop) return;
    navigator.clipboard.writeText(`${window.location.origin}/business/${shop.shop_slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const field = "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm";

  return (
    <Shell title={shop?.shop_name ?? "Dashboard"} subtitle="Your shop at a glance">
      {shop && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-500/20">
          <div className="min-w-0">
            <p className="text-sm text-indigo-100">Your shop link. Share it with customers</p>
            <p className="truncate text-lg font-bold">/business/{shop.shop_slug}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={copyLink} className="rounded-xl bg-white/20 px-4 py-2 text-sm hover:bg-white/30">
              {copied ? "Copied ✓" : "Copy link"}
            </button>
            <a href={`/business/${shop.shop_slug}`} target="_blank" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:no-underline hover:shadow-lg">
              Visit shop ↗
            </a>
          </div>
        </div>
      )}

      <Summary refreshKey={products} />

      <form id="product-form" onSubmit={onSubmit} className="mb-10 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg text-slate-900">{editingId ? "✏️ Edit product" : "➕ Add product"}</h2>
          {editingId && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Editing</span>}
        </div>

        <label className="block text-sm font-semibold text-slate-700">
          Product name
          <input className={`${field} mt-1 w-full font-normal`} placeholder="e.g. Lawn Suit"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </label>

        <label className="block text-sm font-semibold text-slate-700">
          Description (optional)
          <textarea className={`${field} mt-1 w-full font-normal`} rows={2} placeholder="Fabric, details, delivery info..."
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">
            Price (PKR)
            <input className={`${field} mt-1 w-full font-normal`} type="number" min={0}
              value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
            <span className="block text-xs font-normal text-slate-400">Selling price of one piece</span>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Low stock alert at
            <input className={`${field} mt-1 w-full font-normal`} type="number" min={0}
              value={form.low_stock_level}
              onChange={(e) => setForm({ ...form, low_stock_level: Number(e.target.value) })} />
            <span className="block text-xs font-normal text-slate-400">Warn me at this number or less</span>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Image link (optional)
            <input className={`${field} mt-1 w-full font-normal`} placeholder="https://..."
              value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            <span className="block text-xs font-normal text-slate-400">Paste a photo link</span>
          </label>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">Sizes and colours</p>
          <p className="mb-3 text-xs text-slate-400">One row for each size/colour you sell. Example: M, Blue, 5 pieces.</p>
          <div className="mb-1 grid grid-cols-[1fr_1fr_110px_36px] gap-2 text-xs text-slate-500">
            <span>Size</span><span>Colour</span><span>Pieces</span><span />
          </div>
          {form.variants.map((v, i) => (
            <div key={i} className="mb-2 grid grid-cols-[1fr_1fr_110px_36px] gap-2">
              <input className={field} placeholder="e.g. M" value={v.size}
                onChange={(e) => setVariant(i, { size: e.target.value })} />
              <input className={field} placeholder="e.g. Blue" value={v.colour}
                onChange={(e) => setVariant(i, { colour: e.target.value })} />
              <input className={field} type="number" min={0} value={v.stock}
                onChange={(e) => setVariant(i, { stock: Number(e.target.value) })} />
              <button type="button" title="Remove this row"
                className="rounded-xl bg-rose-100 px-0 text-rose-600 hover:bg-rose-200 hover:shadow-none"
                onClick={() => setForm({ ...form, variants: form.variants.filter((_, idx) => idx !== i) })}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="mt-1 rounded-xl bg-indigo-100 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-200 hover:shadow-none"
            onClick={() => setForm({ ...form, variants: [...form.variants, { size: "", colour: "", stock: 0 }] })}>
            + Add another size/colour
          </button>
        </div>

        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <button className="rounded-xl px-6 py-2.5">{editingId ? "Save changes" : "Add product"}</button>
          {editingId && (
            <button type="button" className="rounded-xl bg-slate-100 px-6 py-2.5 text-slate-600 hover:bg-slate-200 hover:shadow-none"
              onClick={() => { setEditingId(null); setForm(emptyForm); }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <h2 className="mb-4 text-lg text-slate-900">Your products ({products.length})</h2>
      {products.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-400 shadow-sm">
          <p className="text-4xl">📦</p>
          <p className="mt-2">No products yet. Add your first one above.</p>
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => (
          <div key={p.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <div
              className={`relative flex h-40 items-center justify-center bg-gradient-to-br ${grads[p.title.length % grads.length]} bg-cover bg-center text-5xl font-black text-white/70`}
              style={p.image_url ? { backgroundImage: `url(${p.image_url})` } : undefined}
            >
              {!p.image_url && p.title.slice(0, 1).toUpperCase()}
              {p.low_stock && (
                <span className="absolute left-3 top-3 rounded-full bg-rose-500 px-2.5 py-1 text-xs font-bold text-white">Low stock</span>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-slate-900">{p.title}</p>
                <p className="shrink-0 font-extrabold text-indigo-600">PKR {p.price.toLocaleString()}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.variants.map((v) => (
                  <span key={v.id} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${v.stock <= p.low_stock_level ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                    {v.size || "-"} / {v.colour || "-"} · {v.stock}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button className="flex-1 rounded-xl bg-indigo-100 py-2 text-sm text-indigo-700 hover:bg-indigo-200 hover:shadow-none" onClick={() => startEdit(p)}>Edit</button>
                <button className="flex-1 rounded-xl bg-rose-100 py-2 text-sm text-rose-600 hover:bg-rose-200 hover:shadow-none" onClick={() => onDelete(p.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}