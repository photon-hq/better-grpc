import { createServer } from "nice-grpc";

export class GrpcServer{
    readonly address: string;
    readonly grpcServer = createServer();
    
    constructor(address: string) {
        this.address = address;
    }
    
    async start(services: {serviceDef: any, impl: any}[]) {
        for (const service of services) {
            this.grpcServer.add(service.serviceDef, service.impl);
        }
        await this.grpcServer.listen(this.address);
    }
}

let server: GrpcServer | null = null;

export function createGrpcServerInstance(address: string): GrpcServer {
    if (server) { return server; }
    server = new GrpcServer(address);
    return server;
}
