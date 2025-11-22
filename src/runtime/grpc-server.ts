import type { ServiceCallable, ServiceImpl, ServiceNameOf } from "../core/service";

export async function createGrpcServer<T extends ServiceImpl<any, "server">[]>(
    port: number,
    ...serviceImpls: T
): Promise<{ [I in T[number] as ServiceNameOf<I>]: ServiceCallable<I> }> {
    // const grpcServerInstance = createGrpcServerInstance(`0.0.0.0:${port}`);

    // Implementation placeholder
    return {} as any;
}
