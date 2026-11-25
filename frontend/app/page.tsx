import Link from "next/link";

const features = [
  ["\u{1F4AC}", "Unified inbox", "Facebook, Instagram and shop-page messages land in one place. Reply without switching apps."],
  ["\u{1F9FE}", "Chat to order", "Pick the size and colour from the conversation and create an order in one click."],
  ["\u{1F4E6}", "Smart stock", "Stock drops when you order and comes back on cancel or return."],
  ["\u{1F4CA}", "Daily analytics", "Orders today, sales, cash to collect and your best-performing products."],
  ["\u{1F517}", "Your own shop link", "Every vendor gets a public storefront where customers browse and message you."],
  ["\u{1F514}", "Low-stock alerts", "Get warned before a popular size or colour runs out."],
];

const steps = [
  ["1", "Create your shop", "Sign up and get your shop link instantly."],
  ["2", "Add products", "Add sizes, colours and stock."],
  ["3", "Receive messages", "Customers message you from any channel."],
  ["4", "Confirm orders", "Turn chats into orders and track delivery."],
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 text-slate-900 hover:no-underline">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-lg font-black text-white">A</span>
          <span className="text-xl font-extrabold tracking-tight">AIOOMS</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="rounded-xl px-4 py-2 font-semibold text-slate-700 hover:bg-white hover:no-underline">Login</Link>
          <Link href="/register" className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:text-white hover:no-underline">Get started</Link>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="pointer-events-none absolute left-0 top-40 h-80 w-80 rounded-full bg-fuchsia-300/30 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-4 py-1.5 text-sm font-bold text-indigo-700 shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              Facebook &middot; Instagram &middot; Shop page
            </span>

            <h1 className="mt-6 text-5xl leading-[1.1] text-slate-900 sm:text-6xl">
              Turn every chat into a{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
                confirmed order
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-slate-500">
              Stop losing sales in scattered DMs. AIOOMS brings every customer message into one inbox, creates the order in one click and keeps your stock and sales up to date.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-3.5 text-lg font-bold text-white shadow-xl shadow-indigo-500/30 transition hover:-translate-y-0.5 hover:text-white hover:no-underline hover:shadow-2xl">
                Create your shop &rarr;
              </Link>
              <Link href="/login" className="rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-lg font-bold text-slate-700 hover:no-underline hover:shadow-lg">
                Login
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-slate-600">
              <li>{"\u2705"} One inbox for all channels</li>
              <li>{"\u2705"} Automatic stock updates</li>
              <li>{"\u2705"} Daily sales summary</li>
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="animate-float absolute -left-4 top-6 z-10 hidden rounded-2xl bg-white p-3 pr-5 shadow-xl shadow-indigo-500/20 sm:block">
              <p className="text-xs text-slate-400">Sales today</p>
              <p className="text-xl font-extrabold text-emerald-600">PKR 18,500</p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white bg-white shadow-2xl shadow-indigo-500/25">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <span className="h-3 w-3 rounded-full bg-rose-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs font-semibold text-slate-400">AIOOMS &middot; Inbox</span>
              </div>

              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 font-bold text-white">A</div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Ali</p>
                  <span className="rounded-full bg-[#1877F2]/10 px-2 py-0.5 text-[10px] font-bold text-[#1877F2]">Facebook</span>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 text-sm">
                <div className="flex">
                  <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-2.5 text-slate-800 shadow-sm">Medium available hai? Kitne ka?</div>
                </div>
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-br-sm bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2.5 text-white shadow-sm">Ji available hai. PKR 2,500</div>
                </div>
                <div className="flex">
                  <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-2.5 text-slate-800 shadow-sm">Theek hai, order kar dein {"\u{1F44D}"}</div>
                </div>
                <div className="flex justify-center">
                  <span className="rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-700">&#10003; Order created &middot; stock updated</span>
                </div>
              </div>
            </div>

            <div className="animate-float-slow absolute -right-3 bottom-10 z-10 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-orange-400 p-3 pr-5 text-white shadow-xl shadow-fuchsia-500/30">
              <p className="text-xs text-white/80">Instagram</p>
              <p className="text-sm font-bold">{"\u{1F514}"} New message from Sara</p>
            </div>

            <p className="mt-4 text-center text-xs text-slate-400">Sample data for illustration</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="mb-10 text-center text-3xl text-slate-900">Everything a small seller needs</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(([icon, title, text]) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-2xl">{icon}</div>
              <h3 className="text-lg text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-700 px-6 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-10 text-center text-3xl text-white">How it works</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([n, title, text]) => (
              <div key={n} className="rounded-2xl bg-white/10 p-6 backdrop-blur">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-black text-indigo-700">{n}</span>
                <h3 className="mt-4 text-lg text-white">{title}</h3>
                <p className="mt-1 text-sm text-indigo-100">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/register" className="rounded-xl bg-white px-8 py-3.5 text-lg font-bold text-indigo-700 hover:text-indigo-800 hover:no-underline hover:shadow-2xl">Start now</Link>
          </div>
        </div>
      </section>

      <footer className="px-6 py-8 text-center text-sm text-slate-400">
        AIOOMS - All-In-One Order Management System. Software Construction project, BESE-30.
      </footer>
    </div>
  );
}