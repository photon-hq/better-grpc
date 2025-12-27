import type { RpcMethodDescriptor } from "./base";
import type { ClientCallable, ClientImpls } from "./client";
import type { ServerCallable, ServerImpls } from "./server";

export declare const ServiceNameTag: unique symbol;

export interface ServiceInstance<N extends string = string> {
    readonly [ServiceNameTag]: N;
}

export type AbstractServiceClass<N extends string = string> = abstract new (...args: never) => ServiceInstance<N>;

export class ServiceImpl<T extends AbstractServiceClass, Type extends "server" | "client"> {
    readonly implementation: any;
    readonly type: Type;
    readonly serviceClass: T;
    readonly serviceClassInstance: InstanceType<T>;

    constructor(implementation: any, type: Type, serviceClass: T) {
        this.implementation = implementation;
        this.type = type;
        this.serviceClass = serviceClass;
        this.serviceClassInstance = Reflect.construct(this.serviceClass, []);
    }

    methods(): Record<string, RpcMethodDescriptor> {
        const fields = Object.entries(this.serviceClassInstance);

        return fields.reduce(
            (acc, [name, descriptor]) => {
                acc[name] = descriptor as RpcMethodDescriptor;
                return acc;
            },
            {} as Record<string, RpcMethodDescriptor>,
        );
    }
}

// Service factory – produces abstract service classes
export function Service<N extends string>(name: N) {
    abstract class BaseService {
        static serviceName = name;

        static Server<T extends AbstractServiceClass, Impl extends ServerImpls<InstanceType<T>>>(
            this: T,
            implementation: Impl,
        ): ServiceImpl<T, "server"> {
            // biome-ignore lint/complexity/noThisInStatic: Required for static method to access class constructor
            return new ServiceImpl<T, "server">(implementation, "server", this);
        }

        static Client<T extends AbstractServiceClass, Impl extends ClientImpls<InstanceType<T>>>(
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

export type ServiceCallable<T, WithListen extends boolean = true> = T extends ServiceImpl<infer S, infer Mode>
    ? Mode extends "server"
        ? ClientCallable<InstanceType<S>, WithListen>
        : ServerCallable<InstanceType<S>>
    : never;
