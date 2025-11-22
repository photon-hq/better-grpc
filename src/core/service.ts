import { createGrpcServer } from "../runtime/grpc-server";
import type { ClientFn, client, ServerFn, server } from "./rpc-signatures";

export declare const ServiceNameTag: unique symbol;

export interface ServiceInstance<N extends string = string> {
    readonly [ServiceNameTag]: N;
}

export type AbstractServiceClass<N extends string = string> = abstract new (...args: never) => ServiceInstance<N>;

export class ServiceImpl<T extends AbstractServiceClass, Type extends "server" | "client"> {
    readonly implementation: any;
    readonly type: Type;
    readonly serviceName: string;

    constructor(implementation: any, type: Type, serviceName: string) {
        this.implementation = implementation;
        this.type = type;
        this.serviceName = serviceName;
    }
}

// Service factory – produces abstract service classes
export function Service<N extends string>(name: N) {
    abstract class BaseService {
        static serviceName = name;
        
        static Server<T extends AbstractServiceClass, Impl extends ServerFn<InstanceType<T>>>(
            this: T,
            implementation: Impl,
        ): ServiceImpl<T, "server"> {
            return new ServiceImpl<T, "server">(implementation, "server", name);
        }
        
        static Client<T extends AbstractServiceClass, Impl extends ClientFn<InstanceType<T>>>(
            this: T,
            implementation: Impl,
        ): ServiceImpl<T, "client"> {
            return new ServiceImpl<T, "client">(implementation, "client", name);
        }
        
        declare readonly [ServiceNameTag]: N;
    }
    return BaseService;
}

export type ServiceNameOf<T extends ServiceImpl<any, any>> = T extends ServiceImpl<infer ServiceClass, any>
    ? InstanceType<ServiceClass>[typeof ServiceNameTag]
    : never;

export type ServiceCallable<T> = T extends ServiceImpl<infer S, infer Mode>
    ? Mode extends "server"
        ? ClientFn<InstanceType<S>>
        : ServerFn<InstanceType<S>>
    : never;
