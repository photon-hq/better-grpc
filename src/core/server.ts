import type z from "zod";
import type {
    AnyBaseSignature,
    BaseSignature,
    ExtractContext,
    ExtractFn,
    ExtractImplFn,
    ValidReturnType,
} from "./base";
import type { AnyContext, Context } from "./context";

type ServerSignature<fn extends (...args: any[]) => any, C extends AnyContext | undefined> = BaseSignature<
    "server",
    fn,
    C
> &
    (C extends undefined
        ? <Meta extends z.ZodObject<any>>(context: { metadata: Meta }) => ServerSignature<fn, Context<Meta>>
        : {});

export function server<fn extends (...args: any[]) => ValidReturnType<fn>>(): ServerSignature<fn, undefined> {
    return null as any;
}

export type ServerImpls<T> = {
    [K in keyof T as T[K] extends BaseSignature<"server", any, any> ? K : never]: T[K] extends AnyBaseSignature
        ? ExtractImplFn<T[K]>
        : never;
};

// call on client
export type ServerCallable<T> = {
    [K in keyof T as T[K] extends BaseSignature<"server", any, any> | BaseSignature<"bidi", any, any>
        ? K
        : never]: T[K] extends BaseSignature<"server", any, infer C>
        ? (...args: Parameters<ExtractFn<T[K]>>) => CallableChain<ExtractFn<T[K]>, C>
        : T[K] extends BaseSignature<"bidi", any, infer C>
          ? BidiCallable<T[K], C>
          : never;
};

type CallableChain<fn extends (...args: any[]) => any, C extends AnyContext | undefined> = C extends Context<infer Meta>
    ? Meta extends z.ZodObject<any>
        ? {
              withMeta(meta: z.infer<Meta>): ReturnType<fn>;
          }
        : ReturnType<fn>
    : ReturnType<fn>;

type BidiCallable<S extends BaseSignature<"bidi", any, any>, C extends AnyContext | undefined> = (C extends Context<
    infer Meta
>
    ? Meta extends z.ZodObject<any>
        ? {
              context(context: { metadata: z.infer<Meta> }): Promise<void>;
          } & ExtractFn<S>
        : ExtractFn<S>
    : ExtractFn<S>) &
    AsyncGenerator<Parameters<ExtractFn<S>>, void, unknown>;
