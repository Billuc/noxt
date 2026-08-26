import * as s from "superstruct";
import { query, mutation } from "noxt/api";

const UserSchema = s.object({
  id: s.string(),
  name: s.string(),
  email: s.string(),
});

const CreateUserInputSchema = s.object({
  name: s.string(),
  email: s.string(),
});

const users = new Map<string, { id: string; name: string; email: string }>();

users.set("1", { id: "1", name: "John Doe", email: "john@example.com" });
users.set("2", { id: "2", name: "Jane Smith", email: "jane@example.com" });

export const GET = query()
  .input(s.object({ id: s.string() }))
  .output(UserSchema)
  .endpoint(async ({ input, response }) => {
    const user = users.get(input.id);
    if (!user) {
      response.status = 404;
      return { id: "", name: "", email: "" };
    }
    return user;
  });

export const POST = mutation()
  .input(CreateUserInputSchema)
  .output(UserSchema)
  .endpoint(async ({ input }) => {
    const id = String(users.size + 1);
    const user = { id, ...input };
    users.set(id, user);
    return user;
  });

export const PUT = mutation()
  .input(s.object({ id: s.string(), name: s.string(), email: s.string() }))
  .output(UserSchema)
  .endpoint(async ({ input, response }) => {
    if (!users.has(input.id)) {
      response.status = 404;
      return { id: "", name: "", email: "" };
    }
    const user = { id: input.id, name: input.name, email: input.email };
    users.set(input.id, user);
    return user;
  });

export const DELETE = mutation()
  .input(s.object({ id: s.string() }))
  .output(s.object({ success: s.boolean() }))
  .endpoint(async ({ input, response }) => {
    const deleted = users.delete(input.id);
    if (!deleted) {
      response.status = 404;
      return { success: false };
    }
    return { success: true };
  });