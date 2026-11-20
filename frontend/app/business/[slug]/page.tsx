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

export default function ShopPage() {
  const { slug } = useParams<{ slug: string }>();
  const [shop, setShop] = useState<Shop | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");

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
      setStatus("Message sent. The seller will reply soon.");
      setText("");
      setOpenId(null);
    } else {
      setStatus("Could not send the message. Please try again.");
    }
  }

  if (notFound) return <main className="p-8">Shop not found.</main>;
  if (!shop) return <main className="p-8">{status || "Loading..."}</main>;

  const field = "w-full rounded border border-gray-300 p-2";

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-3xl font-bold">{shop.shop_name}</h1>
      <p className="mb-6 text-sm text-gray-500">Browse products and message the seller.</p>
      {status && <p className="mb-4 rounded bg-green-50 p-2 text-sm text-green-700">{status}</p>}
      {shop.products.length === 0 && <p className="text-gray-500">No products yet.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {shop.products.map((p) => (
          <div key={p.id} className="rounded border p-4">
            {p.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image_url} alt={p.title} className="mb-3 h-40 w-full rounded object-cover" />
            )}
            <p className="text-lg font-semibold">{p.title}</p>
            <p className="font-medium">PKR {p.price}</p>
            {p.description && <p className="mt-1 text-sm text-gray-600">{p.description}</p>}
            <p className="mt-2 text-sm text-gray-700">
              {p.variants.length === 0
                ? "Out of stock"
                : "Available: " + p.variants.map((v) => `${v.size || "-"}/${v.colour || "-"}`).join(", ")}
            </p>
            <button className="mt-3 rounded bg-black px-3 py-1 text-sm text-white"
              onClick={() => setOpenId(openId === p.id ? null : p.id)}>
              Message seller
            </button>

            {openId === p.id && (
              <form onSubmit={(e) => send(e, p.id)} className="mt-3 space-y-2">
                <input className={field} placeholder="Your name" value={name}
                  onChange={(e) => setName(e.target.value)} required />
                <input className={field} placeholder="Phone or email (optional)" value={contact}
                  onChange={(e) => setContact(e.target.value)} />
                <textarea className={field} placeholder="e.g. Is medium available? Price kitne ka hai?"
                  value={text} onChange={(e) => setText(e.target.value)} required />
                <button className="rounded border px-3 py-1 text-sm">Send</button>
              </form>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}