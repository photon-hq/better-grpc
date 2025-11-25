import type { GrpcObject } from "@grpc/grpc-js";
import type { Pushable } from "it-pushable";
import { createServer } from "nice-grpc";
import type { ServiceImpl } from "../core/service";
import { loadProtoFromString } from "../utils/proto-loader";
import { encodeRequestMessage } from "./message";
import { buildProtoString } from "./proto-builder";
import { createServiceImpl } from "./service-impl";

export class GrpcServer {
    readonly address: string;
    readonly grpcServer = createServer();
    readonly serviceImpls: ServiceImpl<any, "server">[];
    readonly proto: GrpcObject;

    pushableStreams: Record<string, Record<string, Pushable<any>>> = {};
    pendingRequests = new Map<string, (value: any) => void>();

    constructor(address: string, serviceImpls: ServiceImpl<any, "server">[]) {
        this.address = address;
        this.serviceImpls = serviceImpls;
        this.proto = loadProtoFromString(buildProtoString(serviceImpls));
    }

    async start() {
        for (const serviceImpl of this.serviceImpls) {
            this.pushableStreams[serviceImpl.serviceClass.serviceName] = {};
            this.grpcServer.add(
                (this.proto[serviceImpl.serviceClass.serviceName] as any).service,
                createServiceImpl(serviceImpl, this),
            );
        }

        await this.grpcServer.listen(this.address);
    }

    getStream(serviceName: string, methodName: string): Pushable<any> {
        return (this.pushableStreams[serviceName] as any)[methodName.toUpperCase()];
    }

    bindFns() {
        for (const serviceImpl of this.serviceImpls) {
            const serviceCallableInstance = {};

            for (const [name, descriptor] of Object.entries(serviceImpl.methods())) {
                switch (descriptor.serviceType) {
                    case "server":
                        break;
                    case "client":
                        (serviceCallableInstance as any)[name] = async (...args: any[]) => {
                            console.log("called - 2");
                            const stream = this.getStream(serviceImpl.serviceClass.serviceName, name.toUpperCase());
                            const requestId = crypto.randomUUID();
                            return new Promise((resolve) => {
                                this.pendingRequests.set(requestId, resolve);
                                stream.push(encodeRequestMessage(requestId, args));
                            });
                        };
                        break;
                    case "bidi":
                        break;
                }
            }

            Object.defineProperty(this, serviceImpl.serviceClass.serviceName, {
                value: serviceCallableInstance,
                writable: false,
                enumerable: true,
                configurable: false,
            });
        }
    }
}
