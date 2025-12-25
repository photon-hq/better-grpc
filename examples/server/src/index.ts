import { createGrpcServer } from "better-grpc";
import { impl } from "./impl";

const grpcServer = await createGrpcServer(50051, impl);

let countCheckpoint = 0;

(async () => {
    for await (const [count] of grpcServer.ExampleService.bidiFn1) {
        countCheckpoint = count;
        console.log(`Received count: ${count}`)
        await grpcServer.ExampleService.bidiFn1(count + 1);
    }
    console.log(`Bidi end with checkpoint count: ${countCheckpoint}`)
})();