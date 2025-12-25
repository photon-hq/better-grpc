import { createGrpcClient } from "../../../dist";
import { impl } from "./impl";

const grpcClient = await createGrpcClient("0.0.0.0:50051", impl);

let count = 0;

(async () => {
    for await (const [newCount] of grpcClient.ExampleService.bidiFn1) {
        if (newCount == count) {

            await grpcClient.ExampleService.bidiFn1(count)
            count += 1
        } else {
            console.log(`Received unexpected count: ${newCount}`)
        }
    }
})();

await grpcClient.ExampleService.bidiFn1(count)
count += 1;