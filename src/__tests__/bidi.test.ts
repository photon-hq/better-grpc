import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { bidi } from "../core/rpc-signatures";
import { Service } from "../core/service";
import { createGrpcClient } from "../runtime/grpc-client";
import { createGrpcServer } from "../runtime/grpc-server";

describe("bidi test", async () => {
    abstract class BidiTestService extends Service("BidiTestService") {
        bidiFn1 = bidi<(name: string) => void>();
        bidiFn2 = bidi<(name: string) => void>()({
            metadata: z.object({
                age: z.number(),
            }),
        });
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
        await grpcClient.BidiTestService.bidiFn1("hello");
        expect((await getFirstResult(grpcServer.BidiTestService.bidiFn1))[0]).toBe("hello");
    });

    test("client -> server (metadata)", async () => {
        await grpcClient.BidiTestService.bidiFn2.context({
            metadata: {
                age: 25,
            },
        });
        await grpcClient.BidiTestService.bidiFn2("ryan");
        expect((await getFirstResult(grpcServer.BidiTestService.bidiFn2))[0]).toBe("ryan");
        expect((await grpcServer.BidiTestService.bidiFn2.context).metadata.age).toBe(25);
    });

    test("server -> client", async () => {
        await grpcServer.BidiTestService.bidiFn1("hello");
        expect((await getFirstResult(grpcClient.BidiTestService.bidiFn1))[0]).toBe("hello");
    });
});
