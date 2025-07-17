"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAnyZodType = exports.isZodType = void 0;
function isZodType(schema, typeName) {
    return schema.constructor.name === typeName;
}
exports.isZodType = isZodType;
function isAnyZodType(schema) {
    return '_def' in schema;
}
exports.isAnyZodType = isAnyZodType;
