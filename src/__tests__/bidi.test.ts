import { describe, expect, test } from "bun:test";
import { bidi } from "../core/rpc-signatures";
import { Service } from "../core/service";
import { createGrpcServer } from "../runtime/grpc-server";
import { createGrpcClient } from "../runtime/grpc-client";

describe("bidi test", async () => {
    abstract class BidiTestService extends Service("BidiTestService") {
        bidiFn1 = bidi<(name: string) => void>();
    }
    
    const BidiServerImpl = BidiTestService.Server({})
    
    const BidiClientImpl = BidiTestService.Client({})
    
    const grpcServer = await createGrpcServer(50001, BidiServerImpl);
    const grpcClient = await createGrpcClient("0.0.0.0:50001", BidiClientImpl);
    
    for await (const [name] of grpcServer.BidiTestService.bidiFn1) {
        console.log(`Received name: ${name}`);
    }
})
