import { h } from "preact";
import { useState } from "preact/hooks";

export interface CounterProps {
  initial: number;
  // A Date exercises devalue prop serialization (data-props round-trip).
  since: Date;
}

export default function Counter({ initial, since }: CounterProps) {
  const [count, setCount] = useState(initial);

  return (
    <div>
      <p>
        Count: {count} (since {since.toISOString().slice(0, 10)})
      </p>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>{" "}
      <button onClick={() => setCount((c) => c - 1)}>-1</button>
    </div>
  );
}
