import { describe, expect, test } from "bun:test";
import type { GrpcObject, ServiceClientConstructor, ServiceDefinition } from "@grpc/grpc-js";
import { client, type clientSignature, server, type serverSignature } from "../core/rpc-signatures";
import { Service } from "../core/service";
import { buildProtoString, buildServiceProto } from "../runtime/proto-builder";
import { loadProtoFromString } from "../utils/proto-loader";

function normalizeGrpcObject(descriptor: GrpcObject): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(descriptor)) {
        if (!value) continue;
        if (isServiceConstructor(value)) {
            normalized[key] = normalizeServiceDefinition(value.service);
            continue;
        }
        if (typeof value === "object") {
            normalized[key] = normalizeGrpcObject(value as GrpcObject);
        }
    }
    return normalized;
}

function isServiceConstructor(value: unknown): value is ServiceClientConstructor & { service: ServiceDefinition<any> } {
    return typeof value === "function" && typeof (value as ServiceClientConstructor).service === "object";
}

function normalizeServiceDefinition(service: ServiceDefinition<any>) {
    return Object.fromEntries(
        Object.entries(service).map(([methodName, definition]) => [
            methodName,
            {
                path: definition.path,
                requestStream: definition.requestStream ?? false,
                responseStream: definition.responseStream ?? false,
            },
        ]),
    );
}

describe("proto generation test", async () => {
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

    test("server and client service proto idiomatic", () => {
        expect(buildServiceProto(UnaryServerImpl)).toEqual(buildServiceProto(UnaryClientImpl));
    });

    test("server and client proto string idiomatic", () => {
        expect(buildProtoString([UnaryServerImpl])).toEqual(buildProtoString([UnaryClientImpl]));
    });

    test("server and client proto idiomatic", () => {
        const serverDescriptor = loadProtoFromString(buildProtoString([UnaryServerImpl]));
        const clientDescriptor = loadProtoFromString(buildProtoString([UnaryClientImpl]));
        expect(normalizeGrpcObject(serverDescriptor)).toEqual(normalizeGrpcObject(clientDescriptor));
    });
});
