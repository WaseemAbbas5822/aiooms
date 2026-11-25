import Link from "next/link";

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const points = [
    ["💬", "One inbox for Facebook, Instagram and your shop"],
    ["🧾", "Turn a chat into an order in one click"],
    ["📦", "Stock goes down and comes back automatically"],
    ["📊", "Daily sales and cash-to-collect at a glance"],
  ];
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-700 p-12 text-white lg:flex">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10" />
        <div className="absolute -bottom-28 -left-10 h-80 w-80 rounded-full bg-fuchsia-500/20" />
        <Link href="/" className="relative flex items-center gap-3 text-white hover:no-underline">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-xl font-black">A</span>
          <span className="text-2xl font-extrabold tracking-tight">AIOOMS</span>
        </Link>
        <div className="relative">
          <h2 className="text-4xl leading-tight text-white">All your orders.<br />One place.</h2>
          <ul className="mt-8 space-y-4">
            {points.map(([icon, text]) => (
              <li key={text} className="flex items-center gap-3 text-indigo-100">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-lg">{icon}</span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-indigo-200">All-In-One Order Management System</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center gap-2 text-slate-900 hover:no-underline lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-black text-white">A</span>
            <span className="text-xl font-extrabold">AIOOMS</span>
          </Link>
          <h1 className="text-3xl text-slate-900">{title}</h1>
          <p className="mb-8 mt-1 text-slate-500">{subtitle}</p>
          {children}
          <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
        </div>
      </div>
    </div>
  );
}