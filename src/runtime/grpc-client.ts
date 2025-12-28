import type { ChannelOptions } from "nice-grpc";
import type { ServiceCallable, ServiceImpl, ServiceNameOf } from "../core/service";
import { GrpcClient } from "./client";

export const DEFAULT_OPTIONS: ChannelOptions = {
    "grpc.max_receive_message_length": 10000,
    "grpc.max_send_message_length": 5000,
    "grpc.keepalive_time_ms": 30000,
    "grpc.keepalive_timeout_ms": 10000,
    "grpc.keepalive_permit_without_calls": 1,
};

export async function createGrpcClient<T extends ServiceImpl<any, "client">[]>(
    address: string,
    credentials: "ssl" | "insecure",
    ...serviceImpls: T
): Promise<{ [I in T[number] as ServiceNameOf<I>]: ServiceCallable<I> } & { clientID: string }>;
export async function createGrpcClient<T extends ServiceImpl<any, "client">[]>(
    address: string,
    credentials: "ssl" | "insecure",
    grpcOptions: ChannelOptions,
    ...serviceImpls: T
): Promise<{ [I in T[number] as ServiceNameOf<I>]: ServiceCallable<I> } & { clientID: string }>;
export async function createGrpcClient<T extends ServiceImpl<any, "client">[]>(
    address: string,
    ...serviceImpls: T
): Promise<{ [I in T[number] as ServiceNameOf<I>]: ServiceCallable<I> } & { clientID: string }>;
export async function createGrpcClient<T extends ServiceImpl<any, "client">[]>(
    address: string,
    grpcOptions: ChannelOptions,
    ...serviceImpls: T
): Promise<{ [I in T[number] as ServiceNameOf<I>]: ServiceCallable<I> } & { clientID: string }>;
export async function createGrpcClient(
    address: string,
    credentialsOrOptionsOrServiceImpl: "ssl" | "insecure" | ChannelOptions | ServiceImpl<any, "client">,
    grpcOptionsOrServiceImpl?: ChannelOptions | ServiceImpl<any, "client">,
    ...serviceImpls: any[]
) {
    const isServiceImpl = (val: any): val is ServiceImpl<any, "client"> =>
        val instanceof Object && "type" in val && "serviceClass" in val;

    const isCredentials = (val: any): val is "ssl" | "insecure" => val === "ssl" || val === "insecure";

    const isChannelOptions = (val: any): val is ChannelOptions =>
        val instanceof Object && !isServiceImpl(val);

    let credentials: "ssl" | "insecure" | undefined;
    let grpcOptions: ChannelOptions = DEFAULT_OPTIONS;
    let allServiceImpls: ServiceImpl<any, "client">[];

    if (isCredentials(credentialsOrOptionsOrServiceImpl)) {
        // credentials is provided as second arg
        credentials = credentialsOrOptionsOrServiceImpl;
        if (grpcOptionsOrServiceImpl === undefined) {
            allServiceImpls = serviceImpls;
        } else if (isServiceImpl(grpcOptionsOrServiceImpl)) {
            allServiceImpls = [grpcOptionsOrServiceImpl, ...serviceImpls];
        } else {
            grpcOptions = grpcOptionsOrServiceImpl;
            allServiceImpls = serviceImpls;
        }
    } else if (isServiceImpl(credentialsOrOptionsOrServiceImpl)) {
        // No credentials, no options, just service impls
        allServiceImpls = [credentialsOrOptionsOrServiceImpl];
        if (grpcOptionsOrServiceImpl !== undefined) {
            allServiceImpls.push(grpcOptionsOrServiceImpl as any, ...serviceImpls);
        }
    } else if (isChannelOptions(credentialsOrOptionsOrServiceImpl)) {
        // No credentials, but options provided
        grpcOptions = credentialsOrOptionsOrServiceImpl;
        if (grpcOptionsOrServiceImpl !== undefined) {
            allServiceImpls = [grpcOptionsOrServiceImpl as any, ...serviceImpls];
        } else {
            allServiceImpls = serviceImpls;
        }
    } else {
        allServiceImpls = serviceImpls;
    }

    const grpcClientInstance = new GrpcClient(address, credentials, grpcOptions, allServiceImpls);

    grpcClientInstance.start();
    await grpcClientInstance.waitUntilReady();
    grpcClientInstance.watching();
    grpcClientInstance.bindFns();

    return grpcClientInstance as any;
}
