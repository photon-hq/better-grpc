export type StructLike = { fields?: Record<string, any> };

export function toStruct(obj: any, ancestors: WeakSet<object> = new WeakSet()): StructLike {
    // Structs must be key/value objects. For non-objects, return empty fields.
    if (obj === null || typeof obj !== "object") {
        return { fields: {} };
    }

    // If someone passes a Set as the top-level object, Struct cannot represent it directly.
    // They should embed Sets inside an object field instead. We'll still return empty fields here.
    const fields: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj ?? {})) {
        if (value === null) {
            fields[key] = { nullValue: 0 };
        } else if (typeof value === "number") {
            fields[key] = { numberValue: value };
        } else if (typeof value === "string") {
            fields[key] = { stringValue: value };
        } else if (typeof value === "boolean") {
            fields[key] = { boolValue: value };
        } else if (typeof value === "bigint") {
            fields[key] = { stringValue: value.toString() };
        } else if (value instanceof Set) {
            if (ancestors.has(value)) {
                fields[key] = { stringValue: "[Circular]" };
            } else {
                ancestors.add(value);
                const values = Array.from(value, (v) => toStructValue(v, ancestors));
                ancestors.delete(value);
                fields[key] = { listValue: { values } };
            }
        } else if (Array.isArray(value)) {
            if (ancestors.has(value)) {
                fields[key] = { stringValue: "[Circular]" };
            } else {
                ancestors.add(value);
                fields[key] = { listValue: { values: value.map((v) => toStructValue(v, ancestors)) } };
                ancestors.delete(value);
            }
        } else if (typeof value === "object") {
            if (ancestors.has(value)) {
                fields[key] = { stringValue: "[Circular]" };
            } else {
                ancestors.add(value);
                fields[key] = { structValue: toStruct(value, ancestors) };
                ancestors.delete(value);
            }
        }
        // Unsupported types (symbol, function, undefined) are skipped to stay compatible with prior behavior.
    }
    return { fields };
}

function toStructValue(value: any, ancestors: WeakSet<object> = new WeakSet()): any {
    if (value === null) return { nullValue: 0 };
    if (typeof value === "number") return { numberValue: value };
    if (typeof value === "string") return { stringValue: value };
    if (typeof value === "boolean") return { boolValue: value };
    if (typeof value === "bigint") return { stringValue: value.toString() };

    if (value instanceof Set) {
        if (ancestors.has(value)) return { stringValue: "[Circular]" };
        ancestors.add(value);
        const values = Array.from(value, (v) => toStructValue(v, ancestors));
        ancestors.delete(value);
        return { listValue: { values } };
    }

    if (Array.isArray(value)) {
        if (ancestors.has(value)) return { stringValue: "[Circular]" };
        ancestors.add(value);
        const values = value.map((v) => toStructValue(v, ancestors));
        ancestors.delete(value);
        return { listValue: { values } };
    }

    if (typeof value === "object") {
        if (ancestors.has(value)) return { stringValue: "[Circular]" };
        ancestors.add(value);
        const structValue = toStruct(value, ancestors);
        ancestors.delete(value);
        return { structValue };
    }

    // Unsupported types -> empty value (same behavior as before).
    return {};
}

export function fromStruct(struct: StructLike | null | undefined): any {
    if (!struct?.fields) return {};
    const obj: Record<string, any> = {};
    for (const [key, value] of Object.entries(struct.fields)) {
        if ((value as any).nullValue !== undefined) obj[key] = null;
        else if ((value as any).numberValue !== undefined) obj[key] = (value as any).numberValue;
        else if ((value as any).stringValue !== undefined) obj[key] = (value as any).stringValue;
        else if ((value as any).boolValue !== undefined) obj[key] = (value as any).boolValue;
        else if ((value as any).structValue !== undefined) obj[key] = fromStruct((value as any).structValue);
        else if ((value as any).listValue !== undefined)
            obj[key] = (value as any).listValue.values.map((v: any) => fromStruct({ fields: { tmp: v } }).tmp);
    }
    return obj;
}
