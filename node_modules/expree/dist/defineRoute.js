"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineRoute = void 0;
/**
 *
 * Define your route eg:
 *
 * ```ts
 * export const get = defineRoute({
 *  validate: (joi) => ({
 *   query: {
 *    userId: joi.string().required()
 *  }
 * }),
 * handler: async (req, res) => {
 *  const { userId } = req.query
 *  return { success: true }
 * }
 * ```
 *
 */
var defineRoute = function (opts) { return opts; };
exports.defineRoute = defineRoute;
