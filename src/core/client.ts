import type {
    AnyBaseSignature,
    BaseSignature,
    ExtractFn,
    ExtractImplFn,
    RpcMethodDescriptor,
    ValidReturnType,
} from "./base";
import type { AnyContext, Context } from "./context";

type ClientSignature<fn extends (...args: any[]) => any, C extends AnyContext | undefined> = BaseSignature<
    "client",
    fn,
    C
>;

export function client<fn extends (...args: any[]) => ValidReturnType<fn>>(): ClientSignature<fn, undefined> {
    return {
        serviceType: "client",
        methodType: "unary",
    } as RpcMethodDescriptor as any;
}

export type ClientImpls<T> = {
    [K in keyof T as T[K] extends BaseSignature<"client", any, any> ? K : never]: T[K] extends AnyBaseSignature
        ? ExtractImplFn<T[K]>
        : never;
};

// call on server
export type ClientCallable<T> = {
    [K in keyof T as T[K] extends BaseSignature<"client", any, any> | BaseSignature<"bidi", any, any>
        ? K
        : never]: T[K] extends BaseSignature<"client", any, any>
        ? ExtractFn<T[K]>
        : T[K] extends BaseSignature<"bidi", any, infer C>
          ? BidiCallable<T[K], C>
          : never;
};

type BidiCallable<S extends BaseSignature<"bidi", any, any>, C extends AnyContext | undefined> = ExtractFn<S> & {
    context: Promise<C>;
} & AsyncGenerator<Parameters<ExtractFn<S>>, void, unknown> & {
        listen(connection: {
            context: C;
            messages: AsyncGenerator<Parameters<ExtractFn<S>>, void, unknown>;
            send: ExtractFn<S>;
        }): void;
    };
