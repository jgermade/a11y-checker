// Structural types for the parts of Playwright this package uses. Real Playwright
// `Page`, `Frame` and `Locator` objects satisfy them (the e2e tests type-check against
// the real types), without this package depending on Playwright's types.
//
// The callback parameters are `any` on purpose: Playwright types them through its
// generic `Unboxed<Arg>` wrapper, which no other parameter type can match.
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface FrameLike {
  evaluate(pageFunction: string | ((arg: any) => unknown), arg?: unknown): Promise<unknown>;
  url(): string;
}

export interface PageLike {
  frames(): FrameLike[];
  mainFrame(): FrameLike;
}

export interface LocatorLike {
  page(): PageLike;
  evaluate(pageFunction: (element: any, arg: any) => unknown, arg?: unknown): Promise<unknown>;
}
