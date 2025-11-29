import { pushable } from "it-pushable";
import type { ServiceImpl } from "../core/service";
import { decodeRequestMessage, decodeResponseMessage, encodeResponseMessage } from "./message";
import { decodeMetadata } from "./metadata";
import type { GrpcServer } from "./server";

// Server Side Implementation
export function createServiceImpl(serviceImpl: ServiceImpl<any, "server">, grpcServer: GrpcServer) {
    const grpcImpl = {};

    for (const [name, descriptor] of Object.entries(serviceImpl.methods())) {
        switch (`${descriptor.serviceType}:${descriptor.methodType}`) {
            case "server:unary":
                (grpcImpl as any)[name.toUpperCase()] = async (req: any, ctx: any) => {
                    const [_, value] = decodeRequestMessage(req);
                    const args = descriptor.context?.metadata
                        ? [{ metadata: decodeMetadata(ctx.metadata) }, ...value]
                        : value;
                    const result = await serviceImpl.implementation[name](...args);
                    return encodeResponseMessage(undefined, result);
                };
                break;
            case "client:unary":
                (grpcImpl as any)[name.toUpperCase()] = async function* (incomingStream: any) {
                    const stream = pushable<any>({ objectMode: true });

                    grpcServer.setStream(serviceImpl.serviceClass.serviceName, name, stream);

                    // listening for response
                    (async () => {
                        try {
                            for await (const message of incomingStream) {
                                const [id, value] = decodeResponseMessage(message);
                                if (id) {
                                    grpcServer.resolveResponse(id, value);
                                } else {
                                    throw new Error(`Invalid response message: ${message}`);
                                }
                            }
                        } finally {
                            stream.end();
                        }
                    })();

                    yield* stream;
                };

                break;
            case "bidi:bidi":
                (grpcImpl as any)[name.toUpperCase()] = async function* (incomingStream: any, ctx: any) {
                    if (descriptor.context) {
                        grpcServer.setContext(serviceImpl.serviceClass.serviceName, name, {
                            metadata: decodeMetadata(ctx.metadata),
                        });
                    }

                    const outStream = pushable<any>({ objectMode: true });
                    const inStream = pushable<any>({ objectMode: true });

                    grpcServer.setStream(`${serviceImpl.serviceClass.serviceName}_OUT`, name, outStream);
                    grpcServer.setStream(`${serviceImpl.serviceClass.serviceName}_IN`, name, inStream);

                    (async () => {
                        try {
                            for await (const message of incomingStream) {
                                const [_, value] = decodeResponseMessage(message);
                                inStream.push(value);
                            }
                        } finally {
                            inStream.end();
                            outStream.end();
                        }
                    })();

                    yield* outStream;
                };
                break;
            default:
                throw new Error(`Unknown method descriptor: ${descriptor} for ${name}`);
        }
    }

    return grpcImpl;
}
