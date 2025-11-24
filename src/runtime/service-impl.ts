import { pushable } from "it-pushable";
import type { ServiceImpl } from "../core/service";
import type { GrpcServer } from "./server";

function createUnaryHandler(handler: (...args: any[]) => Promise<any>) {
    return async (req: any) => {
        const result = await handler(...req.value);
        return {
            value: result,
        };
    };
}

export function createServiceImpl(serviceImpl: ServiceImpl<any, "server">, grpcServer: GrpcServer) {
    const grpcImpl = {};
    
    for (const [name, descriptor] of Object.entries(serviceImpl.methods())) {
        switch (`${descriptor.serviceType}:${descriptor.methodType}`) {
            case "server:unary":
                (grpcImpl as any)[name.toUpperCase()] = async function* () {
                    const stream = pushable<any>({ objectMode: true });
                    
                    (grpcServer.pushableStreams[serviceImpl.serviceClass.serviceName] as any)[name.toUpperCase()] = stream
                    
                    yield* stream
                }
                break;
            case "client:unary":                
                (grpcImpl as any)[name.toUpperCase()] = createUnaryHandler(serviceImpl.implementation[name]);
                break;
            default:
                throw new Error(`Unknown method descriptor: ${descriptor} for ${name}`);
        }
    }

    return grpcImpl;
}
