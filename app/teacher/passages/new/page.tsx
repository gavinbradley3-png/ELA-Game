import { createPassage } from "../../actions";
import { PassageFormFields } from "../passage-form";

export default async function NewPassagePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 font-serif text-3xl font-bold">New passage</h1>
      <p className="mb-6 text-ink-500">
        Paste any text worth arguing about: a story excerpt, article, poem, or persuasive piece.
        You&apos;ll add challenge prompts on the next screen.
      </p>
      {error && <p className="mb-4 rounded-lg bg-rose-100 px-4 py-3 text-sm text-rose-900">{error}</p>}
      <form action={createPassage} className="flex flex-col gap-4">
        <PassageFormFields />
        <button type="submit" className="self-start rounded-lg bg-ink-950 px-5 py-2.5 font-semibold text-paper-50 hover:bg-ink-900">
          Save passage
        </button>
      </form>
    </div>
  );
}
