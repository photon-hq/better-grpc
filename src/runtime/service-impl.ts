import type { ServiceImpl } from "../core/service";

function createUnaryHandler(handler: (...args: any[]) => Promise<any>) {
    return async (req: any) => {
        const result = await handler(...req.value);
        return {
            value: result,
        };
    };
}

export function createServiceImpl(serviceImpl: ServiceImpl<any, any>) {
    const grpcImpl = {};

    for (const [name, handler] of Object.entries(serviceImpl.implementation)) {
        const methodDescriptor = serviceImpl.methodDescriptor(name);
        switch (`${methodDescriptor.serviceType}:${methodDescriptor.methodType}`) {
            case "server:unary":
                break;
            case "client:unary":
                (grpcImpl as any)[name] = createUnaryHandler(handler as any);
                break;
            default:
                throw new Error(`Unknown method descriptor: ${methodDescriptor}`);
        }
    }

    return grpcImpl;
}
