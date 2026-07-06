import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";
import { Logo } from "@/components/Logo";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <div className="min-h-screen">
      <header className="border-b border-line-300 bg-paper-50">
        <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <Logo href="/teacher" />
          <Link href="/teacher/classes" className="text-sm font-semibold text-ink-900/75 hover:text-navy-950">
            Classes
          </Link>
          <Link href="/teacher/passages" className="text-sm font-semibold text-ink-900/75 hover:text-navy-950">
            Passages
          </Link>
          <Link href="/teacher/rounds/new" className="btn btn-primary px-3.5 py-1.5 text-sm">
            Launch a round
          </Link>
          <div className="ml-auto flex items-center gap-3 text-sm text-muted-500">
            <span>{user.name}</span>
            <form action={logout}>
              <button type="submit" className="underline hover:text-navy-950">Sign out</button>
            </form>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
