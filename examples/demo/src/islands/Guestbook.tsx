import { h } from "preact";
import { useState } from "preact/hooks";
import { ApiRouter, useFetchJson } from "noxt/runtime";

const router = new ApiRouter<any>("");
const createEntry = router.api("/api/guestbook", "POST");

interface GuestbookEntry {
  id: number;
  name: string;
  message: string;
  at: string;
}

// GET list via useFetchJson (raw fetch path), POST via the typed API caller.
// Empty name/message submits trigger the endpoint's 400 path.
export default function Guestbook(_: {}) {
  const { data, loading, error, refresh } = useFetchJson<{ entries: GuestbookEntry[] }>(
    "/api/guestbook",
    { objectBody: { limit: 20 } },
  );
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function onSubmit(e: Event) {
    e.preventDefault();
    setSubmitError(null);
    try {
      await createEntry({ name, message });
      setMessage("");
      await refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div>
      {loading ? <p>Loading entries…</p> : null}
      {error ? <p>Error: {error.message}</p> : null}
      {!loading && !error ? (
        <ul>
          {(data?.entries ?? []).map((entry) => (
            <li key={entry.id}>
              <strong>{entry.name}</strong>: {entry.message}
            </li>
          ))}
        </ul>
      ) : null}
      <form onSubmit={onSubmit}>
        <input
          placeholder="Name"
          value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
        />{" "}
        <input
          placeholder="Message"
          value={message}
          onInput={(e) => setMessage((e.target as HTMLInputElement).value)}
        />{" "}
        <button type="submit">Sign</button>
      </form>
      {submitError ? <p>Submit failed: {submitError}</p> : null}
      <button onClick={() => refresh()}>Reload</button>
    </div>
  );
}
