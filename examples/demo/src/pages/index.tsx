import { h } from "preact";
import { useContext } from "preact/hooks";
import { Island, UtilsContext } from "noxt";
import Counter from "../islands/Counter";
import LikeButton from "../islands/LikeButton";
import ThemeToggle from "../islands/ThemeToggle";
import Clock from "../islands/Clock";
import SearchPosts from "../islands/SearchPosts";
import Guestbook from "../islands/Guestbook";
import type { AssetId } from "../../.cache/assets";
import type { RouteId } from "../../.cache/utils";

export default function Home() {
  const { page: basePage, asset: baseAsset } = useContext(UtilsContext);
  const asset = baseAsset<AssetId>;
  const page = basePage<RouteId>;

  return (
    <html>
      <head>
        <title>Noxt demo hub</title>
        <link rel="icon" href={asset("/assets/logo.svg")} />
      </head>
      <body>
        <header>
          <img
            src={asset("/assets/logo.svg")}
            alt="Noxt demo logo"
            width={48}
          />
          <nav>
            <a href={page("/")}>Home</a> | <a href={page("/about")}>About</a> |{" "}
            <a href={page("/blog")}>Blog</a> |{" "}
            <a href={page("/docs/getting-started")}>Docs</a> |{" "}
            <a href={page("/blog", { tag: "noxt" })}>Blog (query)</a>
          </nav>
        </header>
        <main>
          <h1>Noxt demo hub</h1>
          <p>
            One project exercising pages, markdown, islands, APIs, assets and
            PWA output.
          </p>
          <img
            src={asset("/assets/nested/hero.svg")}
            alt="Demo hero"
            width={320}
          />

          <section>
            <h2>Counter (SSR + Date props via devalue)</h2>
            <Island
              component={Counter}
              props={{ initial: 5, since: new Date("2026-01-01T00:00:00Z") }}
            />
          </section>

          <section>
            <h2>Likes (sharedSignal, two instances share state)</h2>
            <Island component={LikeButton} props={{}} />
            <Island component={LikeButton} props={{}} />
          </section>

          <section>
            <h2>Theme (sharedSignal + client-side page()/asset())</h2>
            <Island component={ThemeToggle} props={{}} />
          </section>

          <section>
            <h2>Clock (client:only, no SSR output)</h2>
            <Island component={Clock} props={{}} client:only />
          </section>

          <section>
            <h2>Posts search (useApi + query endpoint)</h2>
            <Island component={SearchPosts} props={{}} />
          </section>

          <section>
            <h2>Guestbook (useFetchJson GET + mutation POST)</h2>
            <Island component={Guestbook} props={{}} />
          </section>
        </main>
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');`,
          }}
        />
      </body>
    </html>
  );
}
