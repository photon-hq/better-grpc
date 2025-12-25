import type { ChannelOptions } from "nice-grpc";
import type { ServiceCallable, ServiceImpl, ServiceNameOf } from "../core/service";
import { GrpcClient } from "./client";

export const DEFAULT_OPTIONS: ChannelOptions = {
    "grpc.max_receive_message_length": 10000,
    "grpc.max_send_message_length": 5000,
    "grpc.keepalive_time_ms": 30000,
    "grpc.keepalive_timeout_ms": 10000,
    "grpc.keepalive_permit_without_calls": 1
};

export async function createGrpcClient<T extends ServiceImpl<any, "client">[]>(
    address: string,
    ...serviceImpls: T
): Promise<{ [I in T[number] as ServiceNameOf<I>]: ServiceCallable<I> }>;
export async function createGrpcClient<T extends ServiceImpl<any, "client">[]>(
    address: string,
    grpcOptions: ChannelOptions,
    ...serviceImpls: T
): Promise<{ [I in T[number] as ServiceNameOf<I>]: ServiceCallable<I> }>;
export async function createGrpcClient(
    address: string,
    grpcOptionsOrServiceImpls: ChannelOptions | any,
    ...serviceImpls: any[]
) {
    // Determine if the second argument is a ServiceImpl (has type and serviceClass properties)
    const isServiceImpl =
        grpcOptionsOrServiceImpls instanceof Object &&
        "type" in grpcOptionsOrServiceImpls &&
        "serviceClass" in grpcOptionsOrServiceImpls;

    const isChannelOptions = !isServiceImpl;

    const grpcOptions: ChannelOptions = isChannelOptions ? grpcOptionsOrServiceImpls : DEFAULT_OPTIONS;
    const allServiceImpls = isChannelOptions ? serviceImpls : [grpcOptionsOrServiceImpls, ...serviceImpls];

    const grpcClientInstance = new GrpcClient(address, grpcOptions, allServiceImpls);

    grpcClientInstance.start();
    await grpcClientInstance.waitUntilReady();
    grpcClientInstance.watching();
    grpcClientInstance.bindFns();

    return grpcClientInstance as any;
}
