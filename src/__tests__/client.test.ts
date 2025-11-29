import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { client, server } from "../core/rpc-signatures";
import { Service } from "../core/service";
import { createGrpcClient } from "../runtime/grpc-client";
import { createGrpcServer } from "../runtime/grpc-server";

describe("client side test", async () => {
    abstract class UnaryTestService extends Service("UnaryTestService") {
        clientFn1 = client<() => number>();
        serverFn1 = server<() => number>();
        serverFn2 = server<(value: number) => number>();
        serverFn3 = server<(value1: number, value2: number) => number>();
        serverFn4 = server<(value: { sub1: number; sub2: number }) => number>();
        serverFn5 =
            server<(value1: { sub1: number; sub2: number }, value2: { sub1: string; sub2: string }) => number>();
        serverFn6 = server<(value: number) => [number, number]>();
        serverFn7 = server<() => string>()({ metadata: z.object({ name: z.string() }) });
    }

    let serverValue = 1;

    const UnaryServerImpl = UnaryTestService.Server({
        serverFn1: async () => {
            serverValue += 1;
            return serverValue;
        },
        serverFn2: async (value: number) => {
            return value + 1;
        },
        serverFn3: async (value1: number, value2: number) => {
            return value1 + value2;
        },
        serverFn4: async (value: { sub1: number; sub2: number }) => {
            return value.sub1 + value.sub2;
        },
        serverFn5: async (value1: { sub1: number; sub2: number }, value2: { sub1: string; sub2: string }) => {
            return value1.sub1 + value2.sub1.length + value1.sub2 + value2.sub2.length;
        },
        serverFn6: async (value: number) => {
            return [value, value + 1];
        },
        serverFn7: async (context) => {
            return `Hello ${context.metadata.name}`;
        },
    });

    const UnaryClientImpl = UnaryTestService.Client({
        clientFn1: async () => {
            return 2;
        },
    });

    await createGrpcServer(50001, UnaryServerImpl);
    const grpcClient = await createGrpcClient("0.0.0.0:50001", UnaryClientImpl);

    test("unary without input", async () => {
        expect(await grpcClient.UnaryTestService.serverFn1()).toBe(2);
        expect(await grpcClient.UnaryTestService.serverFn1()).toBe(3);
        expect(await grpcClient.UnaryTestService.serverFn1()).toBe(4);
    });

    test("unary with single input", async () => {
        expect(await grpcClient.UnaryTestService.serverFn2(1)).toBe(2);
        expect(await grpcClient.UnaryTestService.serverFn2(2)).toBe(3);
        expect(await grpcClient.UnaryTestService.serverFn2(3)).toBe(4);
    });

    test("unary with multiple inputs", async () => {
        expect(await grpcClient.UnaryTestService.serverFn3(1, 2)).toBe(3);
        expect(await grpcClient.UnaryTestService.serverFn3(2, 3)).toBe(5);
        expect(await grpcClient.UnaryTestService.serverFn3(3, 4)).toBe(7);
    });

    test("unary with object input", async () => {
        expect(await grpcClient.UnaryTestService.serverFn4({ sub1: 1, sub2: 2 })).toBe(3);
        expect(await grpcClient.UnaryTestService.serverFn4({ sub1: 2, sub2: 3 })).toBe(5);
        expect(await grpcClient.UnaryTestService.serverFn4({ sub1: 3, sub2: 4 })).toBe(7);
    });

    test("unary with multiple object inputs", async () => {
        expect(await grpcClient.UnaryTestService.serverFn5({ sub1: 1, sub2: 2 }, { sub1: "a", sub2: "b" })).toBe(5);
        expect(await grpcClient.UnaryTestService.serverFn5({ sub1: 2, sub2: 3 }, { sub1: "aa", sub2: "bb" })).toBe(9);
        expect(await grpcClient.UnaryTestService.serverFn5({ sub1: 3, sub2: 4 }, { sub1: "aaa", sub2: "bbb" })).toBe(
            13,
        );
    });

    test("unary with array output", async () => {
        expect(await grpcClient.UnaryTestService.serverFn6(1)).toEqual([1, 2]);
        expect(await grpcClient.UnaryTestService.serverFn6(2)).toEqual([2, 3]);
        expect(await grpcClient.UnaryTestService.serverFn6(3)).toEqual([3, 4]);
    });

    test("unary with metabdata", async () => {
        expect(await grpcClient.UnaryTestService.serverFn7().withMeta({ name: "World" })).toBe("Hello World");
    });
});
