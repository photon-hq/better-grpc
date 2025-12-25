import { bidi } from "better-grpc";
import { Service } from "better-grpc";

export abstract class ExampleService extends Service("ExampleService") {
    bidiFn1 = bidi<(count: number) => void>()({ack: true})
}