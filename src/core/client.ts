import type z from "zod";
import type { AnyBaseSignature, BaseSignature, ExtractFn, ExtractImplFn, ValidReturnType } from "./base";
import type { AnyContext, Context } from "./context";

type ClientSignature<fn extends (...args: any[]) => any, C extends AnyContext | undefined> = BaseSignature<
    "client",
    fn,
    C
>;

export function client<fn extends (...args: any[]) => ValidReturnType<fn>>(): ClientSignature<fn, undefined> {
    return null as any;
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
        : never]: T[K] extends AnyBaseSignature ? ExtractFn<T[K]> : never;
};