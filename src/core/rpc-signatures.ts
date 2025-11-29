import type { z } from "zod";
import type { Context, ContextRequiredFn, DefaultContext, PrependContext } from "./context";

export declare const ScopeTag: unique symbol;
export declare const ContextTag: unique symbol;

type AnyFn<R> = (...args: any[]) => R;

type BidiType<fn extends AnyFn<any>> = fn & AsyncGenerator<Parameters<fn>, void, unknown>;

export type serverSignature<fn extends AnyFn<any>, C extends Context<any>> = (C extends DefaultContext
    ? <Meta extends z.ZodObject<any> | undefined>(config: { metadata?: Meta }) => serverSignature<fn, Context<Meta>>
    : fn) & {
    [ScopeTag]: "server"
};
export type clientSignature<fn extends AnyFn<any>> = fn & { [ScopeTag]: "client" };
export type bidiSignature<fn extends AnyFn<void>> = fn & { [ScopeTag]: "bidi" };

export type RpcMethodDescriptor = {
    serviceType: "server" | "client" | "bidi"; // means where the actual method is called on (e.g. server means client calls this fn)
    methodType: "unary" | "bidi";
    config?: { metadata?: z.ZodObject<any> };
};

export function server<fn extends AnyFn<any>>(): serverSignature<
    (...args: Parameters<fn>) => Promise<ReturnType<fn>>,
    DefaultContext
> {
    const descriptor = {
        serviceType: "server",
        methodType: "unary",
    } as RpcMethodDescriptor
    
    const configFn = (config: any) => {
        descriptor.config = config;
        return descriptor;
    };
    
    Object.assign(configFn, descriptor);
    
    return configFn as any;
}

export function client<fn extends AnyFn<any>>(): clientSignature<(...args: Parameters<fn>) => Promise<ReturnType<fn>>> {
    return {
        serviceType: "client",
        methodType: "unary",
    } as RpcMethodDescriptor as any;
}

export function bidi<fn extends AnyFn<void>>(
    ..._: ReturnType<fn> extends void ? [] : ["Return type must be void"]
): bidiSignature<(...args: Parameters<fn>) => Promise<void>> {
    return {
        serviceType: "bidi",
        methodType: "bidi",
    } as RpcMethodDescriptor as any;
}

// Helper type to extract the raw function from any tagged type
type Unwrap<T, ConfigChain extends boolean = false> = T extends serverSignature<infer F, infer C>
    ? C extends DefaultContext
        ? F
        : ConfigChain extends true ? ContextRequiredFn<F, C> : (...args: PrependContext<C, Parameters<F>>) => ReturnType<F>
    : T extends clientSignature<infer F>
      ? F
      : T extends bidiSignature<infer F>
        ? BidiType<F>
        : never;

export type ServerFn<T, IncludeBidi extends boolean = true, ConfigChain extends boolean = false> = {
    // 1. Filter keys: Keep only server or bidi
    [K in keyof T as T[K] extends
        | serverSignature<AnyFn<any>, any>
        | (IncludeBidi extends true ? bidiSignature<AnyFn<void>> : never)
        ? K
        : never]: // 2. Extract value: Unwrap to get the raw function
    Unwrap<T[K], ConfigChain>;
};

export type ClientFn<T, IncludeBidi extends boolean = true> = {
    // 1. Filter keys: Keep only client or bidi
    [K in keyof T as T[K] extends
        | clientSignature<AnyFn<any>>
        | (IncludeBidi extends true ? bidiSignature<AnyFn<void>> : never)
        ? K
        : never]: // 2. Extract value: Unwrap to get the raw function
    Unwrap<T[K]>;
};
