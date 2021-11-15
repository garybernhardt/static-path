/* Turn a pattern with a literal string type (like
 * '/courses/:courseId/lessons/:lessonId') into a union of literal strings, one
 * string per parameter name (like 'courseId' | 'lessonId'). */
// prettier-ignore
type PathParamNames<Pattern extends string> =
  Pattern extends `:${infer Param}/${infer Rest}` ? Param | PathParamNames<Rest> :
  Pattern extends `:${infer Param}` ? Param :
  // eslint-disable-next-line
  Pattern extends `${infer _Prefix}:${infer Rest}` ? PathParamNames<`:${Rest}`> :
  /* This base case will happen if `Pattern` is `string`, or some other
   * `extends string` type that doesn't match the cases above, like `'a'|'b'`.
   * */
  never

/* Turn a pattern into an object with corresponding params. For example,
 * `Params<'/courses/:courseId/lessons/:lessonId'>` is
 * `{courseId: string, lessonId: string}`. */
// prettier-ignore
export type Params<Pattern extends string> =
  /* To statically type a path, we need a literal string like
   * `/courses/:courseId/`. If someone tries to generate a path from a
   * non-literal string (like `const pattern: string = '/courses/:courseId'`)
   * then we return the `never` type, which will cause a type error. */
  string extends Pattern ? never :
  {[K in PathParamNames<Pattern>]: string}

/* One "part" of a pattern. For example, '/courses/:courseId' has two parts: a
 * constant part 'courses' and a param ':courseId'. When a pattern is converted
 * into its parts, the slashes are always removed and don't show up in the
 * parts themselves. */
type Part<Pattern extends string> =
  | {kind: 'constant'; value: string}
  | {kind: 'param'; paramName: PathParamNames<Pattern>};

/* A Path is parameterized only on its pattern. If we ever need the param
 * types, we can use helper types to create them from the pattern type. */
export type Path<Pattern extends string> = {
  (params: Params<Pattern>): string;
  pattern: NormalizePattern<Pattern>;
  parts: Part<Pattern>[];

  path: <Subpattern extends string>(subpattern: Subpattern) => Path<`${Pattern}/${Subpattern}`>;
};

/* Build a new path.
 *
 * This function also does some runtime validity checks on the paths. Path
 * objects should be built at app boot time, so the validity checks here are
 * safe: the app won't even boot if the checks fail. */
export function path<Pattern extends string>(pattern: Pattern): Path<Pattern> {
  const parts = patternParts(pattern);

  const paramsToPath = (params: Params<Pattern>) => {
    return (
      '/' +
      parts
        .map((part) => {
          if (part.kind === 'param') {
            return paramValue(params, part.paramName);
          } else {
            return part.value;
          }
        })
        .filter((value) => value !== '')
        .join('/')
    );
  };

  /* Ideally, we'd normalize the pattern, then extract the path parts from that
   * normalized form. Unfortunately, that doesn't work because so much of this
   * code needs to know the exact literal type of `Pattern`, but normalizing
   * the pattern turns it into some other string type. So there's some subtle
   * duplication here, where multiple parts of the code know how to handle
   * slashes. */
  paramsToPath.pattern = normalizePattern(pattern);

  paramsToPath.parts = parts;

  paramsToPath.path = <Subpattern extends string>(subpattern: Subpattern): Path<`${Pattern}/${Subpattern}`> => {
    return path<`${Pattern}/${Subpattern}`>(`${pattern}/${subpattern}`);
  };

  if (!paramsToPath.pattern.startsWith('/')) {
    throw new Error(`Paths must begin with slashes, but ${JSON.stringify(paramsToPath.pattern)} doesn't.`);
  }

  return paramsToPath;
}

/* Turn a Pattern literal string type into an array of the path's parts. */
function patternParts<Pattern extends string>(pattern: Pattern): Part<Pattern>[] {
  return pattern.split('/').map((part) => {
    if (part.startsWith(':')) {
      return {kind: 'param', paramName: part.replace(/^:/, '')};
    } else {
      return {kind: 'constant', value: part};
    }
  });
}

/* This type needs to exactly match the `normalizePattern` function's behavior.
 *
 * The cases here are marked, and exactly match the cases in
 * `normalizePattern`.
 */
// prettier-ignore
export type NormalizePattern<Pattern extends string> =
  // Case 1: we're looking at the root path, '/'. We don't want to change it.
  '/' extends Pattern ? '/'

  // Case 2: Replace repeated slashes with one slash.
  : Pattern extends `${infer Prefix}//${infer Suffix}` ? NormalizePattern<`${Prefix}/${Suffix}`>

  // Case 3: Remove trailing slashes.
  : Pattern extends `${infer Prefix}/` ? NormalizePattern<Prefix>
  : Pattern;

/* Normalize patterns. E.g., '/courses//:courseId/' becomes
 * '/courses/:courseId'
 *
 * This function needs to exactly match what the `NormalizePattern` type does.
 * The type system can't see what we're doing here, so we have to verify the
 * match manually. */
function normalizePattern<Pattern extends string>(pattern: Pattern): NormalizePattern<Pattern> {
  // Case 1: we're looking at the root path, '/'. We don't want to change it.
  if (pattern === '/') {
    return pattern as NormalizePattern<Pattern>;
  }

  return (
    pattern
      // Case 2: Replace repeated slashes with one slash.
      .replace(/\/+/g, '/')
      // Case 3: Remove trailing slashes.
      .replace(
        /^(.+)\/$/,
        (match, patternWithoutTrailingSlash) => patternWithoutTrailingSlash,
      ) as NormalizePattern<Pattern>
  );
}

function paramValue<Pattern extends string>(params: Params<Pattern>, paramName: keyof Params<Pattern>): string {
  const value = params[paramName];
  if (typeof value !== 'string') {
    throw new Error(
      `When generating a path, the path param ${JSON.stringify(
        paramName,
      )} didn't exist on params object ${JSON.stringify(
        params,
      )}. The types should have prevented this, so either you defeated them (e.g., with \`as\`) or this is a bug!`,
    );
  }
  return value;
}
