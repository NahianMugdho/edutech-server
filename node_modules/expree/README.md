# Expree

A better way to Express.

Expree uses a directory structure routing system and provides a thin wrapper around express to make your API service.

# How to use

Check out the examples in [./example-app](https://github.com/JamieCurnow/expree/tree/main/example-app) for details

## Setup

The `createRoutes` function does the magic. It will look deeply in a directory (by default in the './routes' dir) and find any files in there. It will keep track of the direcrory path and map that to a route. For example, if it finds a file in `/routes/user/verify-email.ts` it will register a new express route at `/user/verify-email` using the contents of that file for the handler of the route (see `defineRoute()` and `defineRoutes()`).

The `createRoutes` function takes the express app as the first argument, so you'll need to set up express as normal before calling it. Set up body parsing if you want to use validation using `express.json` as per the example below.

Once express is set up, you'll need to call `createsRoutes(app)` and then await that promise by using `.then` unless you can top-level await. Once the routes have all been created and registerred to the express app, you just need to run `app.listen()` as you normally would to start up the server.

Here's a complete example:

```ts
import express from 'express'
import { createRoutes } from 'expree'

// Normal express stuff
const app = express()

// Body parser is required for body validation
app.use(express.json({ limit: '50mb' }))

// Create the routes and then start the server
createRoutes(app).then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`)
  })
})
```

`createRoutes` can also take some options as a second argument. This allows you to tell expree to register routes from a different directory, and optionally prefix all of those routes:

```ts
import express from 'express'
import { createRoutes } from 'expree'

// Normal express stuff
const app = express()

// Body parser is required for body validation
app.use(express.json({ limit: '50mb' }))

// Create the routes and then start the server
createRoutes(app, { routesDirectory: 'appRoutes', routePrefix: '/app' }).then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`)
  })
})
```

In the above example, expree will look in `./appRoutes` for any files and register them with the express app, with a route the is prefixed by `/app`. For example, if you have a file at `./appRoutes/user/verify-email` then expree would register a route in express at the path `/app/user/verify-email`. This is useful for versioning routes or for creating dev routes.

You can also pass an array of objects as the second argument to register routes from multiple directories:

```ts
import express from 'express'
import { createRoutes } from 'expree'

// Normal express stuff
const app = express()

// Body parser is required for body validation
app.use(express.json({ limit: '50mb' }))

// where to find the routes:
const routeDirs = [
  { routesDirectory: 'versionOneRoutes', routePrefix: '/v1' },
  { routesDirectory: 'versionTwoRoutes', routePrefix: '/v2' },
  { routesDirectory: 'devRoutes', routePrefix: '/dev' }
]

// Create the routes and then start the server
createRoutes(app, routeDirs).then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`)
  })
})
```

You can also set up swagger docs in the optoins object by using the `generateSwaggerDocument` function and the `swaggerDocsPath` key. Under the hood this uses https://github.com/asteasolutions/zod-to-openapi.

```ts
import express from 'express'
import { createRoutes } from 'expree'

// Normal express stuff
const app = express()

// Body parser is required for body validation
app.use(express.json({ limit: '50mb' }))

// Create the routes and then start the server
createRoutes(app, {
    routesDirectory: 'routes',
    routePrefix: '/',
    generateSwaggerDocument: (generator: OpenAPIGenerator) => {
      return generator.generateDocument({
        openapi: '3.0.0',
        info: {
          version: '1.0.0',
          title: 'Test API',
          description: 'These are the swagger docs!'
        }
      })
    },
    swaggerDocsPath: '/docs'
  }).then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`)
  })
})
```

## Route files

The actual files in the route directory need to follow some basic rules in order to properly register routes with express. First they need to either export a defualt export using `defineRoutes()` or they need to export named exports using `defineRoute()`. Note the difference in those two `defineRoutes / defineRoute`.

The `defineRoutes()` function takes an object as it's only arument. This object has keys for all HTTP methods. The value of the keys should be a `defineRoute()` function. Eg:

```ts
import { defineRoutes, defineRoute } from 'expree'

export default defineRoutes({
  get: defineRoute({
    //...
  }),
  post: defineRoute({
    //...
  }),
  put: defineRoute({
    //...
  }),
  delete: defineRoute({
    //...
  })
})
```

The other way to register routes is by using named exports for the http methods that you want to register for the route path. Eg:

```ts
import { defineRoute } from 'expree'

export const get = defineRoute({
  //...
})

export const post = defineRoute({
  //...
})

// etc
```

---

## Options

### `createRoutes(app: Express, options?: CreateRoutesOption | CreateRoutesOption[])`

The `createRoutes` function has a required first argument of the express app.

It's second argument is optional and can be either a `CreateRoutesOption` object or an array of `CreateRoutesOption` objects as defined below:

```ts
/** Options for route locations and prefixes */
interface CreateRoutesOption {
  /**
   * The directory to find all of the routes. Defaults to 'routes'.
   * Can be an absolute path or a relative path to the app root.
   */
  routesDirectory: string
  /**
   * The prefix to add to all routes. Defaults to '/'.
   */
  routePrefix?: string
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
  generateSwaggerDocument?: (generator: OpenAPIGenerator) => ReturnType<OpenAPIGenerator['generateDocument']>
  /** The route path that the docs should be hosted at. Defualts to '/docs' */
  swaggerDocsPath?: string
}
```

---

### `defineRoutes()`

The `defineRoutes()` function takes an object as it's first and only arument.

This object should contain keys named for the http methods that you would like to register at this route. The available keys are:

```ts
export type RouteTypes =
  | 'get'
  | 'post'
  | 'put'
  | 'delete'
  | 'patch'
```

Each key has the same type - a `defineRoute()` function call as described in the next section.

For example:

```ts
import { defineRoutes, defineRoute } from 'expree'

export default defineRoutes({
  get: defineRoute({
    //...
  }),
  post: defineRoute({
    //...
  }),
  put: defineRoute({
    //...
  }),
  delete: defineRoute({
    //...
  })
})
```

---

### `defineRoute()`

The `defineRoute` function defines your actual handler for the route/http method that you are targetting. It takes a single object as it's only arument. That object looks like this:

```ts
/**
 * The definition of a single route.
 */
export interface RouteDefinition<Req = {}, Res = any, Params = {}, Query = {}> {
  /**
   * Add any middleware to the route
   */
  middleware?: RequestHandler[]
  /**
   * Add Zod validation to the route. Uses https://github.com/Aquila169/zod-express-middleware
   *
   * @example Write the object from scratch
   *
   * ```ts
   * validate: (z) => {
   *   return {
   *    body: z.object({ uid: z.string(), firstName: z.string(), lastName: z.string().optional() })
   *   }
   * }
   * ```
   *
   * @example Use existing zod object
   * ```ts
   * validate: (z) => {
   *   return {
   *    body: z.object(UserInputSchema.shape)
   *   }
   * }
   * ```
   */
  validate?: (zod: typeof z) => {
    /** Zod schema for the body */
    body?: AnyZodObject
    /**  Zod schema for the route params */
    params?: AnyZodObject
    /**  Zod schema for the route query params */
    query?: AnyZodObject
  }
  /**
   * The route handler, has two arguments:
   *
   * req: The express request object
   * res: The express response object
   */
  handler?: (
    req: ExpressRequest<Params, Res, Req, Query>,
    res: ExpressResponse<Res>
  ) => Promise<Res | ExpressResponse<Res>> | Res | ExpressResponse<Res>

  /**
   * Use the registry to create a swagger doc for this endpoint.
   * See: https://github.com/asteasolutions/zod-to-openapi#defining-routes
   */
  swaggerZod?: (registry: OpenAPIRegistry, routeMeta: RouteMeta) => void
}
```

## Middleware

`middleware` is an optional array of express middleware. This is akin to adding middleware to a normal express route.

For example, a normal express registration may look like this:

```ts
app.post('/user/verify-email', someMiddleware, moreMiddleware, (req, res) => res.status(200).send('hello'))
```

In expree, you make a new file under `routes/user/verify-email.ts` that looks like this:

```ts
import { defineRoute } from 'expree'

export const post = defineRoute({
  middleware: [someMiddleware, moreMiddleware],
  handler(req, res) {
    return 'hello'
  }
})
```

## Handlers

You may have noticed a hint above as to how you write route handlers with expree - the `handler` key!

`handler` is a function that gets access to the express `req` and `res` objects. It's a very thin wrapper around express, can be async, and has one piece of magic - whatever is returned from the function will be wrapped in a `res.send()` and send back to the client. This makes it less verbose.

For example, a normall express handler may look like this:

```ts
app.get('/user/settings', async (req, res) => {
  const userSettings = await getUserSettings()
  return res.status(200).send(userSettings)
})
```

In expree, you would make a file at `/routes/user/settings` that looks like this:

```ts
import { defineRoute } from 'expree'

export const get = defineRoute({
  async handler(req, res) {
    const userSettings = await getUserSettings()
    return userSettings
  }
})
```

For real simple routes, this can be very concise. Imagine a file at `/routes/ping`

```ts
import { defineRoute } from 'expree'

export const get = defineRoute({ handler: () => 'Hello world' })
```

Hopefully you can see how organising your routes in directory structures makes life nice and simple and organised.

## Validation

The next thing to know about on the `defineRoute()` options is `validate`. This provides `Zod` validation using [`zod-express-middleware`](https://github.com/Aquila169/zod-express-middleware).

The `validate` key is a function that gives you access to `zod` as it's only argument. Then you can set validation rules for the body, query, params, etc (see the [`zod-express-middleware` docs](https://github.com/Aquila169/zod-express-middleware))

Eg:

```ts
import { defineRoute } from 'expree'

export const post = defineRoute({
  validate: (zod) => ({
    body: {
      firstName: zod.string()
    }
  }),

  async handler(req, res) {
    const { firstName } = req.body
    const newUser = await updateUser({ firstName })
    return newUser
  }
})
```

You can then abstract these validations so that you can use them around your app.

Imagine defining a user input validation:

```ts
import { z } from 'zod'

export const userInputValidation = z.object({
  firstName: z.string(),
  lastName: z.string(),
  dateOfBirth: z.string().optional()
})
```

Then use that validation in different routes around your app:

```ts
// /routes/user/update

import { defineRoute } from 'expree'
import { userInputValidation } from '../utils/validation/userInputValidation`

export const post = defineRoute({
  validate: (zod) => ({
    body: zod.object(userInputValidation.shape)
  }),

  async handler(req, res) {
    const { firstName } = req.body
    const newUser = await updateUser({ firstName })
    return newUser
  }
})
```

## Documentation

The last thing to know about is the `swaggerZod` key in the `defineRoute` object. This key allows you to add a swagger doc for the route. Under the hood we're using [zod-to-openapi](https://github.com/asteasolutions/zod-to-openapi#defining-routes) to make the json swagger document definition and [swagger-ui-express](https://github.com/scottie1984/swagger-ui-express) to generate the docs and serve them at a given route.

**IMPORTANT** - for this to work, you must add a `generateSwaggerDocument` function to the main `createRoutes` optoins in order to generate a 'registery' to add documentation to for the route and define the root level swagger docs config. eg:

```ts
createRoutes(app, {
    routesDirectory: 'routes',
    routePrefix: '/',
    generateSwaggerDocument: (generator: OpenAPIGenerator) => {
      return generator.generateDocument({
        openapi: '3.0.0',
        info: {
          version: '1.0.0',
          title: 'Test API',
          description: 'These are the swagger docs!'
        }
      })
    },
    swaggerDocsPath: '/docs'
  }).then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`)
  })
})
```

Then in your `defineRoute` options you can add a `swaggerZod` key which should be a function. The function gets access to the `registery` as it's first argument ([see docs](https://github.com/asteasolutions/zod-to-openapi#defining-routes)), and some meta about the route as it's second argument `RouteMeta`:

```ts
/** Inferred meta data about this route, including path, method etc */
export interface RouteMeta {
  path: string
  method: RouteTypes
}
```

It also gives you access to zod as a third arument.

Here is the `swaggerZod` functoin signature:

```ts
swaggerZod?: (registry: OpenAPIRegistry, routeMeta: RouteMeta, zod: typeof z) => void
```

This allows you to easily add to the swagger docs for this route:

```ts
// /routes/user/update

import { defineRoute } from 'expree'
import { z } from 'zod'

const UserSchema = z.object({
  uid: z.string().required(),
  email: z.string().required(),
  firstName: z.string().required()
})

const UserInputSchema = UserSchema.pick({ firstName: true })

type User = z.infer<typeof UserSchema>
type UserInput = z.infer<typeof UserInputSchema>

export const post = defineRoute<UserInput, User>({
  validate: (zod) => ({
    body: UserInputSchema
  }),

  async handler(req, res) {
    const { firstName } = req.body
    const newUser = await updateUser({ firstName })
    return newUser
  },

  swaggerZod(registry, meta, zod) {
    // const { path, method } = meta
    registry.registerPath({
      ...meta,
      description: 'Update a user',
      request: {
        body: UserInputSchema.openapi({ description: 'The user input object' })
      },
      responses: {
        200: {
          mediaType: 'application/json',
          schema: UserSchema.openapi({ description: 'The new user object' })
        }
      }
    })
  }
})
```

## Typescript!

expree has out of the box, first-class typescript support. All the options for all methods are typed, and we have a little TS trick up our sleeves...

You can type the `Request`, `Response`, `Params` and `Query` for a route by passing them in to a `defineRoute()` call as type generics. Eg:

```ts
import { defineRoute } from 'expree'

interface Req {
  firstName: string
  lastName: string
}

type Res = string

export const post = defineRoute<Req, Res>({
  async handler(req, res) {
    const { firstName } = req.body //  TS knows this is a string
    const { unknownKey } = req.body // TS Error - unknownKey doesn't exist on type Req

    return 'Ok' // you must return a string as you specified in the types
  }
})
```

The full type generic aruments are:

`<Req = {}, Res = any, Params = {}, Query = {}>`

This allows you to strongly type your api endpoints 🙌
