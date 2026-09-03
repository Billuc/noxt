import { query } from "noxt";
import * as s from "superstruct";

const Post = s.object({
  id: s.number(),
  title: s.string(),
  tags: s.array(s.string()),
  published: s.boolean(),
});

const ALL_POSTS = [
  { id: 1, title: "Hello Noxt", tags: ["noxt", "intro"], published: true },
  { id: 2, title: "Islands architecture", tags: ["noxt", "islands"], published: true },
  { id: 3, title: "Draft: PWA deep dive", tags: ["pwa"], published: false },
];

// GET /api/posts?q=&tags[]=&limit=&published=
// Covers string / array / number / boolean query coercion;
// bad values (e.g. ?limit=abc) yield 400 Bad argument.
export const GET = query()
  .input(
    s.object({
      q: s.optional(s.string()),
      tags: s.optional(s.array(s.string())),
      limit: s.optional(s.number()),
      published: s.optional(s.boolean()),
    }),
  )
  .output(s.object({ posts: s.array(Post) }))
  .endpoint(({ input }) => {
    let posts = ALL_POSTS.filter(
      (post) => input.published === undefined || post.published === input.published,
    );
    if (input.q) {
      const q = input.q.toLowerCase();
      posts = posts.filter((post) => post.title.toLowerCase().includes(q));
    }
    if (input.tags && input.tags.length > 0) {
      posts = posts.filter((post) => input.tags!.some((tag) => post.tags.includes(tag)));
    }
    if (input.limit !== undefined) posts = posts.slice(0, input.limit);
    return { posts };
  });
