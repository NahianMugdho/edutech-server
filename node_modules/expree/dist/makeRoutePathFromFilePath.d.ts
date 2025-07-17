/** Remove double and trailing slashes from the route path and make sure it starts with a slash */
export declare const cleanRoutePath: (path: string) => string;
/** Turns the dir path into a route path. Eg. __dirname/user/verify.ts => /user/verify */
export declare const makeRoutePathFromFilePath: (filePath: string, rootDir: string, routePrefix: string) => string;
