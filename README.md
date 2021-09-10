# static-path

Many web applications have routes defined with Rails/Express-style syntax.
Here's an example with React Router, but the same idea applies to most routers.

```typescript
<Route exact path="/lessons/:lessonId" component={Lesson} />
```

Then other parts of the application link to that route:

```typescript
<a href={`/lessons/${lessonId}`} />
```

The links and the routes don't know about each other.
Each is just a string.


What happens when we want to change the structure of the paths?
For example, maybe we want to include the lesson's course in the path: `'/courses/:courseId/lessons/:lessonId'`.
If we change that route, we also have to change every link that points to a lesson.
Any links that we miss become 404s.
And it's very easy to miss them!

Static-path uses the type system to prevent these 404s at compile time.
In the scenario above, every link to the lesson page causes a type error because it's missing the new `:courseId` param.
That forces us to update each link, ensuring that they match the new route pattern.

## Install

```bash
# with npm
npm install static-path

# with Yarn
yarn add static-path
```

## Usage

Think about your paths, router, and links as three separate pieces:

* You define which paths exist.
* You pass those paths' patterns to your router of choice.
* You link to those paths.

### Defining paths

Create a path by calling the `path` function with a Rails/Express-style route pattern.

The path objects that you get back are functions.
You can generate a concrete path by calling them with some params.
You'll get a type error if you pass unexpected params, or you omit some params, or you give the params the wrong names.

```typescript
import { path } from 'static-path'

const course = path('/courses/:courseId')

// This returns '/courses/typescript'.
course({courseId: 'typescript'})

// All of these are type errors.
course({courseIdMisnamed: 'typescript'})
course({})
course({courseId: 'typescript', someOtherParam: 'some value'})
```

When you have a path object, you can use it to define subpaths.
A subpath gets all of its parent's params, plus whatever additional params you define in its route string.
This is useful for organizing nested paths without duplicating sections of their patterns.

```typescript
const course = path('/courses/:courseId')
const lesson = course.path('/lessons/:lessonId')

// This returns '/courses/typescript/lessons/type-predicates'.
lesson({courseId: 'typescript', lessonId: 'type-predicates'})

// Both of these are type errors.
lesson({courseId: 'typescript'})
lesson({lessonId: 'type-predicates'})
```

Static-path only supports params like `':courseId'`.
Its patterns don't support repetition, conditional pattern components, or anything other than literal strings and `:params`.
If you need those advanced features, you can always handle them outside of static-path, in whatever way you would've handled them before you read this README!
Or you can use the pattern shown below in the FAQ.

### Routing

All static-paths have a `pattern` property with a normalized version of the pattern that you provided.
You can pass that pattern to your router of choice.

For example, [Execute Program](https://www.executeprogram.com) uses [React Router](https://reactrouter.com/) like this (with irrelevant details removed):

```typescript
// src/client/router.tsx

import React from 'react'
import { BrowserRouter, Route, Switch } from 'react-router-dom'

import * as paths from '../common/paths'
import { Course } from './pages/course'
import { Lesson } from './pages/lesson'

export function Router() {
  return <BrowserRouter>
    <Switch>
      <Route exact path={paths.course.pattern} component={Course} />
      <Route exact path={paths.lesson.pattern} component={Lesson} />
    </Switch>
  </BrowserRouter>
}
```

The paths module is the single source of truth about the patterns, so there's no duplication here.
(Although it's true that the router module becomes very boring with static-path.
But boring code won't hurt you.
Clever code is what will hurt you!)

### Linking

To link to a path, call it as a function while providing the appropriate params:

```typescript
import React from 'react'
import * as paths from '../common/paths'

export function LinkToALesson() {
  return <a href={paths.lesson({courseId: 'typescript', lessonId: 'type-predicates'})}>
    Try this lesson!
  </a>
}
```

## Recommended usage

1. Create a `paths.ts` module to hold your paths.
   In a large application, you may want to break it up into multiple sub-modules for organization.
   The important part is that it's a self-contained module or family of modules.

2. Your `paths.ts` should be importable by both your server and your client.
   That way, code on both sides of the app can safely link to paths.
   How you achieve this will depend on your web framework.
   Put `paths.ts` wherever you put other code that's shared by client and server.

3. Always pass a literal string directly to the `path` function, like `path('/courses/:courseId')`.
   Never pass variables or other expressions to `path`.
   It's important for `path(...)` to see the literal string type of your pattern.
   Passing a variable with the type `string`, or a union of multiple strings, may produce a confusing type error.
   It may also let incorrect links slip through.

4. Generate all of your links via static-paths.
   Static-path can only help you if you use it to generate your links.
   Any link created in the old way, like `<a href={`/courses/:courseId`}>`, is invisible to static-path.

## FAQ

### Is this a router?

No.
Static-path doesn't do any routing.
It only manages the relationship between patterns like `'/courses/:courseId'`, params like `{courseId: 'typescript'}`, and concrete path strings like `'/courses/typescript'`.
You can use it with any router that supports the usual pattern syntax with `:params`.

### What about my bundle size?

Static-path is [under 1 KiB minified and gzipped](https://bundlephobia.com/package/static-path).

### Can I use this in JavaScript?

You can technically use static-path in JavaScript, but we don't think there's a reason to.
This library's purpose is to statically type code that's particularly prone to dynamic mistakes.
In JavaScript, this library can still be used to generate concrete path strings from path objects, but the primary benefit of static type errors is lost.
We recommend porting to TypeScript first.

### Is it production-ready?

[Execute Program](https://www.executeprogram.com) has used this library in production since December of 2020.

### How does it work?

It all hinges on a type that combines [template literal types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html) with a [conditional type](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) to extra the param names from the route pattern string.
Prior to TypeScript adding template literal type support, this wasn't possible without code generation.

### Doesn't this make the code verbose?

Not really.
In fact, if you have your path parameters in appropriately-named local variables then it's shorter than the traditional method.
Here's a comparison of static-path vs. a hard-coded path in that scenario:

```typescript
// static-path
<a href={paths.lesson({courseId, lessonId})} />
// hard-coded path
<a href={`/courses/${courseId}/lessons/${lessonId}`} />
```

### I need fancy route features like conditionals and repetition

The vast majority of routes don't need these features, but some do.
In these cases, you can always write a function.
Static-paths are functions that take params, return path strings, and have a `pattern` property.
You can define such a function yourself inside of your `paths.ts` module, then use it alongside other static-paths.

Here's an example.
We want a path that takes a `courseId` and a `lessonId`.
But we also want to allow calls without any `courseId`, in which case we'll use a default course ID instead.

```typescript
// The function generates concrete path strings, just like static-paths do.
export function lessonWithDefault(params: {
  lessonId: string,
  courseId?: string
}) {
  /* If we don't provide a course ID, assume that we're linking to the
   * TypeScript course. */
  const courseId = params.courseId ?? 'typescript'

  return `/courses/${courseId}/lessons/${params.lessonId}`
}

/* It's up to us to make the `pattern` property match what the function
 * generates. */
lessonWithDefault.pattern = '/courses/:courseId/lessons/:lessonId'
```

Note that the `lessonWithDefault` path function doesn't use static-path at all.
As a result, static-path can't check for whether the pattern actually matches the params, or whether those match the template literal string that generates the paths.
This approach lets you build arbitrarily complex paths, but you have to make sure that your params and patterns line up.

If you write functions like these, you're still better off than you would be with the traditional method of smashing strings together in an ad-hoc way.
This function still serves as a single point of truth describing the paths, rather than writing code to manually build the paths at every point where you link to them.

### What if I hard-code some links instead of calling the path functions?

Don't do it!
The benefits of static-path come from using it as the single source of truth about the paths.
Each time you write ```<a href={`/courses/{courseId}`}>```, you create a link that's invisible to static-path.
If you later change the structure of that route, you won't get a type error telling you that that `<a>` tag is out of date.
Always use the path objects when linking.

### How do I force a param to be a number or other type?

Call `.toString()` on it.
Static-path only supports string values as params.

Encoding type information in the route strings would dramatically increase this library's complexity, if it's possible at all.
It would probably lead to worse error messages as well.
Static-path is already safer than the traditional approach.
Let's try to get to 90% before reaching for 100%!
