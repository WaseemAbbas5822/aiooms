"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Product,
  ProductInput,
  Variant,
  createProduct,
  deleteProduct,
  getMe,
  listProducts,
  logout,
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

export default function DashboardPage() {
  const router = useRouter();
  const [shop, setShop] = useState<{ shop_name: string; shop_slug: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");

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
    getMe().then(setShop).catch(handleError);
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
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const field = "rounded border border-gray-300 p-2";

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{shop?.shop_name ?? "Dashboard"}</h1>
          {shop && <p className="text-sm text-gray-500">Shop link: /business/{shop.shop_slug}</p>}
        </div>
        <Link href="/inbox" className="mr-3 text-sm underline">Inbox and orders</Link>
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

      <form onSubmit={onSubmit} className="mb-8 space-y-4 rounded border p-4">
        <h2 className="font-semibold">{editingId ? "Edit product" : "Add product"}</h2>

        <label className="block text-sm font-medium">
          Product name
          <input className={`${field} mt-1 w-full font-normal`} placeholder="e.g. Lawn Suit"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </label>

        <label className="block text-sm font-medium">
          Description (optional)
          <textarea className={`${field} mt-1 w-full font-normal`} placeholder="Fabric, details, delivery info..."
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>

        <div className="flex gap-3">
          <label className="w-1/3 text-sm font-medium">
            Price (PKR)
            <input className={`${field} mt-1 w-full font-normal`} type="number" min={0}
              value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
            <span className="block text-xs font-normal text-gray-500">Selling price of one piece</span>
          </label>
          <label className="w-1/3 text-sm font-medium">
            Low stock alert at
            <input className={`${field} mt-1 w-full font-normal`} type="number" min={0}
              value={form.low_stock_level}
              onChange={(e) => setForm({ ...form, low_stock_level: Number(e.target.value) })} />
            <span className="block text-xs font-normal text-gray-500">Warn me when stock is this number or less</span>
          </label>
          <label className="w-1/3 text-sm font-medium">
            Image link (optional)
            <input className={`${field} mt-1 w-full font-normal`} placeholder="https://..."
              value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            <span className="block text-xs font-normal text-gray-500">Paste a photo link</span>
          </label>
        </div>

        <div>
          <p className="text-sm font-medium">Sizes and colours</p>
          <p className="mb-2 text-xs text-gray-500">
            Add one row for each size/colour you sell, with how many pieces you have. Example: M, Blue, 5 pieces.
          </p>
          <div className="mb-1 flex gap-2 text-xs text-gray-600">
            <span className="w-1/3">Size</span>
            <span className="w-1/3">Colour</span>
            <span className="w-1/4">Pieces in stock</span>
          </div>
          {form.variants.map((v, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input className={`${field} w-1/3`} placeholder="e.g. M" value={v.size}
                onChange={(e) => setVariant(i, { size: e.target.value })} />
              <input className={`${field} w-1/3`} placeholder="e.g. Blue" value={v.colour}
                onChange={(e) => setVariant(i, { colour: e.target.value })} />
              <input className={`${field} w-1/4`} type="number" min={0} value={v.stock}
                onChange={(e) => setVariant(i, { stock: Number(e.target.value) })} />
              <button type="button" className="px-2 text-red-600" title="Remove this row"
                onClick={() => setForm({ ...form, variants: form.variants.filter((_, idx) => idx !== i) })}>
                x
              </button>
            </div>
          ))}
          <button type="button" className="text-sm underline"
            onClick={() => setForm({ ...form, variants: [...form.variants, { size: "", colour: "", stock: 0 }] })}>
            + Add another size/colour
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button className="rounded bg-black px-4 py-2 text-white">
            {editingId ? "Save changes" : "Add product"}
          </button>
          {editingId && (
            <button type="button" className="rounded border px-4 py-2"
              onClick={() => { setEditingId(null); setForm(emptyForm); }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <h2 className="mb-3 text-lg font-semibold">Your products ({products.length})</h2>
      {products.length === 0 && <p className="text-gray-500">No products yet.</p>}
      <div className="space-y-3">
        {products.map((p) => (
          <div key={p.id} className="rounded border p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{p.title}</p>
                <p className="text-sm text-gray-600">PKR {p.price}</p>
                {p.low_stock && (
                  <span className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
                    Low stock
                  </span>
                )}
              </div>
              <div className="flex gap-2 text-sm">
                <button className="underline" onClick={() => startEdit(p)}>Edit</button>
                <button className="text-red-600 underline" onClick={() => onDelete(p.id)}>Delete</button>
              </div>
            </div>
            <ul className="mt-2 text-sm text-gray-700">
              {p.variants.map((v) => (
                <li key={v.id}>
                  {v.size || "-"} / {v.colour || "-"}: {v.stock} in stock
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </main>
  );
}