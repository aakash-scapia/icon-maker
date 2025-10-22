"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { IconifyState, IconifyResult } from "./actions/iconify";

type Props = {
  action: (state: IconifyState, formData: FormData) => Promise<IconifyState>;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-3 py-2 rounded bg-black text-white disabled:bg-gray-400"
    >
      {pending ? "Generating…" : "Generate"}
    </button>
  );
}

export default function ClientUI({ action }: Props) {
  const [state, formAction, isPending] =
    useActionState<IconifyState, FormData>(action, { results: [] });

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-5">
      <h1 className="text-2xl font-semibold">Scapia 3D Icon — Batch Generator</h1>
      <p className="text-sm text-gray-600">
        Upload one or more reference images. Generates 1024×1024 <strong>transparent</strong> PNG icons with the baked preset.
      </p>

      <form action={formAction} className="space-y-4">
        <label className="block">
          <div className="text-sm font-medium mb-1">Reference images</div>
          <input type="file" name="images" accept="image/*" multiple className="block" />
        </label>
        {/* Either pending flag disables the button */}
        <SubmitButton />
      </form>

      {!!state.results.length && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {state.results.map((r: IconifyResult, i: number) => (
            <div key={i} className="border rounded p-3">
              {r.error ? (
                <div className="text-red-600 text-sm">{r.error}</div>
              ) : (
                <>
                  <img
                    src={`data:image/png;base64,${r.b64}`}
                    alt={`Generated icon ${r.name}`}
                    className="w-24 h-24 object-contain mb-2 mx-auto"
                  />
                  <a
                    download={r.name}
                    href={`data:image/png;base64,${r.b64}`}
                    className="text-blue-600 underline text-sm block text-center"
                  >
                    Download {r.name}
                  </a>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
