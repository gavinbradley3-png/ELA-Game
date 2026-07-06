import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <div className="min-h-screen">
      <header className="border-b border-night-700 bg-night-900">
        <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <Link href="/teacher" className="display text-3xl text-gold-400">
            Receipts
          </Link>
          <Link href="/teacher/classes" className="text-sm font-semibold text-smoke-300 hover:text-smoke-50">
            Classes
          </Link>
          <Link href="/teacher/passages" className="text-sm font-semibold text-smoke-300 hover:text-smoke-50">
            Passages
          </Link>
          <Link href="/teacher/rounds/new" className="btn btn-gold px-3 py-1.5 text-sm">
            🧾 Launch a round
          </Link>
          <div className="ml-auto flex items-center gap-3 text-sm text-smoke-400">
            <span>{user.name}</span>
            <form action={logout}>
              <button type="submit" className="underline hover:text-smoke-50">Sign out</button>
            </form>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
