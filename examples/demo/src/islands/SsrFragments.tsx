import { h } from "preact";
import { useState } from "preact/hooks";
import { FetchError } from "noxt/runtime";
import { useUtilsContext } from "../runtime/utils";

function toMessage(err: unknown): string {
  if (err instanceof FetchError) {
    return `${err.response.status} ${err.response.statusText}`;
  }
  return err instanceof Error ? err.message : String(err);
}

// Exercises the SSR runtime client both ways: programmatic fragment
// fetching via ssr() (HTML injected with dangerouslySetInnerHTML) and
// declarative URL building via ssrUrl() (HTMX-style hx-get href).
export default function SsrFragments(_: {}) {
  const { ssr, ssrUrl } = useUtilsContext();
  const greet = ssr("/ssr/greeting", "GET");
  const postGreeting = ssr("/ssr/greeting", "POST");
  const search = ssr("/ssr/search", "GET");
  const crash = ssr("/ssr/crash", "GET");

  const [name, setName] = useState("Ada");
  const [greeting, setGreeting] = useState<string | null>(null);
  const [greetingError, setGreetingError] = useState<string | null>(null);
  const [loadingGreeting, setLoadingGreeting] = useState(false);
  const [posted, setPosted] = useState<string[]>([]);

  const [q, setQ] = useState("");
  const [tags, setTags] = useState("noxt");
  const [limit, setLimit] = useState("5");
  const [published, setPublished] = useState(true);
  const [searchHtml, setSearchHtml] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [crashError, setCrashError] = useState<string | null>(null);

  // Shown as copyable URL and "open raw" link: no window needed, works
  // during prerender too.
  const greetingUrl = ssrUrl("/ssr/greeting", "GET", { name });

  async function loadGreeting() {
    setLoadingGreeting(true);
    setGreetingError(null);
    try {
      setGreeting(await greet({ name }));
    } catch (err) {
      setGreetingError(toMessage(err));
    } finally {
      setLoadingGreeting(false);
    }
  }

  async function postName() {
    setGreetingError(null);
    try {
      const html = await postGreeting({ name });
      setPosted((prev) => [...prev, html]);
      setName("");
    } catch (err) {
      setGreetingError(toMessage(err));
    }
  }

  async function runSearch() {
    setSearchError(null);
    try {
      // A non-numeric limit stays a string and triggers the server 400 path.
      const parsed = limit.trim() === "" ? undefined : Number(limit);
      const input: Record<string, unknown> = { published };
      if (q) input.q = q;
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (tagList.length > 0) input.tags = tagList;
      if (parsed !== undefined) {
        input.limit = Number.isNaN(parsed) ? limit : parsed;
      }
      setSearchHtml(await (search as any)(input));
    } catch (err) {
      setSearchError(toMessage(err));
    }
  }

  async function runCrash() {
    setCrashError(null);
    try {
      await crash({});
    } catch (err) {
      setCrashError(toMessage(err));
    }
  }

  return (
    <div>
      <div>
        <h3>Greeting fragment (ssr GET)</h3>
        <label>
          Name{" "}
          <input
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
          />
        </label>{" "}
        <button onClick={loadGreeting}>Load</button>{" "}
        <button onClick={postName}>Post</button>
        {loadingGreeting ? <p>Loading greeting…</p> : null}
        {greetingError ? <p>Error: {greetingError}</p> : null}
        {greeting ? (
          <div dangerouslySetInnerHTML={{ __html: greeting }} />
        ) : null}
        {posted.map((html, i) => (
          <div key={i} dangerouslySetInnerHTML={{ __html: html }} />
        ))}
        <p>
          Fragment URL: <code>{greetingUrl}</code>{" "}
          <a href={greetingUrl} target="_blank" rel="noreferrer">
            open raw
          </a>
        </p>
      </div>

      <div>
        <h3>Search fragment (query coercion)</h3>
        <label>
          Q{" "}
          <input
            value={q}
            onInput={(e) => setQ((e.target as HTMLInputElement).value)}
          />
        </label>{" "}
        <label>
          Tags{" "}
          <input
            value={tags}
            onInput={(e) => setTags((e.target as HTMLInputElement).value)}
          />
        </label>{" "}
        <label>
          Limit (try "abc" for a 400){" "}
          <input
            value={limit}
            onInput={(e) => setLimit((e.target as HTMLInputElement).value)}
          />
        </label>{" "}
        <label>
          Published{" "}
          <input
            type="checkbox"
            checked={published}
            onChange={(e) =>
              setPublished((e.target as HTMLInputElement).checked)
            }
          />
        </label>{" "}
        <button onClick={runSearch}>Search</button>
        {searchError ? <p>Error: {searchError}</p> : null}
        {searchHtml ? (
          <div dangerouslySetInnerHTML={{ __html: searchHtml }} />
        ) : null}
      </div>

      <div>
        <h3>Crash route (500 path)</h3>
        <button onClick={runCrash}>Crash</button>
        {crashError ? <p>Error: {crashError}</p> : null}
      </div>
    </div>
  );
}
