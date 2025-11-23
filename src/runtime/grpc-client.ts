import type { ServiceCallable, ServiceImpl, ServiceNameOf } from "../core/service";

export async function createGrpcClient<T extends ServiceImpl<any, "client">[]>(
    url: string,
    ...serviceImpls: T
): Promise<{ [I in T[number] as ServiceNameOf<I>]: ServiceCallable<I> }> {
    return {} as any;
}
