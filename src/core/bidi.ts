import type z from "zod";
import type { BaseSignature, ValidReturnType } from "./base";
import type { AnyContext, Context } from "./context";

type BidiSignature<fn extends (...args: any[]) => any, C extends AnyContext | undefined> = BaseSignature<
    "bidi",
    fn,
    C
> &
    (C extends undefined
        ? <Meta extends z.ZodObject<any>>(context: {
              metadata?: Meta;
              ack?: boolean;
          }) => BidiSignature<fn, Context<Meta>>
        : {});

export function bidi<fn extends (...args: any[]) => ValidReturnType<fn>>(): BidiSignature<fn, undefined> {
    return null as any;
}
