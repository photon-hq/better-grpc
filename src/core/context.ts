import type { z } from "zod";

export type Context<Meta extends z.ZodObject<any> | undefined> = {
    metadata: Meta extends z.ZodObject<any> ? z.infer<Meta> : undefined;
};

export type BuildContextFn<C extends Context<any>, F extends (...args: any[]) => any> = ((...args: Parameters<F>) => (context: C) => ReturnType<F>) | ((...args: Parameters<F>) => ReturnType<F>);

export type DefaultContext = Context<undefined>;

type HasMeta<C extends Context<any>> = C extends Context<infer M> ? (M extends undefined ? false : true) : false;
type ExtractMeta<C extends Context<any>> = C extends Context<infer M> ? M : undefined;

export type ContextRequiredFn<
    fn extends (...args: any[]) => any,
    C extends Context<any>,
    RequireMeta extends boolean = HasMeta<C>,
> = RequireMeta extends true
    ? (...args: Parameters<fn>) => {
          withMeta<M extends ExtractMeta<C>>(metadata: z.infer<M>): ContextRequiredFn<fn, C, false>;
      }
    : ReturnType<fn>;
