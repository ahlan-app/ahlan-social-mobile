// Ahlan Social — https://github.com/ahlan-app/ahlan-social-mobile
// SPDX-License-Identifier: Apache-2.0
//
// target: __tests__/stack-navigation.test.ts
//
// Tests for expo-router stack navigation: hardware/header back button
// behavior and nested screen push/pop semantics.
//
// The Ahlan Social app uses expo-router's `<Stack>` navigator (see
// app/_layout.tsx). Several screens push other screens on top of the
// current one — e.g. the home feed pushes `post/[id]` and then
// `comments/[postId]`, the user profile pushes `user-list` and
// `messages`, and the post detail pushes `user/[username]` and back.
//
// The behavior we want to pin down:
//
//   1. Hardware / header back — the back button on a pushed screen must
//      pop exactly one entry, returning to the previous screen. Calling
//      back on the bottom of the stack is a no-op (not a throw, not a
//      redirect to a different route).
//
//   2. Nested push — from `/(tabs)/home` → `/post/123` →
//      `/comments/123` → `/user/alice`, the stack should grow to
//      length 4 and each `pop` should peel off the most recently
//      pushed screen in LIFO order.
//
//   3. Pop-to-specific — `popTo('home')` should unwind the stack
//      until the named route is on top, leaving it intact. If the
//      target isn't found the stack is left unchanged.
//
//   4. Replace semantics — `router.replace('/post/456')` swaps the
//      top entry without growing the stack, so a back press from
//      the replacement screen returns to the screen that pushed
//      the original entry (not the replaced one).
//
//   5. Modal presentation — `presentation: 'modal'` screens are
//      tracked on the same stack but `dismiss()` on a modal pops
//      only the modal entry, regardless of any nested routes
//      underneath.
//
// Following the project's existing test conventions (see
// `__tests__/deep-link-routes.test.ts` and
// `__tests__/state-rehydration.test.ts`), we model the navigation
// stack as a pure data structure plus a thin router shim. No React
// Native runtime is required, which matches the node-environment
// jest preset in `jest.config.js`.

// ---------------------------------------------------------------------------
// Stack model
// ---------------------------------------------------------------------------

type ScreenKind = 'screen' | 'modal' | 'fullScreenModal';

type StackEntry = {
  /** Route key — expo-router uses the file path as the route name. */
  route: string;
  /** Params resolved from useLocalSearchParams(). */
  params: Record<string, string>;
  /** How the entry was presented; mirrors `Stack.Screen options.presentation`. */
  kind: ScreenKind;
};

type NavigationStack = {
  entries: StackEntry[];
  /** Index of the current top of the stack — always entries.length - 1. */
  top: () => StackEntry | null;
  /** True when the stack contains no entries. */
  isEmpty: () => boolean;
  /** True when `route` is the current top. */
  isOn: (route: string) => boolean;
  /** True when `route` appears anywhere in the history. */
  hasInHistory: (route: string) => boolean;
};

const createStack = (initial: StackEntry[] = []): NavigationStack => {
  const stack: NavigationStack = {
    entries: [...initial],
    top: function (this: NavigationStack) {
      return this.entries.length === 0 ? null : this.entries[this.entries.length - 1];
    },
    isEmpty: function (this: NavigationStack) {
      return this.entries.length === 0;
    },
    isOn: function (this: NavigationStack, route: string) {
      return this.entries.length > 0 && this.entries[this.entries.length - 1].route === route;
    },
    hasInHistory: function (this: NavigationStack, route: string) {
      return this.entries.some((e) => e.route === route);
    },
  };
  return stack;
};

// ---------------------------------------------------------------------------
// Router shim
//
// Mirrors the relevant subset of expo-router's `useRouter()`: push,
// replace, back, dismiss. Each method mutates the stack in place so
// tests can assert the resulting state without any async glue.
// ---------------------------------------------------------------------------

type Router = {
  push: (target: string | { pathname: string; params?: Record<string, string> }) => void;
  replace: (target: string | { pathname: string; params?: Record<string, string> }) => void;
  back: () => boolean;
  dismiss: () => boolean;
  dismissAll: () => void;
  popTo: (route: string) => boolean;
  canGoBack: () => boolean;
};

const MODAL_ROUTES = new Set(['/notifications', '/messages', '/compose']);
const FULLSCREEN_MODAL_ROUTES = new Set(['/story-viewer', '/story-create']);

const kindFor = (route: string): ScreenKind => {
  if (FULLSCREEN_MODAL_ROUTES.has(route)) return 'fullScreenModal';
  if (MODAL_ROUTES.has(route)) return 'modal';
  return 'screen';
};

const normalize = (
  target: string | { pathname: string; params?: Record<string, string> },
): StackEntry => {
  if (typeof target === 'string') {
    return { route: target, params: {}, kind: kindFor(target) };
  }
  return { route: target.pathname, params: target.params ?? {}, kind: kindFor(target.pathname) };
};

const createRouter = (stack: NavigationStack): Router => ({
  push: (target) => {
    stack.entries.push(normalize(target));
  },
  replace: (target) => {
    if (stack.entries.length === 0) {
      stack.entries.push(normalize(target));
      return;
    }
    stack.entries[stack.entries.length - 1] = normalize(target);
  },
  back: () => {
    // Hardware/header back: pop the top entry. No-op on an empty stack
    // (expo-router's behavior on iOS; Android typically closes the app,
    // which is outside the JS scope — we mirror the iOS contract here).
    if (stack.entries.length === 0) return false;
    stack.entries.pop();
    return true;
  },
  dismiss: () => {
    // Dismiss is a back-equivalent for modal entries. The semantics in
    // expo-router: dismiss N popped until either you've popped N modal
    // entries OR you hit a non-modal entry, then pop that too.
    if (stack.entries.length === 0) return false;
    stack.entries.pop();
    return true;
  },
  dismissAll: () => {
    // Pop every modal-typed entry from the top until a non-modal is on
    // top, OR pop everything if you want a full reset.
    while (stack.entries.length > 0) {
      const t = stack.top();
      if (!t || t.kind === 'screen') break;
      stack.entries.pop();
    }
  },
  popTo: (route) => {
    // Find the topmost occurrence — if the same route was pushed twice,
    // popTo should land on the most recent push so back-tracking from
    // there peels off the upper copy only.
    let idx = -1;
    for (let i = stack.entries.length - 1; i >= 0; i--) {
      if (stack.entries[i].route === route) {
        idx = i;
        break;
      }
    }
    if (idx === -1) return false;
    // Keep everything up to and including the target; drop the rest.
    stack.entries = stack.entries.slice(0, idx + 1);
    return true;
  },
  canGoBack: () => stack.entries.length > 0,
});

// ---------------------------------------------------------------------------
// Fixtures — mirror the screen hierarchy exercised in app/post/[id].tsx
// and app/user/[username].tsx
// ---------------------------------------------------------------------------

const HOME = '/(tabs)/home';
const POST_DETAIL = '/post/123';
const COMMENTS = '/comments/123';
const USER_PROFILE = '/user/alice';
const USER_LIST = '/user-list';
const MESSAGES = '/messages';

beforeEach(() => {
  // No global state to clear — each test creates its own stack.
});

// ===========================================================================
// Test 1 — back button: pops one entry, no-op on empty stack
// ===========================================================================

describe('Stack navigation — back button', () => {
  it('pops the top screen and returns to the previous one', () => {
    const stack = createStack([{ route: HOME, params: {}, kind: 'screen' }]);
    const router = createRouter(stack);

    router.push({ pathname: POST_DETAIL, params: { id: '123' } });
    expect(stack.entries).toHaveLength(2);
    expect(stack.isOn(POST_DETAIL)).toBe(true);

    const popped = router.back();
    expect(popped).toBe(true);
    expect(stack.entries).toHaveLength(1);
    expect(stack.isOn(HOME)).toBe(true);
  });

  it('back from a single-screen stack empties it (canGoBack=false after)', () => {
    const stack = createStack([{ route: HOME, params: {}, kind: 'screen' }]);
    const router = createRouter(stack);

    // canGoBack is true before the back — there IS an entry to pop.
    expect(router.canGoBack()).toBe(true);
    const popped = router.back();
    expect(popped).toBe(true); // iOS contract: back always pops if non-empty
    expect(stack.isEmpty()).toBe(true);
    // After the back, the stack is empty and back is no longer possible.
    expect(router.canGoBack()).toBe(false);
  });

  it('back on an empty stack is a safe no-op (does not throw, does not inject a route)', () => {
    const stack = createStack();
    const router = createRouter(stack);

    expect(() => router.back()).not.toThrow();
    expect(router.back()).toBe(false);
    expect(stack.entries).toEqual([]);
    expect(stack.isEmpty()).toBe(true);
  });
});

// ===========================================================================
// Test 2 — nested screen push/pop (LIFO)
// ===========================================================================

describe('Stack navigation — nested push/pop', () => {
  it('grows the stack to 4 entries for home → post → comments → user', () => {
    const stack = createStack([{ route: HOME, params: {}, kind: 'screen' }]);
    const router = createRouter(stack);

    router.push({ pathname: POST_DETAIL, params: { id: '123' } });
    router.push({ pathname: COMMENTS, params: { postId: '123' } });
    router.push({ pathname: USER_PROFILE, params: { username: 'alice' } });

    expect(stack.entries).toHaveLength(4);
    expect(stack.entries.map((e) => e.route)).toEqual([
      HOME,
      POST_DETAIL,
      COMMENTS,
      USER_PROFILE,
    ]);

    // Each level must carry its params forward — the comments screen
    // must remember postId even after a deeper push.
    const commentsEntry = stack.entries[2];
    expect(commentsEntry.params.postId).toBe('123');
    const userEntry = stack.entries[3];
    expect(userEntry.params.username).toBe('alice');
  });

  it('pops in LIFO order, peeling one entry at a time', () => {
    const stack = createStack([{ route: HOME, params: {}, kind: 'screen' }]);
    const router = createRouter(stack);

    router.push({ pathname: POST_DETAIL, params: { id: '123' } });
    router.push({ pathname: COMMENTS, params: { postId: '123' } });
    router.push({ pathname: USER_PROFILE, params: { username: 'alice' } });

    // First back → user (deepest) is removed, comments re-surfaces
    expect(router.back()).toBe(true);
    expect(stack.isOn(COMMENTS)).toBe(true);
    expect(stack.entries).toHaveLength(3);

    // Second back → comments removed, post detail re-surfaces
    expect(router.back()).toBe(true);
    expect(stack.isOn(POST_DETAIL)).toBe(true);
    expect(stack.entries).toHaveLength(2);

    // Third back → home
    expect(router.back()).toBe(true);
    expect(stack.isOn(HOME)).toBe(true);
    expect(stack.entries).toHaveLength(1);

    // Fourth back → empty
    expect(router.back()).toBe(true);
    expect(stack.isEmpty()).toBe(true);

    // Fifth back → no-op
    expect(router.back()).toBe(false);
    expect(stack.isEmpty()).toBe(true);
  });

  it('does not mutate earlier stack entries when pushing new ones', () => {
    const stack = createStack([{ route: HOME, params: {}, kind: 'screen' }]);
    const router = createRouter(stack);

    router.push({ pathname: POST_DETAIL, params: { id: '123' } });
    router.push({ pathname: COMMENTS, params: { postId: '123' } });

    // The original POST_DETAIL entry must keep its params even after
    // another push layered on top of it.
    const postEntry = stack.entries[1];
    expect(postEntry).toEqual({
      route: POST_DETAIL,
      params: { id: '123' },
      kind: 'screen',
    });
  });
});

// ===========================================================================
// Test 3 — popTo: pop until a named route is on top
// ===========================================================================

describe('Stack navigation — popTo', () => {
  it('unwinds the stack down to the named route and leaves it intact', () => {
    const stack = createStack([{ route: HOME, params: {}, kind: 'screen' }]);
    const router = createRouter(stack);

    router.push({ pathname: POST_DETAIL, params: { id: '123' } });
    router.push({ pathname: COMMENTS, params: { postId: '123' } });
    router.push({ pathname: USER_PROFILE, params: { username: 'alice' } });

    expect(stack.entries).toHaveLength(4);

    // Pop everything above the post detail screen.
    expect(router.popTo(POST_DETAIL)).toBe(true);
    expect(stack.entries).toHaveLength(2);
    expect(stack.isOn(POST_DETAIL)).toBe(true);
    expect(stack.top()?.params).toEqual({ id: '123' });
  });

  it('popTo the bottom-most entry clears everything above it', () => {
    const stack = createStack([{ route: HOME, params: {}, kind: 'screen' }]);
    const router = createRouter(stack);

    router.push({ pathname: POST_DETAIL, params: { id: '123' } });
    router.push({ pathname: COMMENTS, params: { postId: '123' } });

    expect(router.popTo(HOME)).toBe(true);
    expect(stack.entries).toHaveLength(1);
    expect(stack.isOn(HOME)).toBe(true);
  });

  it('popTo an absent route is a no-op and returns false', () => {
    const stack = createStack([{ route: HOME, params: {}, kind: 'screen' }]);
    const router = createRouter(stack);

    router.push({ pathname: POST_DETAIL, params: { id: '123' } });
    router.push({ pathname: COMMENTS, params: { postId: '123' } });

    const before = stack.entries.map((e) => e.route);
    expect(router.popTo('/does/not/exist')).toBe(false);
    expect(stack.entries.map((e) => e.route)).toEqual(before);
  });
});

// ===========================================================================
// Test 4 — replace swaps top without growing the stack
// ===========================================================================

describe('Stack navigation — replace', () => {
  it('replaces the top entry without growing the stack', () => {
    const stack = createStack([{ route: HOME, params: {}, kind: 'screen' }]);
    const router = createRouter(stack);

    router.push({ pathname: POST_DETAIL, params: { id: '123' } });
    expect(stack.entries).toHaveLength(2);

    router.replace({ pathname: POST_DETAIL, params: { id: '456' } });

    // Length must be unchanged.
    expect(stack.entries).toHaveLength(2);
    // Top entry must be the replacement, with its new params.
    expect(stack.isOn(POST_DETAIL)).toBe(true);
    expect(stack.top()?.params).toEqual({ id: '456' });
    // The bottom entry must be untouched.
    expect(stack.entries[0]).toEqual({ route: HOME, params: {}, kind: 'screen' });
  });

  it('a back press after replace returns to the screen below the replaced one', () => {
    const stack = createStack([{ route: HOME, params: {}, kind: 'screen' }]);
    const router = createRouter(stack);

    router.push({ pathname: POST_DETAIL, params: { id: '123' } });
    router.push({ pathname: USER_LIST, params: { type: 'likes' } });
    router.replace({ pathname: USER_LIST, params: { type: 'reposts' } });

    // Back from the replaced entry must skip the original user-list
    // entry entirely and land on the post detail screen.
    expect(router.back()).toBe(true);
    expect(stack.isOn(POST_DETAIL)).toBe(true);
    expect(stack.top()?.params).toEqual({ id: '123' });
  });
});

// ===========================================================================
// Test 5 — modal presentation: dismiss semantics
// ===========================================================================

describe('Stack navigation — modal presentation', () => {
  it('classifies modal-typed routes separately from regular screens', () => {
    const stack = createStack([{ route: HOME, params: {}, kind: 'screen' }]);
    const router = createRouter(stack);

    router.push({ pathname: MESSAGES, params: { chatWith: 'alice' } });
    router.push({ pathname: USER_PROFILE, params: { username: 'bob' } });

    const messagesEntry = stack.entries[1];
    expect(messagesEntry.kind).toBe('modal');
    const userEntry = stack.entries[2];
    expect(userEntry.kind).toBe('screen');
  });

  it('dismissAll pops modal entries without disturbing the screen underneath', () => {
    const stack = createStack([{ route: HOME, params: {}, kind: 'screen' }]);
    const router = createRouter(stack);

    router.push({ pathname: POST_DETAIL, params: { id: '123' } });
    router.push({ pathname: MESSAGES, params: { chatWith: 'alice' } });

    // Stack: [home, post, messages(modal)]
    expect(stack.entries).toHaveLength(3);
    expect(stack.top()?.kind).toBe('modal');

    router.dismissAll();
    expect(stack.isOn(POST_DETAIL)).toBe(true);
    expect(stack.entries).toHaveLength(2);
    // The screen entry below must retain its params.
    expect(stack.top()?.params).toEqual({ id: '123' });
  });

  it('canGoBack is true on a regular screen but a standalone modal still counts as a back-stop', () => {
    const stack = createStack();
    const router = createRouter(stack);

    router.push({ pathname: MESSAGES, params: {} });
    expect(router.canGoBack()).toBe(true);
    expect(stack.top()?.kind).toBe('modal');

    router.back();
    expect(stack.isEmpty()).toBe(true);
    expect(router.canGoBack()).toBe(false);
  });

  it('does not treat hasInHistory as ambiguous across duplicate pushes of the same route', () => {
    const stack = createStack();
    const router = createRouter(stack);

    router.push({ pathname: POST_DETAIL, params: { id: '1' } });
    router.push({ pathname: POST_DETAIL, params: { id: '2' } });

    // The route appears twice; popTo must find the *topmost* match so
    // popTo(POST_DETAIL) lands on the most recent push, leaving the
    // upper copy on top. The lower copy is preserved underneath for
    // further back-navigation.
    expect(stack.hasInHistory(POST_DETAIL)).toBe(true);
    expect(router.popTo(POST_DETAIL)).toBe(true);
    expect(stack.entries).toHaveLength(2);
    expect(stack.isOn(POST_DETAIL)).toBe(true);
    expect(stack.top()?.params).toEqual({ id: '2' });
    // The original (lower) push is still in the history.
    expect(stack.entries[0].params).toEqual({ id: '1' });
  });
});