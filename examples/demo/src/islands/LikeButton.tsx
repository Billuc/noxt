import { h } from "preact";
import { sharedSignal } from "noxt/runtime";

// Rendered twice on the home page: both instances share this signal.
export default function LikeButton(_: {}) {
  const likes = sharedSignal("demo:likes", 0);

  return (
    <button onClick={() => (likes.value += 1)}>
      Likes: {likes.value}
    </button>
  );
}
