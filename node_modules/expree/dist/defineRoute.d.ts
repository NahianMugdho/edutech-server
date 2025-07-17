import { DefineRoute } from './types';
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
export declare const defineRoute: DefineRoute;
