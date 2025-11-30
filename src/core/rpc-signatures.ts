import type { z } from "zod";
import { fa } from "zod/locales";
import type { Context, ContextRequiredFn, DefaultContext, PrependContext } from "./context";

export declare const ScopeTag: unique symbol;
export declare const ContextTag: unique symbol;

type AnyFn<R> = (...args: any[]) => R;

type BidiType<fn extends AnyFn<any>, C extends Context<any>, type extends "server" | "client"> = fn &
    AsyncGenerator<Parameters<fn>, void, unknown> &
    BidiContextType<C, type>;
type BidiContextType<C extends Context<any>, type extends "server" | "client"> = type extends "client"
    ? {
          context: Promise<C>;
      }
    : {
          context(context: C): Promise<void>;
      };

export type serverSignature<fn extends AnyFn<any>, C extends Context<any>> = (C extends DefaultContext
    ? <Meta extends z.ZodObject<any> | undefined>(context: { metadata?: Meta }) => serverSignature<fn, Context<Meta>>
    : fn) & {
    [ScopeTag]: "server";
};
export type clientSignature<fn extends AnyFn<any>> = fn & { [ScopeTag]: "client" };
export type bidiSignature<fn extends AnyFn<void>, C extends Context<any>> = (C extends DefaultContext
    ? <Meta extends z.ZodObject<any> | undefined, Ack extends boolean = false>(context: {
          metadata?: Meta;
          ack?: Ack;
      }) => bidiSignature<fn, Context<Meta>>
    : fn) & {
    [ScopeTag]: "bidi";
};

export type RpcMethodDescriptor = {
    serviceType: "server" | "client" | "bidi"; // means where the actual method is called on (e.g. server means client calls this fn)
    methodType: "unary" | "bidi";
    config?: { metadata: boolean; ack: boolean };
};

export function server<fn extends AnyFn<any>>(): serverSignature<
    (...args: Parameters<fn>) => Promise<ReturnType<fn>>,
    DefaultContext
> {
    const descriptor = {
        serviceType: "server",
        methodType: "unary",
    } as RpcMethodDescriptor;

    const contextFn = (context: any) => {
        descriptor.config = {
            metadata: context.metadata !== undefined,
            ack: false,
        };
        return descriptor;
    };

    Object.assign(contextFn, descriptor);

    return contextFn as any;
}

export function client<fn extends AnyFn<any>>(): clientSignature<(...args: Parameters<fn>) => Promise<ReturnType<fn>>> {
    return {
        serviceType: "client",
        methodType: "unary",
    } as RpcMethodDescriptor as any;
}

export function bidi<fn extends AnyFn<void>>(
    ..._: ReturnType<fn> extends void ? [] : ["Return type must be void"]
): bidiSignature<(...args: Parameters<fn>) => Promise<void>, DefaultContext> {
    const descriptor = {
        serviceType: "bidi",
        methodType: "bidi",
    } as RpcMethodDescriptor;

    const configFn = (config: any) => {
        descriptor.config = {
            metadata: config.metadata !== undefined,
            ack: config.ack ?? false,
        };
        return descriptor;
    };

    Object.assign(configFn, descriptor);

    return configFn as any;
}

// Helper type to extract the raw function from any tagged type
type Unwrap<T, type extends "server" | "client", ContextChain extends boolean = false> = T extends serverSignature<
    infer F,
    infer C
>
    ? C extends DefaultContext
        ? F
        : ContextChain extends true
          ? ContextRequiredFn<F, C>
          : (...args: PrependContext<C, Parameters<F>>) => ReturnType<F>
    : T extends clientSignature<infer F>
      ? F
      : T extends bidiSignature<infer F, infer C>
        ? BidiType<F, C, type>
        : never;

export type ServerFn<T, IncludeBidi extends boolean = true, ContextChain extends boolean = false> = {
    // 1. Filter keys: Keep only server or bidi
    [K in keyof T as T[K] extends
        | serverSignature<AnyFn<any>, any>
        | (IncludeBidi extends true ? bidiSignature<AnyFn<void>, any> : never)
        ? K
        : never]: // 2. Extract value: Unwrap to get the raw function
    Unwrap<T[K], "server", ContextChain>;
};

export type ClientFn<T, IncludeBidi extends boolean = true> = {
    // 1. Filter keys: Keep only client or bidi
    [K in keyof T as T[K] extends
        | clientSignature<AnyFn<any>>
        | (IncludeBidi extends true ? bidiSignature<AnyFn<void>, any> : never)
        ? K
        : never]: // 2. Extract value: Unwrap to get the raw function
    Unwrap<T[K], "client">;
};
