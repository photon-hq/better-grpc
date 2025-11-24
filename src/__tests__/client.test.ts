import { describe, test } from "bun:test";
import { client, server } from "../core/rpc-signatures";
import { Service } from "../core/service";
import { createGrpcServer } from "../runtime/grpc-server";
import { createGrpcClient } from "../runtime/grpc-client";
import { createServiceImpl } from "../runtime/service-impl";

describe("client side test", async () => {
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
    
    console.log(createServiceImpl(UnaryServerImpl))
    
    const grpcServer = await createGrpcServer(50001, UnaryServerImpl)
    const grpcClient = await createGrpcClient("0.0.0.0:50001", UnaryClientImpl)
    
    test("unary", async () => {
        
    });
});
