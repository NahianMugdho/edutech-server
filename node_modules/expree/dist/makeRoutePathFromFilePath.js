"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeRoutePathFromFilePath = exports.cleanRoutePath = void 0;
var path = __importStar(require("path"));
/** Remove double and trailing slashes from the route path and make sure it starts with a slash */
var cleanRoutePath = function (path) {
    return "/".concat(path).replace(/\/+/gm, '/').replace(/\/$/gm, '');
};
exports.cleanRoutePath = cleanRoutePath;
/** Turns the dir path into a route path. Eg. __dirname/user/verify.ts => /user/verify */
var makeRoutePathFromFilePath = function (filePath, rootDir, routePrefix) {
    var routePath = filePath
        // make sure we're in posix
        .split(path.sep)
        .join(path.posix.sep)
        // remove directory path
        .split(rootDir)
        .join('')
        // Remove file extension
        .split('.')
        .slice(0, -1)
        .join('.')
        // remove index
        .split('/index')
        .join('')
        // replace /_ with /: for dynamic routes
        .split('/_')
        .join('/:');
    // add the route prefix
    var routePathPrefixed = "/".concat(routePrefix, "/").concat(routePath);
    // return the cleaned path
    return (0, exports.cleanRoutePath)(routePathPrefixed);
};
exports.makeRoutePathFromFilePath = makeRoutePathFromFilePath;
