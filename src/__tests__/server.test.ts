import { describe, expect, test } from "bun:test";
import { client, server } from "../core/rpc-signatures";
import { Service } from "../core/service";
import { createGrpcClient } from "../runtime/grpc-client";
import { createGrpcServer } from "../runtime/grpc-server";
import { buildProtoString } from "../runtime/proto-builder";

describe("server side test", async () => {
    abstract class UnaryTestService extends Service("UnaryTestService") {
        clientFn1 = client<() => number>();
        serverFn1 = server<() => number>();
    }
    
    let clientValue = 1

    const UnaryServerImpl = UnaryTestService.Server({
        serverFn1: async () => {
            return 1;
        },
    });

    const UnaryClientImpl = UnaryTestService.Client({
        clientFn1: async () => {
            clientValue += 1
            return clientValue;
        },
    });
    

    const grpcServer = await createGrpcServer(50002, UnaryServerImpl);
    await createGrpcClient("0.0.0.0:50002", UnaryClientImpl);
    

    test("unary without input", async () => {
        expect(await grpcServer.UnaryTestService.clientFn1()).toBe(2);
        expect(await grpcServer.UnaryTestService.clientFn1()).toBe(3);
        expect(await grpcServer.UnaryTestService.clientFn1()).toBe(4);
    });
});
