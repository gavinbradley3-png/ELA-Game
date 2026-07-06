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
      <h1 className="display mb-2 text-5xl">New case file</h1>
      <p className="mb-6 text-smoke-400">
        Paste any text worth arguing about: a story excerpt, article, poem, or persuasive piece.
        You&apos;ll add challenge prompts on the next screen.
      </p>
      {error && (
        <p className="mb-4 rounded-xl border-2 border-alarm-500 bg-alarm-500/10 px-4 py-3 text-sm font-semibold text-alarm-400">
          {error}
        </p>
      )}
      <form action={createPassage} className="flex flex-col gap-4">
        <PassageFormFields />
        <button type="submit" className="btn btn-gold self-start px-5 py-2.5">
          Save passage
        </button>
      </form>
    </div>
  );
}
