import { h } from "preact";
import { sharedSignal, useUtilsContext } from "noxt/runtime";

export default function ThemeToggle(_: {}) {
  const theme = sharedSignal<"light" | "dark">("demo:theme", "light");
  const { page, asset } = useUtilsContext();

  return (
    <div>
      <p>Theme: {theme.value}</p>
      <button
        onClick={() => (theme.value = theme.value === "light" ? "dark" : "light")}
      >
        Toggle theme
      </button>{" "}
      <a href={page("/blog")}>Blog</a>{" "}
      <img src={asset("/assets/logo.svg")} alt="logo" width={24} />
    </div>
  );
}
