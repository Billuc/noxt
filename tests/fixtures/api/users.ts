import * as v from "valibot";
import { query, mutation } from "noxt/api";

const UserSchema = v.object({
  id: v.string(),
  name: v.string(),
  email: v.string(),
});

const CreateUserInputSchema = v.object({
  name: v.string(),
  email: v.string(),
});

const users = new Map<string, { id: string; name: string; email: string }>();

users.set("1", { id: "1", name: "John Doe", email: "john@example.com" });
users.set("2", { id: "2", name: "Jane Smith", email: "jane@example.com" });

export const GET = query()
  .input(v.object({ id: v.string() }))
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
  .input(v.object({ id: v.string(), name: v.string(), email: v.string() }))
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
  .input(v.object({ id: v.string() }))
  .output(v.object({ success: v.boolean() }))
  .endpoint(async ({ input, response }) => {
    const deleted = users.delete(input.id);
    if (!deleted) {
      response.status = 404;
      return { success: false };
    }
    return { success: true };
  });