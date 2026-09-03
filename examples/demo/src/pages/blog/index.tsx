import { h } from "preact";
import { useContext } from "preact/hooks";
import { Island, UtilsContext } from "noxt";
import SearchPosts from "../../islands/SearchPosts";

export default function Blog() {
  const { page, asset } = useContext(UtilsContext);

  return (
    <html>
      <head>
        <title>Blog — Noxt demo</title>
        <link rel="icon" href={asset("/assets/logo.svg")} />
      </head>
      <body>
        <header>
          <nav>
            <a href={page("/")}>Home</a> | <a href={page("/about")}>About</a> |{" "}
            <a href={page("/blog")}>Blog</a>
          </nav>
        </header>
        <main>
          <h1>Blog</h1>
          <p>
            Static preact page. Posts are fetched client-side through the typed
            API client against <code>GET /api/posts</code>.
          </p>
          <Island component={SearchPosts} props={{}} />
          <p>
            <a href={page("/", { from: "blog" })}>Back home (with query)</a>
          </p>
        </main>
      </body>
    </html>
  );
}
