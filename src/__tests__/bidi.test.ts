import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { bidi } from "../core/base";
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
        bidiFn3 = bidi<(name: string) => void>()({
            ack: true,
        });
    }

    const BidiServerImpl = BidiTestService.Server({});

    const BidiClientImpl = BidiTestService.Client({});

    const grpcServer = await createGrpcServer(50003, BidiServerImpl);
    const grpcClient = await createGrpcClient("0.0.0.0:50003", BidiClientImpl);

    async function getResult(generator: AsyncGenerator<any>, firstN: number = 1): Promise<any[]> {
        return new Promise((resolve) => {
            (async () => {
                const result = [];
                for await (const value of generator) {
                    result.push(value);
                    if (result.length === firstN) {
                        resolve(result);
                    }
                }
            })();
        });
    }

    test("client -> server", async () => {
        await grpcClient.BidiTestService.bidiFn1("hello");
        await grpcClient.BidiTestService.bidiFn1("world");
        expect(await getResult(grpcServer.BidiTestService.bidiFn1, 2)).toEqual([["hello"], ["world"]]);
    });

    test("client -> server (metadata)", async () => {
        await grpcClient.BidiTestService.bidiFn2.context({
            metadata: {
                age: 25,
            },
        });
        await grpcClient.BidiTestService.bidiFn2("ryan");
        expect((await getResult(grpcServer.BidiTestService.bidiFn2))[0][0]).toBe("ryan");
        expect((await grpcServer.BidiTestService.bidiFn2.context).metadata.age).toBe(25);
    });

    test("server -> client", async () => {
        await grpcServer.BidiTestService.bidiFn1("hello");
        expect((await getResult(grpcClient.BidiTestService.bidiFn1))[0][0]).toBe("hello");
    });

    test("client -> server (ack)", async () => {
        const order: string[] = [];

        const clientPromise = (async () => {
            await grpcClient.BidiTestService.bidiFn3("hello");
            order.push("client_done");
        })();

        const serverResult = await getResult(grpcServer.BidiTestService.bidiFn3);
        order.push("server_received");

        await clientPromise;

        expect(serverResult[0][0]).toBe("hello");
        expect(order).toEqual(["server_received", "client_done"]);
    });

    test("server -> client (ack)", async () => {
        const order: string[] = [];

        const serverPromise = (async () => {
            await grpcServer.BidiTestService.bidiFn3("hello");
            order.push("server_done");
        })();

        const clientResult = await getResult(grpcClient.BidiTestService.bidiFn3);
        order.push("client_received");

        await serverPromise;

        expect(clientResult[0][0]).toBe("hello");
        expect(order).toEqual(["client_received", "server_done"]);
    });

    test("client -> server (without ack)", async () => {
        const order: string[] = [];

        const clientPromise = (async () => {
            await grpcClient.BidiTestService.bidiFn1("hello");
            order.push("client_done");
        })();

        const serverResult = await getResult(grpcServer.BidiTestService.bidiFn1);
        order.push("server_received");

        await clientPromise;

        expect(serverResult[0][0]).toBe("hello");
        expect(order).toEqual(["client_done", "server_received"]);
    });

    test("server -> client (without ack)", async () => {
        const order: string[] = [];

        const serverPromise = (async () => {
            await grpcServer.BidiTestService.bidiFn1("hello");
            order.push("server_done");
        })();

        const clientResult = await getResult(grpcClient.BidiTestService.bidiFn1);
        order.push("client_received");

        await serverPromise;

        expect(clientResult[0][0]).toBe("hello");
        expect(order).toEqual(["server_done", "client_received"]);
    });
});
