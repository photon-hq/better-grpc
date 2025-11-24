import type { ServiceImpl } from "../core/service";

function createUnaryHandler(handler: (...args: any[]) => Promise<any>) {
    return async (req: any) => {
        const result = await handler(...req.value);
        return {
            value: result,
        };
    };
}

function createBidiStreamHandler(handler: (...args: any[]) => Promise<any>) {
    return async function* (req: any) {};
}

export function createServiceImpl(serviceImpl: ServiceImpl<any, "server">) {
    const grpcImpl = {};
    
    for (const [name, descriptor] of Object.entries(serviceImpl.methods())) {
        switch (`${descriptor.serviceType}:${descriptor.methodType}`) {
            case "server:unary":
                (grpcImpl as any)[name.toUpperCase()] = createBidiStreamHandler(async () => {
                    
                });
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
