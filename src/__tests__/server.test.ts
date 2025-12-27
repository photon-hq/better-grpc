import { describe, expect, test } from "bun:test";
import { client, server } from "../core";
import { Service } from "../core/service";
import { createGrpcClient } from "../runtime/grpc-client";
import { createGrpcServer } from "../runtime/grpc-server";

describe("server side test", async () => {
    abstract class UnaryTestService extends Service("UnaryTestService") {
        clientFn1 = client<() => number>();
        clientFn2 = client<(value: number) => number>();
        clientFn3 = client<(value1: number, value2: number) => number>();
        clientFn4 = client<(value: { sub1: number; sub2: number }) => number>();
        clientFn5 =
            client<(value1: { sub1: number; sub2: number }, value2: { sub1: string; sub2: string }) => number>();
        clientFn6 = client<(value: number) => [number, number]>();
        serverFn1 = server<() => number>();
    }

    let clientValue = 1;

    const UnaryServerImpl = UnaryTestService.Server({
        serverFn1: async () => {
            return 1;
        },
    });

    const UnaryClientImpl = UnaryTestService.Client({
        clientFn1: async () => {
            clientValue += 1;
            return clientValue;
        },
        clientFn2: async (value: number) => {
            return value + 1;
        },
        clientFn3: async (value1: number, value2: number) => {
            return value1 + value2;
        },
        clientFn4: async (value: { sub1: number; sub2: number }) => {
            return value.sub1 + value.sub2;
        },
        clientFn5: async (value1: { sub1: number; sub2: number }, value2: { sub1: string; sub2: string }) => {
            return value1.sub1 + value2.sub1.length + value1.sub2 + value2.sub2.length;
        },
        clientFn6: async (value: number) => {
            return [value, value + 1];
        },
    });

    const grpcServer = await createGrpcServer(50002, UnaryServerImpl);
    const grpcClient = await createGrpcClient("0.0.0.0:50002", UnaryClientImpl);

    test("unary without input", async () => {
        expect(await grpcServer.UnaryTestService.clientFn1()).toBe(2);
        expect(await grpcServer.UnaryTestService.clientFn1()).toBe(3);
        expect(await grpcServer.UnaryTestService.clientFn1()).toBe(4);
    });

    test("unary with single input", async () => {
        expect(await grpcServer.UnaryTestService.clientFn2(1)).toBe(2);
        expect(await grpcServer.UnaryTestService.clientFn2(2)).toBe(3);
        expect(await grpcServer.UnaryTestService.clientFn2(3)).toBe(4);
    });

    test("unary with multiple inputs", async () => {
        expect(await grpcServer.UnaryTestService.clientFn3(1, 2)).toBe(3);
        expect(await grpcServer.UnaryTestService.clientFn3(2, 3)).toBe(5);
        expect(await grpcServer.UnaryTestService.clientFn3(3, 4)).toBe(7);
    });

    test("unary with object input", async () => {
        expect(await grpcServer.UnaryTestService.clientFn4({ sub1: 1, sub2: 2 })).toBe(3);
        expect(await grpcServer.UnaryTestService.clientFn4({ sub1: 2, sub2: 3 })).toBe(5);
        expect(await grpcServer.UnaryTestService.clientFn4({ sub1: 3, sub2: 4 })).toBe(7);
    });

    test("unary with multiple object inputs", async () => {
        expect(await grpcServer.UnaryTestService.clientFn5({ sub1: 1, sub2: 2 }, { sub1: "a", sub2: "b" })).toBe(5);
        expect(await grpcServer.UnaryTestService.clientFn5({ sub1: 2, sub2: 3 }, { sub1: "aa", sub2: "bb" })).toBe(9);
        expect(await grpcServer.UnaryTestService.clientFn5({ sub1: 3, sub2: 4 }, { sub1: "aaa", sub2: "bbb" })).toBe(
            13,
        );
    });

    test("unary with array output", async () => {
        expect(await grpcServer.UnaryTestService.clientFn6(1)).toEqual([1, 2]);
        expect(await grpcServer.UnaryTestService.clientFn6(2)).toEqual([2, 3]);
        expect(await grpcServer.UnaryTestService.clientFn6(3)).toEqual([3, 4]);
    });

    test("unary with clientId calls specific client", async () => {
        // Get the default client ID
        const defaultClientId = grpcClient.clientID;

        expect(defaultClientId).toBeDefined();

        // Call using explicit clientId
        const serviceWithClientId = grpcServer.UnaryTestService(defaultClientId);
        expect(await serviceWithClientId.clientFn2(10)).toBe(11);
        expect(await serviceWithClientId.clientFn3(5, 7)).toBe(12);
    });
});
