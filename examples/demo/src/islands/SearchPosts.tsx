import { h } from "preact";
import { useState } from "preact/hooks";
import { ApiRouter, useApi } from "noxt/runtime";

const router = new ApiRouter<any>("");
const fetchPosts = router.api("/api/posts", "GET");

interface Post {
  id: number;
  title: string;
  tags: string[];
  published: boolean;
}

// Exercises every searchParams type: string (q), array (tags),
// number (limit) and boolean (published), via useApi/useAsync.
export default function SearchPosts(_: {}) {
  const [q, setQ] = useState("");
  const [tags, setTags] = useState("noxt");
  const [limit, setLimit] = useState(10);
  const [published, setPublished] = useState(true);

  const input: Record<string, unknown> = { limit, published };
  if (q) input.q = q;
  const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
  if (tagList.length > 0) input.tags = tagList;

  const { data, loading, error, refresh } = useApi(fetchPosts, input);
  const posts = (data as { posts: Post[] } | null)?.posts ?? [];

  return (
    <div>
      <div>
        <label>
          Search{" "}
          <input value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
        </label>{" "}
        <label>
          Tags (comma-separated){" "}
          <input
            value={tags}
            onInput={(e) => setTags((e.target as HTMLInputElement).value)}
          />
        </label>{" "}
        <label>
          Limit{" "}
          <input
            type="number"
            value={limit}
            onInput={(e) => setLimit(Number((e.target as HTMLInputElement).value))}
          />
        </label>{" "}
        <label>
          Published only{" "}
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished((e.target as HTMLInputElement).checked)}
          />
        </label>{" "}
        <button onClick={() => refresh()}>Refresh</button>
      </div>
      {loading ? <p>Loading posts…</p> : null}
      {error ? <p>Error: {error.message}</p> : null}
      {!loading && !error ? (
        <ul>
          {posts.map((post) => (
            <li key={post.id}>
              {post.title} [{post.tags.join(", ")}]
              {post.published ? "" : " (draft)"}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
