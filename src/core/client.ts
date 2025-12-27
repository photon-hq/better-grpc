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
export type ClientCallable<T, WithListen extends boolean = true> = {
    [K in keyof T as T[K] extends BaseSignature<"client", any, any> | BaseSignature<"bidi", any, any>
        ? K
        : never]: T[K] extends BaseSignature<"client", any, any>
        ? ExtractFn<T[K]>
        : T[K] extends BaseSignature<"bidi", any, infer C>
          ? WithListen extends true
              ? BidiCallable<T[K], C>
              : BidiCallableWithoutListen<T[K], C>
          : never;
};

type BidiContext<C extends AnyContext | undefined> = C extends undefined ? Context<undefined>: C;

type BidiCallableBase<S extends BaseSignature<"bidi", any, any>, C extends AnyContext | undefined> = ExtractFn<S> & {
    context: BidiContext<C>;
} & AsyncGenerator<Parameters<ExtractFn<S>>, void, unknown>;

type BidiCallable<S extends BaseSignature<"bidi", any, any>, C extends AnyContext | undefined> = BidiCallableBase<
    S,
    C
> & {
    listen(
        handler: (connection: {
            context: BidiContext<C>;
            messages: AsyncGenerator<Parameters<ExtractFn<S>>, void, unknown>;
            send: ExtractFn<S>;
        }) => void,
    ): void;
};

type BidiCallableWithoutListen<
    S extends BaseSignature<"bidi", any, any>,
    C extends AnyContext | undefined,
> = BidiCallableBase<S, C>;
