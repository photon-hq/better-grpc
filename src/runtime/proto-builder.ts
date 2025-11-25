import type { ServiceImpl } from "../core/service";

export function buildProtoString<T extends ServiceImpl<any, any>[]>(services: T) {
    const proto = `
syntax = "proto3";

${services.map((s) => buildServiceProto(s)).join("\n\n")}

message BetterGrpcMessage {
    optional string id = 1;
    optional bytes value = 2;
}`;

    return proto.trim();
}

export function buildServiceProto<T extends ServiceImpl<any, any>>(base: T) {
    let methods = "";

    for (const [name, value] of Object.entries(base.methods())) {
        const serviceType = value.serviceType;
        const methodType = value.methodType;
        const key = `${serviceType}:${methodType}`;

        switch (key) {
            case "server:unary":
                methods += `rpc ${name.toUpperCase()}(BetterGrpcMessage) returns (BetterGrpcMessage);`;
                break;
            case "client:unary":
                methods += `rpc ${name.toUpperCase()}(stream BetterGrpcMessage) returns (stream BetterGrpcMessage);`;
                break;
            case "bidi:bidi":
                methods += `rpc ${name.toUpperCase()}(stream BetterGrpcMessage) returns (stream BetterGrpcMessage);`;
                break;
            default:
                throw new Error(`Unsupported type: ${serviceType} ${methodType}`);
        }
        methods += "\n\n    ";
    }

    return `service ${base.serviceClass.serviceName} {
    ${methods.trim()}
}`;
}
