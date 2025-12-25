import { createGrpcClient } from "better-grpc";
import { impl } from "./impl";

const grpcClient = await createGrpcClient("grpc-test.photon.codes:443", impl);

let count = 0;

(async () => {
    for await (const [newCount] of grpcClient.ExampleService.bidiFn1) {
        if (newCount == count) {
            console.log(`Received expected count: ${newCount}`)
            await grpcClient.ExampleService.bidiFn1(count)
            count += 1
        } else {
            console.log(`Received unexpected count: ${newCount}`)
        }
    }
})();

await grpcClient.ExampleService.bidiFn1(count)
count += 1;