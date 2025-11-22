import { describe, expect, test } from "bun:test";
import { client, server, type clientSignature, type serverSignature } from "../core/rpc-signatures";
import { createGrpcClient } from "../runtime/grpc-client";
import { createGrpcServer } from "../runtime/grpc-server";
import { Service } from "../core/service";
import { buildProtoString, buildServiceProto } from "../runtime/proto-builder";

describe("proto generation test", async () => {
    abstract class UnaryTestService extends Service("UnaryTestService"){
        clientFn1 = client<() => number>();
        serverFn1 = server<() => number>();
    }
    
    const UnaryServerImpl = UnaryTestService.Server({
        serverFn1: async () => {
            return 1;
        }
    })
    
    const UnaryClientImpl = UnaryTestService.Client({
        clientFn1: async () => {
            return 2;
        }
    })
    
    console.log(buildProtoString([UnaryServerImpl]))
    
    test("server and client service proto idiomatic", () => {
        expect(buildServiceProto(UnaryServerImpl)).toEqual(buildServiceProto(UnaryClientImpl));
    });
    
    test("server and client proto idiomatic", () => {
        expect(buildProtoString([UnaryServerImpl])).toEqual(buildProtoString([UnaryClientImpl]));
    });
    
    // grpcServer.UnaryTestService.clientFn1();
});
