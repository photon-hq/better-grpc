import type { ServiceImpl } from "../core/service";

function buildProtoString<T extends ServiceImpl<any, any>>(base: T) {
    const proto = `service ${base.serviceName} {
        
    }`;
}