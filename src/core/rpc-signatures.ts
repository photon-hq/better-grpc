export declare const ScopeTag: unique symbol;

type AnyFn<R> = (...args: any[]) => Promise<R>;

export type server<fn extends AnyFn<any>> = fn & { [ScopeTag]: "server" };
export type client<fn extends AnyFn<any>> = fn & { [ScopeTag]: "client" };
export type bidi<fn extends AnyFn<void>> = fn & { [ScopeTag]: "bidi" };

// Helper type to extract the raw function from any tagged type
type Unwrap<T> = T extends server<infer F> ? F : T extends client<infer F> ? F : T extends bidi<infer F> ? F : never;

export type ServerFn<T> = {
    // 1. Filter keys: Keep only server or bidi
    [K in keyof T as T[K] extends server<AnyFn<any>> | bidi<AnyFn<void>>
        ? K
        : never]: // 2. Extract value: Unwrap to get the raw function
    Unwrap<T[K]>;
};

export type ClientFn<T> = {
    // 1. Filter keys: Keep only client or bidi
    [K in keyof T as T[K] extends client<AnyFn<any>> | bidi<AnyFn<void>>
        ? K
        : never]: // 2. Extract value: Unwrap to get the raw function
    Unwrap<T[K]>;
};
