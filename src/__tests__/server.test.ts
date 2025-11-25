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

    const UnaryServerImpl = UnaryTestService.Server({
        serverFn1: async () => {
            return 1;
        },
    });

    const UnaryClientImpl = UnaryTestService.Client({
        clientFn1: async () => {
            return 2;
        },
    });
    

    const grpcServer = await createGrpcServer(50002, UnaryServerImpl);
    await createGrpcClient("0.0.0.0:50002", UnaryClientImpl);
    
    const value = await grpcServer.UnaryTestService.clientFn1()
    console.log('value:', value)

    test("unary without input", async () => {
        // await grpcServer.UnaryTestService.clientFn1()
        // expect(await grpcServer.UnaryTestService.clientFn1()).toBe(2);
    });
    
    await new Promise(() => {});
});
