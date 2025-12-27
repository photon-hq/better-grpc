import { createGrpcServer } from "better-grpc";
import { impl } from "./impl";

const grpcServer = await createGrpcServer(50051, impl);



grpcServer.ExampleService.bidiFn1.listen(({ context, messages, send }) => {
    console.log(`Starting bidiFn1 ${context.client.id}`);
    let countCheckpoint = 0;
    
    (async () => {
        for await (const [count] of messages) {
            countCheckpoint = count;
            console.log(`Received count: ${count}`)
            await send(count + 1);
        }
        console.log(`Bidi end with checkpoint count: ${countCheckpoint}`)
    })();
});