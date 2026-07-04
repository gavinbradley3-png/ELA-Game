import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <div className="min-h-screen">
      <header className="border-b border-paper-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <Link href="/teacher" className="font-serif text-xl font-bold">
            Receipts
          </Link>
          <Link href="/teacher/classes" className="text-sm font-medium text-ink-700 hover:text-ink-950">
            Classes
          </Link>
          <Link href="/teacher/passages" className="text-sm font-medium text-ink-700 hover:text-ink-950">
            Passages
          </Link>
          <Link
            href="/teacher/rounds/new"
            className="rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-500"
          >
            Launch a round
          </Link>
          <div className="ml-auto flex items-center gap-3 text-sm text-ink-500">
            <span>{user.name}</span>
            <form action={logout}>
              <button type="submit" className="underline hover:text-ink-950">Sign out</button>
            </form>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
