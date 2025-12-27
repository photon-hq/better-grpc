import type { z } from "zod";

// context is carried only when client call server
// client is the carrier
// server is the receiver
export type Context<Meta extends z.ZodObject<any> | undefined> = {
    metadata: Meta extends z.ZodObject<any> ? z.infer<Meta> : undefined;
    client: { id: string };
};

export type AnyContext = Context<any>;
