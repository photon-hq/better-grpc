import { toStruct } from "../utils/struct";

export function buildMessage(id: string | undefined, data: any[]) {
    const mapData: Record<number, any> = {}
    for (let i = 0; i < data.length; i++) {
        mapData[i] = data[i];
    }
    
    return {
        id,
        value: toStruct(mapData)
    }
}