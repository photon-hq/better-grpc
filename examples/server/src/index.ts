import { createGrpcServer } from "better-grpc";
import { impl } from "./impl";

const grpcServer = await createGrpcServer(50051, impl);

(async () => {
    for await (const [count] of grpcServer.ExampleService.bidiFn1) {
        await grpcServer.ExampleService.bidiFn1(count + 1);
    }
})();