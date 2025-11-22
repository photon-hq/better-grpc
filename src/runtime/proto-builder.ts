import type { ServiceImpl } from "../core/service";

export function buildProtoString<T extends ServiceImpl<any, any>>(base: T) {
    const definition = Reflect.construct(base.serviceClass as new () => any, []);
    const fields = Object.entries(definition)
    
    let methods = ""
    
    for (const [name, value] of fields) {
        switch ((value as any).type) {
            case "server":
                // console.log(`rpc ${name}(google.protobuf.Struct) returns (google.protobuf.Struct) {}`);
                break;
            case "client":
                methods += `rpc ${name.toLocaleUpperCase()}(BetterGrpcMessage) returns (BetterGrpcMessage);`;
                break;
            default:
                throw new Error(`Unsupported type: ${(value as any).type}`);
        }
        methods += "\n\n";
    }
    
    methods = methods.trim();
    
    const proto = `
syntax = "proto3";

import "google/protobuf/struct.proto";

service ${base.serviceClass.serviceName} {
    ${methods}
}

message BetterGrpcMessage {
    optional string id = 1;
    optional google.protobuf.Struct value = 2;
}`;
    
    return proto.trim();
}
