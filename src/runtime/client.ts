import * as grpc from "@grpc/grpc-js";
import { type Pushable, pushable } from "it-pushable";
import { type Channel, ChannelCredentials, type ClientFactory, createChannel, createClientFactory } from "nice-grpc";
import type { Context } from "../core/context";
import type { ServiceImpl } from "../core/service";
import { loadProtoFromString } from "../utils/proto-loader";
import { decodeRequestMessage, decodeResponseMessage, encodeRequestMessage, encodeResponseMessage } from "./message";
import { encodeMetadata } from "./metadata";
import { buildProtoString } from "./proto-builder";

export class GrpcClient {
    readonly address: string;
    readonly serviceImpls: ServiceImpl<any, "client">[];
    readonly channel: Channel;
    readonly clientFactory: ClientFactory;
    readonly proto: grpc.GrpcObject;

    clients = new Map<string, any>();

    pushableStreams: Record<string, Record<string, Pushable<any>>> = {};
    pendingStreams = new Map<string, (value: Pushable<any>) => void>();
    pendingBidi = new Map<string, (context: Context<any>) => void>(); // bidi that is waiting for context
    pendingBidiAck = new Map<string, () => void>();

    constructor(address: string, serviceImpls: ServiceImpl<any, "client">[]) {
        this.address = address;
        this.serviceImpls = serviceImpls;
        this.proto = loadProtoFromString(buildProtoString(serviceImpls));

        const useSSL = !address.includes("localhost") && !address.includes("127.0.0.1") && !address.includes("0.0.0.0");

        const credentials = useSSL ? ChannelCredentials.createSsl() : grpc.credentials.createInsecure();

        this.channel = createChannel(address, credentials, {
            "grpc.max_receive_message_length": 10 * 1024 * 1024,
            "grpc.max_send_message_length": 10 * 1024 * 1024,
            "grpc.keepalive_time_ms": 30000,
            "grpc.keepalive_timeout_ms": 10000,
            "grpc.keepalive_permit_without_calls": 1,
        });

        this.clientFactory = createClientFactory();
    }

    start() {
        for (const serviceImpl of this.serviceImpls) {
            const client = this.clientFactory.create(
                (this.proto[serviceImpl.serviceClass.serviceName] as any).service,
                this.channel,
            );

            this.clients.set(serviceImpl.serviceClass.serviceName, client);
        }
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

    watching() {
        for (const serviceImpl of this.serviceImpls) {
            const client = this.clients.get(serviceImpl.serviceClass.serviceName);
            for (const [name, descriptor] of Object.entries(serviceImpl.methods())) {
                switch (`${descriptor.serviceType}:${descriptor.methodType}`) {
                    case "client:unary": {
                        const incomingStream = pushable<any>({ objectMode: true });
                        const incomingMessages = client[name.toUpperCase()](incomingStream);

                        (async () => {
                            try {
                                for await (const message of incomingMessages) {
                                    const [id, value] = decodeRequestMessage(message);
                                    const responseValue = await serviceImpl.implementation[name](...value);
                                    incomingStream.push(encodeResponseMessage(id, responseValue));
                                }
                            } finally {
                                incomingStream.end();
                            }
                        })();

                        break;
                    }
                    case "bidi:bidi": {
                        const setupBidi = (context: Context<any> | undefined) => {
                            const outStream = pushable<any>({ objectMode: true });
                            const inStream = pushable<any>({ objectMode: true });

                            this.setStream(
                                `${serviceImpl.serviceClass.serviceName}_OUT`,
                                name.toUpperCase(),
                                outStream,
                            );
                            this.setStream(`${serviceImpl.serviceClass.serviceName}_IN`, name.toUpperCase(), inStream);

                            const incomingMessages = context
                                ? client[name.toUpperCase()](outStream, { metadata: encodeMetadata(context.metadata) })
                                : client[name.toUpperCase()](outStream);

                            (async () => {
                                try {
                                    for await (const message of incomingMessages) {
                                        const [id, value] = decodeRequestMessage(message);
                                        if (id && descriptor.config?.ack) {
                                            this.pendingBidiAck.get(id)?.();
                                        } else {
                                            inStream.push(value);
                                        }
                                    }
                                } finally {
                                    inStream.end();
                                    outStream.end();
                                }
                            })();
                        };

                        if (descriptor.config?.metadata) {
                            (async () => {
                                const context = await new Promise((resolve) => {
                                    this.pendingBidi.set(`${serviceImpl.serviceClass.serviceName}.${name}`, resolve);
                                });

                                setupBidi(context as any);
                            })();
                        } else {
                            setupBidi(undefined);
                        }

                        break;
                    }
                }
            }
        }
    }

    bindFns() {
        for (const serviceImpl of this.serviceImpls) {
            const serviceCallableInstance = {};

            for (const [name, descriptor] of Object.entries(serviceImpl.methods())) {
                switch (`${descriptor.serviceType}:${descriptor.methodType}`) {
                    case "server:unary": {
                        if (descriptor.config?.metadata) {
                            (serviceCallableInstance as any)[name] = (...args: any[]) => {
                                return {
                                    withMeta: async (metadata: any) => {
                                        const response = await this.clients
                                            .get(serviceImpl.serviceClass.serviceName)
                                            [name.toUpperCase()](encodeRequestMessage(undefined, args), {
                                                metadata: encodeMetadata(metadata),
                                            });
                                        const [_, value] = decodeResponseMessage(response);
                                        return value;
                                    },
                                };
                            };
                        } else {
                            (serviceCallableInstance as any)[name] = async (...args: any[]) => {
                                const response = await this.clients
                                    .get(serviceImpl.serviceClass.serviceName)
                                    [name.toUpperCase()](encodeRequestMessage(undefined, args));
                                const [_, value] = decodeResponseMessage(response);
                                return value;
                            };
                        }
                        break;
                    }
                    case "bidi:bidi": {
                        async function* generator(client: GrpcClient) {
                            const inStream = await client.getStream(
                                `${serviceImpl.serviceClass.serviceName}_IN`,
                                name.toUpperCase(),
                            );

                            yield* inStream;
                        }

                        const emitFn = async (...args: any[]): Promise<void> => {
                            const outStream = await this.getStream(
                                `${serviceImpl.serviceClass.serviceName}_OUT`,
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
                            context: async (ctx: any) => {
                                const resolve = this.pendingBidi.get(`${serviceImpl.serviceClass.serviceName}.${name}`);
                                if (resolve) {
                                    resolve(ctx);
                                    this.pendingBidi.delete(`${serviceImpl.serviceClass.serviceName}.${name}`);
                                }
                            },
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

                        (serviceCallableInstance as any)[name] = hybrid;

                        break;
                    }
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

    async waitUntilReady(timeoutMs = 5000) {
        const channel = this.channel as grpc.Channel;
        const deadline = new Date(Date.now() + timeoutMs);

        return new Promise<void>((resolve, reject) => {
            const checkState = () => {
                const state = channel.getConnectivityState(true);

                if (state === grpc.connectivityState.READY) {
                    resolve();
                    return;
                }

                if (state === grpc.connectivityState.SHUTDOWN) {
                    reject(new Error("gRPC channel shut down before becoming ready"));
                    return;
                }

                channel.watchConnectivityState(state, deadline, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    checkState();
                });
            };

            checkState();
        });
    }
}
