export declare const ScopeTag: unique symbol;

type AnyFn<R> = (...args: any[]) => R;

type BidiType<fn extends AnyFn<any>> = fn & AsyncGenerator<Parameters<fn>, void, unknown>

export type serverSignature<fn extends AnyFn<any>> = fn & { [ScopeTag]: "server" };
export type clientSignature<fn extends AnyFn<any>> = fn & { [ScopeTag]: "client" };
export type bidiSignature<fn extends AnyFn<void>> = fn & { [ScopeTag]: "bidi" };

export type RpcMethodDescriptor = {
    serviceType: "server" | "client" | "bidi"; // means where the actual method is called on (e.g. server means client calls this fn)
    methodType: "unary" | "bidi";
};

export function server<fn extends AnyFn<any>>(): serverSignature<(...args: Parameters<fn>) => Promise<ReturnType<fn>>> {
    return {
        serviceType: "server",
        methodType: "unary",
    } as RpcMethodDescriptor as any;
}

export function client<fn extends AnyFn<any>>(): clientSignature<(...args: Parameters<fn>) => Promise<ReturnType<fn>>> {
    return {
        serviceType: "client",
        methodType: "unary",
    } as RpcMethodDescriptor as any;
}

export function bidi<fn extends AnyFn<void>>(
    ...args: ReturnType<fn> extends void ? [] : ["Return type must be void"]
): bidiSignature<(...args: Parameters<fn>) => Promise<void>> {
    return {
        serviceType: "bidi",
        methodType: "bidi",
    } as RpcMethodDescriptor as any;
}

// Helper type to extract the raw function from any tagged type
type Unwrap<T> = T extends serverSignature<infer F>
    ? F
    : T extends clientSignature<infer F>
      ? F
      : T extends bidiSignature<infer F>
        ? BidiType<F>
        : never;

export type ServerFn<T, IncludeBidi extends boolean = true> = {
    // 1. Filter keys: Keep only server or bidi
    [K in keyof T as T[K] extends serverSignature<AnyFn<any>> | (IncludeBidi extends true ? bidiSignature<AnyFn<void>> : never)
        ? K
        : never]: // 2. Extract value: Unwrap to get the raw function
    Unwrap<T[K]>;
};

export type ClientFn<T, IncludeBidi extends boolean = true> = {
    // 1. Filter keys: Keep only client or bidi
    [K in keyof T as T[K] extends clientSignature<AnyFn<any>> | (IncludeBidi extends true ? bidiSignature<AnyFn<void>> : never)
        ? K
        : never]: // 2. Extract value: Unwrap to get the raw function
    Unwrap<T[K]>;
};
