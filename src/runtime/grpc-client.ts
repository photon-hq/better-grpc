import type { ServiceCallable, ServiceImpl, ServiceNameOf } from "../core/service";
import { GrpcClient } from "./client";

export async function createGrpcClient<T extends ServiceImpl<any, "client">[]>(
    address: string,
    ...serviceImpls: T
): Promise<{ [I in T[number] as ServiceNameOf<I>]: ServiceCallable<I> }> {
    const grpcClientInstance = new GrpcClient(address, serviceImpls);
    
    grpcClientInstance.start()
    grpcClientInstance.watching()
    grpcClientInstance.bindFns()
    
    return grpcClientInstance as any;
}
