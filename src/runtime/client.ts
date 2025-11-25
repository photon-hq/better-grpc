import * as grpc from "@grpc/grpc-js";
import { pushable } from "it-pushable";
import { type Channel, type ClientFactory, createChannel, createClientFactory } from "nice-grpc";
import type { ServiceImpl } from "../core/service";
import { loadProtoFromString } from "../utils/proto-loader";
import { buildProtoString } from "./proto-builder";

export class GrpcClient {
    readonly address: string;
    readonly serviceImpls: ServiceImpl<any, "client">[];
    readonly channel: Channel;
    readonly clientFactory: ClientFactory;
    readonly proto: grpc.GrpcObject;

    clients = new Map<string, any>();

    constructor(address: string, serviceImpls: ServiceImpl<any, "client">[]) {
        this.address = address;
        this.serviceImpls = serviceImpls;
        this.proto = loadProtoFromString(buildProtoString(serviceImpls));

        const useSSL = !address.includes("localhost") && !address.includes("127.0.0.1") && !address.includes("0.0.0.0");

        const credentials = useSSL ? grpc.credentials.createSsl() : grpc.credentials.createInsecure();

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

    watching() {
        for (const serviceImpl of this.serviceImpls) {
            const client = this.clients.get(serviceImpl.serviceClass.serviceName);
            for (const [name, descriptor] of Object.entries(serviceImpl.methods())) {
                switch (descriptor.serviceType) {
                    case "client":
                        switch (descriptor.methodType) {
                            case "unary": {
                                const incomingStream = pushable<any>({ objectMode: true });
                                const incomingMessages = client[name.toUpperCase()](incomingStream);

                                ;(async () => {
                                    for await (const message of incomingMessages) {
                                    }
                                })();

                                break;
                            }
                        }
                        break;
                    case "bidi":
                        // TODO: Implement bidi watching
                        break;
                }
            }
        }
    }

    bindFns() {}
}
