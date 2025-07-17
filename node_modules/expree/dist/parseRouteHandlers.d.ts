import { RequestHandler } from 'express';
import { RouteDefinition } from './types';
import type { z } from 'zod';
export declare const parseRouteHandlers: (route: RouteDefinition, zod: typeof z) => RequestHandler[];
