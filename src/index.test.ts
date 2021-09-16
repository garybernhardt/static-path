import test from 'ava';

import {path} from '.';

test('routes paths with no params', (t) => {
  const p = path('/');
  t.is(p({}), '/');
  t.is(p.pattern, '/');
});

test('can have constant path components', (t) => {
  const p = path('/courses');
  t.is(p({}), '/courses');
  t.is(p.pattern, '/courses');
});

test('can have path holes', (t) => {
  const p = path('/courses/:courseId');
  t.is(p({courseId: 'course1'}), '/courses/course1');
  t.is(p.pattern, '/courses/:courseId');
});

test('must begin with with a slash', (t) => {
  t.throws(() => path('courses/:courseId'), {
    message: /Paths must begin with slashes, but "courses\/:courseId" doesn't./,
  });
});

test('replaces repeated slashes with one slash', (t) => {
  const p = path('/one//two');
  t.is(p({}), '/one/two');
  t.is(p.pattern, '/one/two');
});

test('discards trailing slashes in paths', (t) => {
  // In a single path:
  const p1 = path('/courses/');
  t.is(p1({}), '/courses');
  t.is(p1.pattern, '/courses');

  // In a subpath:
  const p2 = path('/courses/').path('/lessons/');
  t.is(p2.pattern, '/courses/lessons');
  t.is(p2({}), '/courses/lessons');
});

test('escapes params when generating paths', (t) => {
  t.is(path('/courses/:courseId')({courseId: 'the/course'}), '/courses/the%2Fcourse');
});

test('joins subpaths, whether they have a leading slash or not', (t) => {
  // With leading slash on subpath:
  const p1 = path('/courses/:courseId').path('/lessons/:lessonId');
  t.is(p1.pattern, '/courses/:courseId/lessons/:lessonId');
  t.is(p1({courseId: 'course1', lessonId: 'lesson1'}), '/courses/course1/lessons/lesson1');

  // Without leading slash on subpath:
  const p2 = path('/courses/:courseId').path('lessons/:lessonId');
  t.is(p2.pattern, '/courses/:courseId/lessons/:lessonId');
  t.is(p2({courseId: 'course1', lessonId: 'lesson1'}), '/courses/course1/lessons/lesson1');
});

test('joins subpaths when only the parent has a parameter', (t) => {
  const p = path('/courses/:courseId').path('/lessons');
  t.is(p.pattern, '/courses/:courseId/lessons');
  t.is(p({courseId: 'course1'}), '/courses/course1/lessons');
});

test('joins subpaths when only the child has a parameter', (t) => {
  const p = path('/courses').path('/lessons/:lessonId');
  t.is(p.pattern, '/courses/lessons/:lessonId');
  t.is(p({lessonId: 'lesson1'}), '/courses/lessons/lesson1');
});

test('joins subpaths when neither path has a parameter', (t) => {
  const p = path('/courses').path('/lessons');
  t.is(p.pattern, '/courses/lessons');
  t.is(p({}), '/courses/lessons');
});

test('joins subpaths onto the root path', (t) => {
  // With leading slash on subpath:
  const p1 = path('/').path('/lessons');
  t.is(p1.pattern, '/lessons');
  t.is(p1({}), '/lessons');

  // Without leading slash on subpath:
  const p2 = path('/').path('/lessons');
  t.is(p2.pattern, '/lessons');
  t.is(p2({}), '/lessons');
});

test("type errors and throws when the provided params don't match the pattern", (t) => {
  // With one param:
  path('/courses/:courseId')({courseId: 'some value'});
  // @ts-expect-error
  t.throws(() => path('/courses/:courseId')({}));
  // @ts-expect-error
  t.throws(() => path('/courses/:courseId')({unexpectedParam: 'some value'}));

  // With two params:
  path('/courses/:courseId/lessons/:lessonId')({courseId: 'some value', lessonId: 'some value'});
  // @ts-expect-error
  t.throws(() => path('/courses/:courseId/lessons/:lessonId')({}));
  // @ts-expect-error
  t.throws(() => path('/courses/:courseId/lessons/:lessonId')({courseId: 'some value'}));
  // @ts-expect-error
  t.throws(() => path('/courses/:courseId/lessons/:lessonId')({lessonId: 'some value'}));

  // With two params, one from a base path and one from a subpath:
  path('/courses/:courseId').path('/lessons/:lessonId')({courseId: 'some value', lessonId: 'some value'});
  // @ts-expect-error
  t.throws(() => path('/courses/:courseId').path('/lessons/:lessonId')({}));
  // @ts-expect-error
  t.throws(() => path('/courses/:courseId').path('/lessons/:lessonId')({courseId: 'some value'}));
  // @ts-expect-error
  t.throws(() => path('/courses/:courseId').path('/lessons/:lessonId')({lessonId: 'some value'}));
});
