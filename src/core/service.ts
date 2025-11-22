import { createGrpcServer } from "../runtime/grpc-server";
import {
    bidi,
    type ClientFn,
    type clientSignature,
    type ServerFn,
    server,
    type serverSignature,
} from "./rpc-signatures";

export declare const ServiceNameTag: unique symbol;

export interface ServiceInstance<N extends string = string> {
    readonly [ServiceNameTag]: N;
}

export type AbstractServiceClass<N extends string = string> = abstract new (...args: never) => ServiceInstance<N>;

export class ServiceImpl<T extends AbstractServiceClass, Type extends "server" | "client"> {
    readonly implementation: any;
    readonly type: Type;
    readonly serviceClass: T;

    constructor(implementation: any, type: Type, serviceClass: T) {
        this.implementation = implementation;
        this.type = type;
        this.serviceClass = serviceClass;
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
            // biome-ignore lint/complexity/noThisInStatic: Required for static method to access class constructor
            return new ServiceImpl<T, "server">(implementation, "server", this);
        }

        static Client<T extends AbstractServiceClass, Impl extends ClientFn<InstanceType<T>>>(
            this: T,
            implementation: Impl,
        ): ServiceImpl<T, "client"> {
            // biome-ignore lint/complexity/noThisInStatic: Required for static method to access class constructor
            return new ServiceImpl<T, "client">(implementation, "client", this);
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