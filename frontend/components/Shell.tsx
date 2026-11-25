"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/inbox", label: "Inbox & Orders", icon: "✉" },
];

export default function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();

  function logout() {
    localStorage.removeItem("token");
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-gradient-to-b from-indigo-950 via-indigo-900 to-violet-900 p-5 text-white md:flex">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-lg font-black">A</div>
          <div>
            <p className="text-lg font-extrabold leading-none tracking-tight">AIOOMS</p>
            <p className="text-[11px] text-indigo-200">Seller panel</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((n) => {
            const active = path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold hover:no-underline ${
                  active ? "bg-white/15 text-white shadow-inner" : "text-indigo-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-base">{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={logout} className="w-full rounded-xl border border-white/20 bg-white/10 py-2.5 text-sm text-white hover:bg-white/20">
          Logout
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between bg-indigo-950 p-3 text-white md:hidden">
          <span className="font-extrabold">AIOOMS</span>
          <div className="flex gap-3 text-sm">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="text-indigo-200 hover:text-white">{n.label}</Link>
            ))}
          </div>
        </div>
        <main className="mx-auto max-w-6xl p-5 lg:p-10">
          <div className="mb-8">
            <h1 className="text-3xl text-slate-900">{title}</h1>
            {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}