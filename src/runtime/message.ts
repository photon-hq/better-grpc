import { decode, encode } from "@msgpack/msgpack";

export function encodeRequestMessage(id: string | undefined, value: any[] | undefined) {
    return {
        id,
        value: value === undefined ? undefined : encode(value),
    };
}

export function decodeRequestMessage(message: any): [id: string | undefined, data: any[]] {
    const id = message.id;
    const mapData: any[] = message.value === undefined ? [] : (decode(message.value) as any[]);
    return [id, mapData];
}

export function encodeResponseMessage(id: string | undefined, value: any) {
    return {
        id,
        value: value === undefined ? undefined : encode(value),
    };
}

export function decodeResponseMessage(message: any): [id: string | undefined, data: any] {
    const id = message.id;
    const mapData: any = message.value === undefined ? undefined : (decode(message.value) as any);
    return [id, mapData];
}
