import type { ServiceImpl } from "../core/service";

export function buildProtoString<T extends ServiceImpl<any, any>[]>(services: T) {
    const proto = `
syntax = "proto3";

import "google/protobuf/struct.proto";

${services.map(s => buildServiceProto(s)).join("\n\n")}

message BetterGrpcMessage {
    optional string id = 1;
    optional google.protobuf.Struct value = 2;
}`;

    return proto.trim();
}

export function buildServiceProto<T extends ServiceImpl<any, any>>(base: T) {
    const definition = Reflect.construct(base.serviceClass as new () => any, []);
    const fields = Object.entries(definition);

    let methods = "";

    for (const [name, value] of fields) {
        switch ((value as any).type) {
            case "server":
                methods += `rpc ${name.toUpperCase()}(stream BetterGrpcMessage) returns (stream BetterGrpcMessage);`;
                break;
            case "client":
                methods += `rpc ${name.toUpperCase()}(BetterGrpcMessage) returns (BetterGrpcMessage);`;
                break;
            case "bidi":
                methods += `rpc ${name.toUpperCase()}(stream BetterGrpcMessage) returns (stream BetterGrpcMessage);`;
                break;
            default:
                throw new Error(`Unsupported type: ${(value as any).type}`);
        }
        methods += "\n\n    ";
    }

    return `service ${base.serviceClass.serviceName} {
    ${methods.trim()}
}`;
}
