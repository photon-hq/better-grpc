export declare const ScopeTag: unique symbol;

type AnyFn<R> = (...args: any[]) => R;

export type serverSignature<fn extends AnyFn<any>> = fn & { [ScopeTag]: "server" };
export type clientSignature<fn extends AnyFn<any>> = fn & { [ScopeTag]: "client" };
export type bidiSignature<fn extends AnyFn<void>> = fn & { [ScopeTag]: "bidi" };

export function server<fn extends AnyFn<any>>(): serverSignature<(...args: Parameters<fn>) => Promise<ReturnType<fn>>> {
    return null as any
}

export function client<fn extends AnyFn<any>>(): clientSignature<(...args: Parameters<fn>) => Promise<ReturnType<fn>>> {
    return null as any
}

export function bidi<fn extends AnyFn<void>>(): bidiSignature<(...args: Parameters<fn>) => Promise<ReturnType<fn>>> {
    return null as any
}


// Helper type to extract the raw function from any tagged type
type Unwrap<T> = T extends serverSignature<infer F> ? F : T extends clientSignature<infer F> ? F : T extends bidiSignature<infer F> ? F : never;

export type ServerFn<T> = {
    // 1. Filter keys: Keep only server or bidi
    [K in keyof T as T[K] extends serverSignature<AnyFn<any>> | bidiSignature<AnyFn<void>>
        ? K
        : never]: // 2. Extract value: Unwrap to get the raw function
    Unwrap<T[K]>;
};

export type ClientFn<T> = {
    // 1. Filter keys: Keep only client or bidi
    [K in keyof T as T[K] extends clientSignature<AnyFn<any>> | bidiSignature<AnyFn<void>>
        ? K
        : never]: // 2. Extract value: Unwrap to get the raw function
    Unwrap<T[K]>;
};
