import { type GrpcObject, loadPackageDefinition } from "@grpc/grpc-js";
import { fromJSON, type Options as ProtoLoaderOptions } from "@grpc/proto-loader";
import { common, parse, Root } from "protobufjs";

const PROTO_OPTIONS: ProtoLoaderOptions = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
};

export function loadProtoFromString(source: string): GrpcObject {
    const bootstrapRoot = new Root();

    const structJson = common.get("google/protobuf/struct.proto");
    if (structJson?.nested) {
        bootstrapRoot.addJSON(structJson.nested);
    }

    const { root } = parse(source, bootstrapRoot);
    const packageDef = fromJSON(root.toJSON(), PROTO_OPTIONS);
    return loadPackageDefinition(packageDef);
}
