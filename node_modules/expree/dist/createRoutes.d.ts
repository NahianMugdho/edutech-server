import { OpenAPIGenerator } from '@asteasolutions/zod-to-openapi';
import { Express } from 'express';
/** Options for route locations and prefixes */
export interface CreateRoutesOption {
    /**
     * The directory to find all of the routes. Defaults to 'routes'.
     * Can be an absolute path or a relative path to the app root.
     */
    routesDirectory: string;
    /**
     * The prefix to add to all routes. Defaults to '/'.
     */
    routePrefix?: string;
    /**
     * The swagger docs definition generator. Uses: https://github.com/asteasolutions/zod-to-openapi
     * @example
     *
     * ```ts
     * generateSwaggerDocument(generator) {
     *   return generator.generateDocument({
     *    openapi: '3.0.0',
     *    info: {
     *      version: '1.0.0',
     *        title: 'My API',
     *        description: 'This is the API'
     *    }
     *  })
     * }
     * ```
     */
    generateSwaggerDocument?: (generator: OpenAPIGenerator) => ReturnType<OpenAPIGenerator['generateDocument']>;
    /** The route path that the docs should be hosted at. Defualts to '/docs' */
    swaggerDocsPath?: string;
}
/** Create all the routes and register them in the express app */
export declare const createRoutes: (app: Express, options?: CreateRoutesOption | CreateRoutesOption[]) => Promise<Express>;
