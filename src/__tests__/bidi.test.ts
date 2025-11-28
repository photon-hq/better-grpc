import { describe, expect, test } from "bun:test";
import { bidi } from "../core/rpc-signatures";
import { Service } from "../core/service";
import { createGrpcClient } from "../runtime/grpc-client";
import { createGrpcServer } from "../runtime/grpc-server";

describe("bidi test", async () => {
    abstract class BidiTestService extends Service("BidiTestService") {
        bidiFn1 = bidi<(name: string) => void>();
    }

    const BidiServerImpl = BidiTestService.Server({});

    const BidiClientImpl = BidiTestService.Client({});

    const grpcServer = await createGrpcServer(50003, BidiServerImpl);
    const grpcClient = await createGrpcClient("0.0.0.0:50003", BidiClientImpl);

    async function getFirstResult(generator: AsyncGenerator<any>): Promise<any> {
        return new Promise((resolve) => {
            (async () => {
                for await (const value of generator) {
                    resolve(value);
                }
            })();
        });
    }

    test("client -> server", async () => {
        grpcClient.BidiTestService.bidiFn1("hello")
        expect((await getFirstResult(grpcServer.BidiTestService.bidiFn1))[0]).toBe("hello")
    });
    
    test("server -> client", async () => {
        grpcServer.BidiTestService.bidiFn1("hello")
        expect((await getFirstResult(grpcClient.BidiTestService.bidiFn1))[0]).toBe("hello")
    });
});
