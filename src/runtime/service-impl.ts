import { pushable } from "it-pushable";
import type { ServiceImpl } from "../core/service";
import type { GrpcServer } from "./server";
import { decodeRequestMessage, decodeResponseMessage, encodeResponseMessage } from "./message";

// Server Side Implementation
export function createServiceImpl(serviceImpl: ServiceImpl<any, "server">, grpcServer: GrpcServer) {
    const grpcImpl = {};

    for (const [name, descriptor] of Object.entries(serviceImpl.methods())) {
        switch (`${descriptor.serviceType}:${descriptor.methodType}`) {
            case "server:unary":
                (grpcImpl as any)[name.toUpperCase()] = async (req: any) => {
                    const [_, value] = decodeRequestMessage(req)
                    const result = await serviceImpl.implementation[name](...value);
                    return encodeResponseMessage(undefined, result);
                };
                break;
            case "client:unary":
                (grpcImpl as any)[name.toUpperCase()] = async function* (incomingStream: any) {
                    const stream = pushable<any>({ objectMode: true });

                    grpcServer.setStream(serviceImpl.serviceClass.serviceName, name, stream)
                    
                    // listening for response
                    ;(async () => {
                        for await (const message of incomingStream) {
                            const [id, value] = decodeResponseMessage(message);
                            if (id) {
                                grpcServer.resolveResponse(id, value);
                            } else {
                                throw new Error(`Invalid response message: ${message}`);
                            }
                        }
                        
                        stream.end()
                    })();

                    yield* stream;
                };

                break;
            default:
                throw new Error(`Unknown method descriptor: ${descriptor} for ${name}`);
        }
    }

    return grpcImpl;
}
