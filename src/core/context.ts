import type { z } from "zod";

// context is carried only when client call server
export type Context<Meta extends z.ZodObject<any> | undefined> = {
    metadata: Meta extends z.ZodObject<any> ? z.infer<Meta> : undefined;
    client: { id: string };
};