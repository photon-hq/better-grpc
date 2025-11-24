import type { GrpcObject } from "@grpc/grpc-js";
import { createServer } from "nice-grpc";
import type { ServiceImpl } from "../core/service";
import { loadProtoFromString } from "../utils/proto-loader";
import { buildProtoString } from "./proto-builder";
import { createServiceImpl } from "./service-impl";

export class GrpcServer {
    readonly address: string;
    readonly grpcServer = createServer();
    readonly serviceImpls: ServiceImpl<any, "server">[];
    readonly proto: GrpcObject;

    constructor(address: string, serviceImpls: ServiceImpl<any, "server">[]) {
        this.address = address;
        this.serviceImpls = serviceImpls;
        console.log(buildProtoString(serviceImpls))
        this.proto = loadProtoFromString(buildProtoString(serviceImpls));
    }

    async start() {
        for (const serviceImpl of this.serviceImpls) {
            this.grpcServer.add((this.proto[serviceImpl.serviceClass.serviceName] as any).service, createServiceImpl(serviceImpl));
        }

        await this.grpcServer.listen(this.address);
    }
}
