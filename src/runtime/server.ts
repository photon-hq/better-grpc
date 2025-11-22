import { createServer } from "nice-grpc";
import { type GrpcObject } from "@grpc/grpc-js";
import type { ServiceImpl } from "../core/service";
import { loadProtoFromString } from "../utils/proto-loader";
import { buildProtoString } from "./proto-builder";

export class GrpcServer{
    readonly address: string;
    readonly grpcServer = createServer();
    readonly serviceImpls: ServiceImpl<any, "server">[];
    readonly proto: GrpcObject;
    
    constructor(address: string, serviceImpls: ServiceImpl<any, "server">[]) {
        this.address = address;
        this.serviceImpls = serviceImpls
        this.proto = loadProtoFromString(buildProtoString(serviceImpls))
    }
    
    async start() {
        await this.grpcServer.listen(this.address);
    }
}