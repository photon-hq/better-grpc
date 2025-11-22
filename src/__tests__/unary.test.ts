import { describe, expect, test } from "bun:test";
import type { client, server } from "../core/rpc-signatures";
import { ClientBase, type ClientImpl, ServerBase, type ServerImpl, Service } from "../core/service";
import { createGrpcClient } from "../runtime/grpc-client";
import { createGrpcServer } from "../runtime/grpc-server";

describe("unary test", async () => {
    abstract class UnaryTestService extends Service("UnaryTestService"){
        abstract clientFn1: client<() => Promise<number>>;
        abstract serverFn1: server<() => Promise<number>>;
    }

    class UnaryServerImpl extends ServerBase<UnaryTestService> implements ServerImpl<UnaryTestService> {
        readonly serviceName: string = ""
        
        serverFn1 = async () => {
            return 1;
        };
    }

    class UnaryClientImpl extends ClientBase<UnaryTestService> implements ClientImpl<UnaryTestService> {
        clientFn1 = async () => {
            return 2;
        };
    }

    const grpcServer = await createGrpcServer(50001, UnaryServerImpl);
    const grpcClient = await createGrpcClient("0.0.0.0:50001", UnaryClientImpl);

    grpcServer.UnaryTestService.clientFn1();
});
