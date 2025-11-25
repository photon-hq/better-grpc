import type { ServiceCallable, ServiceImpl, ServiceNameOf } from "../core/service";
import { GrpcServer } from "./server";

export async function createGrpcServer<T extends ServiceImpl<any, "server">[]>(
    port: number,
    ...serviceImpls: T
): Promise<{ [I in T[number] as ServiceNameOf<I>]: ServiceCallable<I> }> {
    const grpcServerInstance = new GrpcServer(`0.0.0.0:${port}`, serviceImpls);

    await grpcServerInstance.start();
    grpcServerInstance.bindFns();

    return grpcServerInstance as any;
}
