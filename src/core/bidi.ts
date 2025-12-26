import type z from "zod";
import type { BaseSignature, RpcMethodDescriptor, ValidReturnType } from "./base";
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
