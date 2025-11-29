import { Metadata } from "nice-grpc";
import type { z } from "zod";

export function encodeMetadata(raw: z.infer<z.ZodObject<any>>) {
    const m = new Metadata();
    m.set("better-grpc", JSON.stringify(raw));
    return m;
}

export function decodeMetadata(metadata: Metadata): z.infer<z.ZodObject<any>> {
    const betterGrpcMetadata = metadata.get("better-grpc");
    if (!betterGrpcMetadata) {
        throw new Error("Failed to decode metadata: 'better-grpc' key not found in gRPC metadata");
    }
    return JSON.parse(betterGrpcMetadata);
}
