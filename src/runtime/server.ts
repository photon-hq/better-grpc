import type { GrpcObject } from "@grpc/grpc-js";
import { Mutex } from "async-mutex";
import { type Pushable, pushable } from "it-pushable";
import { createServer } from "nice-grpc";
import type { Context } from "../core/context";
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
    pendingStreams = new Map<string, (value: Pushable<any>) => void>();

    contexts = new Map<string, Context<any>>();
    pendingContext = new Map<string, (value: Context<any>) => void>();

    pendingBidiAck = new Map<string, () => void>();

    defaultClientID: string | undefined = undefined;
    pendingDefaultClient: ((value: string) => void) | undefined = undefined;

    bidiConnections: Record<string, Pushable<{
        context: any;
        messages: any;
        send: any;
    }>> = {};

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

    setStream(serviceName: string, methodName: string, stream: Pushable<any>) {
        if (!this.pushableStreams[serviceName]) {
            this.pushableStreams[serviceName] = {};
        }
        (this.pushableStreams[serviceName] as any)[methodName.toUpperCase()] = stream;
        if (this.pendingStreams.has(`${serviceName}.${methodName.toUpperCase()}`)) {
            const resolve = this.pendingStreams.get(`${serviceName}.${methodName.toUpperCase()}`);
            resolve?.(stream);
            this.pendingStreams.delete(`${serviceName}.${methodName.toUpperCase()}`);
        }
    }

    async getStream(serviceName: string, methodName: string): Promise<Pushable<any>> {
        const stream = this.pushableStreams[serviceName]?.[methodName.toUpperCase()];
        if (!stream) {
            return new Promise((resolve) => {
                this.pendingStreams.set(`${serviceName}.${methodName.toUpperCase()}`, resolve);
            });
        }
        return stream;
    }

    setContext(serviceName: string, methodName: string, context: Context<any>) {
        this.contexts.set(`${serviceName}.${methodName.toUpperCase()}`, context);
        if (this.pendingContext.has(`${serviceName}.${methodName.toUpperCase()}`)) {
            const resolve = this.pendingContext.get(`${serviceName}.${methodName.toUpperCase()}`);
            resolve?.(context);
            this.pendingContext.delete(`${serviceName}.${methodName.toUpperCase()}`);
        }
    }

    async getContext(serviceName: string, methodName: string): Promise<Context<any>> {
        const context = this.contexts.get(`${serviceName}.${methodName.toUpperCase()}`);
        if (!context) {
            return new Promise((resolve) => {
                this.pendingContext.set(`${serviceName}.${methodName.toUpperCase()}`, resolve);
            });
        }
        return context;
    }

    resolveResponse(id: string, value: any) {
        const resolve = this.pendingRequests.get(id);
        if (!resolve) {
            throw new Error(`No pending request found for id: ${id}`);
        }
        resolve(value);
        this.pendingRequests.delete(id);
    }

    async waitingDefaultClient(): Promise<string> {
        if (this.defaultClientID) {
            return this.defaultClientID;
        }
        return new Promise((resolve) => {
            this.pendingDefaultClient = resolve;
        });
    }

    defaultClientMutex = new Mutex();

    getBidiConnectionStream(serviceName: string, methodName: string) {
        const key = `${serviceName}.${methodName.toUpperCase()}`;
        if (!this.bidiConnections[key]) {
            this.bidiConnections[key] = pushable({ objectMode: true });
        }
        return this.bidiConnections[key];
    }

    setDefaultClient(clientID: string) {
        this.defaultClientID = clientID;
        if (this.pendingDefaultClient) {
            this.pendingDefaultClient(clientID);
            this.pendingDefaultClient = undefined;
        }
    }

    bindFns() {
        for (const serviceImpl of this.serviceImpls) {
            const buildServiceCallable = (clientID: string | undefined) => {
                const callableInstance: Record<string, any> = {};

                for (const [name, descriptor] of Object.entries(serviceImpl.methods())) {
                    switch (`${descriptor.serviceType}:${descriptor.methodType}`) {
                        case "client:unary":
                            (callableInstance as any)[name] = async (...args: any[]) => {
                                const nonNullClientID = clientID ?? (await this.waitingDefaultClient());
                                const requestId = crypto.randomUUID();
                                return new Promise((resolve) => {
                                    const stream = this.getStream(
                                        `${serviceImpl.serviceClass.serviceName}_${nonNullClientID}`,
                                        name.toUpperCase(),
                                    );
                                    this.pendingRequests.set(requestId, resolve);
                                    stream.then((s) => s.push(encodeRequestMessage(requestId, args)));
                                });
                            };
                            break;
                        case "bidi:bidi": {
                            async function* generator(server: GrpcServer) {
                                const nonNullClientID = clientID ?? (await server.waitingDefaultClient());

                                console.log(`${serviceImpl.serviceClass.serviceName}_${nonNullClientID}_IN`);
                                const inStream = await server.getStream(
                                    `${serviceImpl.serviceClass.serviceName}_${nonNullClientID}_IN`,
                                    name.toUpperCase(),
                                );

                                yield* inStream;
                            }

                            const emitFn = async (...args: any[]): Promise<void> => {
                                const nonNullClientID = clientID ?? (await this.waitingDefaultClient());

                                const outStream = await this.getStream(
                                    `${serviceImpl.serviceClass.serviceName}_${nonNullClientID}_OUT`,
                                    name.toUpperCase(),
                                );

                                const ackId = descriptor.config?.ack ? crypto.randomUUID() : undefined;

                                outStream.push(encodeRequestMessage(ackId, args));

                                if (ackId) {
                                    return new Promise((resolve) => {
                                        this.pendingBidiAck.set(ackId, resolve);
                                    });
                                }
                            };

                            const context = {
                                context: this.getContext(serviceImpl.serviceClass.serviceName, name),
                            };

                            const hybrid = Object.assign(emitFn, {
                                [Symbol.asyncIterator]: () => {
                                    const iterator = generator(this);
                                    return {
                                        next: iterator.next.bind(iterator),
                                        return: iterator.return.bind(iterator),
                                        throw: iterator.throw.bind(iterator),
                                    };
                                },
                            });

                            Object.assign(hybrid, context);

                            if (!clientID) {
                                // bidiFn.listen()
                                const listen = {
                                    listen: (
                                        handler: (connection: { context: any; messages: any; send: any }) => void,
                                    ) => {
                                        (async () => {
                                            const stream = this.getBidiConnectionStream(
                                                serviceImpl.serviceClass.serviceName,
                                                name,
                                            );
                                            for await (const connection of stream) {
                                                handler(connection);
                                            }
                                        })();
                                    },
                                };

                                Object.assign(hybrid, listen);
                            }

                            (callableInstance as any)[name] = hybrid;

                            break;
                        }
                    }
                }

                return callableInstance;
            };

            const serviceCallableInstance = Object.assign(buildServiceCallable, buildServiceCallable(undefined));

            Object.defineProperty(this, serviceImpl.serviceClass.serviceName, {
                value: serviceCallableInstance,
                writable: false,
                enumerable: true,
                configurable: false,
            });
        }
    }
}
