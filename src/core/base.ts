import type { AnyContext, Context } from "./context";

export declare const ScopeTag: unique symbol;
export declare const FunctionTag: unique symbol;
export declare const ContextTag: unique symbol;

// Base Sigature

export type BaseSignature<
    type extends "server" | "client" | "bidi",
    fn extends (...args: any[]) => any,
    C extends AnyContext | undefined,
> = {
    [ScopeTag]: type;
    [FunctionTag]: fn;
    [ContextTag]: type extends "server" ? (C extends undefined ? Context<undefined> : C) : C;
};

export type AnyBaseSignature = BaseSignature<any, any, any>;

// promise return
export type ExtractFn<S extends AnyBaseSignature> = (
    ...args: Parameters<S[typeof FunctionTag]>
) => Promise<ReturnType<S[typeof FunctionTag]>>;

export type ExtractContext<S extends AnyBaseSignature> = S[typeof ContextTag];

// Ensure return type is not a function or Promise
export type ValidReturnType<fn extends (...args: any[]) => any> = ReturnType<fn> extends Function | Promise<any>
    ? never
    : ReturnType<fn>;

// Impl
export type ExtractImplFn<S extends AnyBaseSignature> = S[typeof ScopeTag] extends "server"
    ?
          | ExtractFn<S>
          | ((
                ...args: Parameters<S[typeof FunctionTag]>
            ) => (context: S[typeof ContextTag]) => Promise<ReturnType<S[typeof FunctionTag]>>)
    : S[typeof ScopeTag] extends "client"
      ? ExtractFn<S>
      : S[typeof ScopeTag] extends "bidi"
        ? undefined
        : never;

// descriptor
export type RpcMethodDescriptor = {
    serviceType: "server" | "client" | "bidi"; // means where the actual method is called on (e.g. server means client calls this fn)
    methodType: "unary" | "bidi";
    config?: { metadata: boolean; ack: boolean };
};