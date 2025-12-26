import z from "zod";
import type { BaseSignature, ExtractFn, ExtractImplFn, ValidReturnType } from "./base";
import type { AnyContext, Context } from "./context";

type ServerSignature<fn extends (...args: any[]) => any, C extends AnyContext | undefined> = BaseSignature<"server", fn, C> &
    (C extends undefined
        ? <Meta extends z.ZodObject<any>>(context: { metadata: Meta }) => ServerSignature<fn, Context<Meta>>
        : {});

// Curried function to allow partial type inference
export function server<fn extends (...args: any[]) => ValidReturnType<fn>>(): ServerSignature<fn, undefined> {
    return null as any;
}

const a = server<() => string>()({ metadata: z.object({ id: z.string().uuid() }) });

type b = ExtractImplFn<typeof a>;

const c: b = async () => {
    return "Hello, World!";
};

const d: b = () => async (context) => {
    return "Hello, World!";
};