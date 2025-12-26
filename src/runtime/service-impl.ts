import { pushable } from "it-pushable";
import type { ServiceImpl } from "../core/service";
import { decodeRequestMessage, decodeResponseMessage, encodeRequestMessage, encodeResponseMessage } from "./message";
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
                    const impl = serviceImpl.implementation[name];

                    if (!impl) {
                        throw new Error(`Method ${name} not found`);
                    }

                    let result = await impl(...(value ?? []));

                    if (typeof result === "function") {
                        result = await result({ metadata: decodeMetadata(ctx.metadata) });
                    }

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
                    if (descriptor.config?.metadata) {
                        grpcServer.setContext(serviceImpl.serviceClass.serviceName, name, {
                            metadata: decodeMetadata(ctx.metadata),
                            client: { id: decodeMetadata(ctx.metadata).BETTER_GRPC_CLIENT_ID as string },
                        });
                    }

                    const outStream = pushable<any>({ objectMode: true });
                    const inStream = pushable<any>({ objectMode: true });

                    grpcServer.setStream(`${serviceImpl.serviceClass.serviceName}_OUT`, name, outStream);
                    grpcServer.setStream(`${serviceImpl.serviceClass.serviceName}_IN`, name, inStream);

                    (async () => {
                        try {
                            for await (const message of incomingStream) {
                                const [id, value] = decodeResponseMessage(message);

                                if (id && descriptor.config?.ack && value === undefined) {
                                    grpcServer.pendingBidiAck.get(id)?.();
                                    grpcServer.pendingBidiAck.delete(id);
                                } else {
                                    inStream.push(value ?? []);
                                    if (id && descriptor.config?.ack) {
                                        outStream.push(encodeRequestMessage(id, undefined));
                                    }
                                }
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
