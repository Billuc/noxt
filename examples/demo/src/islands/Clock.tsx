import { h } from "preact";
import { useEffect, useState } from "preact/hooks";

// Used with `client:only`: SSR children are omitted, client renders from scratch.
export default function Clock(_: {}) {
  const [now, setNow] = useState(() => new Date().toLocaleTimeString());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  return <p>Client time: {now}</p>;
}
