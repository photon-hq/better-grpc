import { describe, expect, test } from "bun:test";
import { client, server, type clientSignature, type serverSignature } from "../core/rpc-signatures";
import { createGrpcClient } from "../runtime/grpc-client";
import { createGrpcServer } from "../runtime/grpc-server";
import { Service } from "../core/service";

describe("unary test", async () => {
    abstract class UnaryTestService extends Service("UnaryTestService"){
        clientFn1 = client<() => number>();
        serverFn1 = server<() => number>();
    }
    
    const UnaryServerImpl = UnaryTestService.Server({
        serverFn1: async () => {
            return 1;
        }
    })
    
    const UnaryClientImpl = UnaryTestService.Client({
        clientFn1: async () => {
            return 2;
        }
    })

    const grpcServer = await createGrpcServer(50001, UnaryServerImpl);
    const grpcClient = await createGrpcClient("0.0.0.0:50001", UnaryClientImpl);

    grpcServer.UnaryTestService.clientFn1();
});
