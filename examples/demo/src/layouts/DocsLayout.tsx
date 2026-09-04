import { h, type ComponentChildren } from "preact";
import { useUtilsContext } from "../runtime/utils";

interface DocsLayoutProps {
  title?: string;
  children?: ComponentChildren;
}

export default function DocsLayout({ title, children }: DocsLayoutProps) {
  const { page, asset } = useUtilsContext();

  return (
    <html>
      <head>
        <title>{title ?? "Docs"}</title>
        <link rel="icon" href={asset("/assets/logo.svg")} />
        <link rel="stylesheet" href={asset("/assets/style.css")} />
      </head>
      <body>
        <nav>
          <a href={page("/")}>Home</a> |{" "}
          <a href={page("/docs/getting-started")}>Getting started</a>
        </nav>
        <main>
          {title ? <h1>{title}</h1> : null}
          <span>This is part of the layout</span>
          {children}
        </main>
      </body>
    </html>
  );
}
