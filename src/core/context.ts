import type { z } from "zod";

export type Context<Meta extends z.ZodObject<any> | undefined> = {
    metadata: Meta extends z.ZodObject<any> ? z.infer<Meta> : undefined;
};

export type PrependContext<C extends Context<any>, Args extends any[]> = [C, ...Args];

export type DefaultContext = Context<undefined>;