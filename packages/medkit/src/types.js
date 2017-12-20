// @flow

export type Browser = {
  newPage(): Promise<Page>,
  close(): Promise<void>,
  on(type: string, (e: any) => void): void,
  removeListener(type: string, (e: any) => void): void,
};

export type Page = {
  // Primitive
  mouse: Mouse,
  keyboard: Keyboard,
  focus(selector: string): Promise<void>,
  click(selector: string): Promise<void>,
  cookies(): Promise<Array<Cookie>>,
  setCookie(...cookies: Array<Cookie>): Promise<void>,
  setUserAgent(ua: string): Promise<void>,
  setViewport(viewport: Viewport): Promise<void>,
  goto(url: string, options?: { timeout?: number }): Promise<void>,
  waitForNavigation({
    timeout?: number,
    waitUntil?: "load" | "domcontentloaded" | "networkidle0" | "networkidle2",
  }): Promise<void>,
  waitForSelector(
    selector: string,
    options?: { timeout?: number },
  ): Promise<void>,
  $(selector: string): Promise<ElementHandle>,
  $$(selector: string): Promise<Array<ElementHandle>>,
  $eval<T>(selector: string, (e: HTMLElement) => T): Promise<T>,
  $$eval<T>(selector: string, (e: Array<HTMLElement>) => T): Promise<T>,
  waitForFunction(
    pageFunction: () => boolean,
    options?: {
      polling?: "raf" | "mutation",
      timeout?: number,
    },
    ...args: Array<any>
  ): Promise<void>,
  evaluate<T>(() => T): Promise<T>,
  evaluate<T, U>((U) => T, u: U): Promise<T>,
  evaluate<T, U, V>((U, V) => T, u: U, v: V): Promise<T>,
  evaluate<T, U, V, W>((U, V, W) => T, u: U, v: V, w: W): Promise<T>,
  evaluateHandle(() => any): Promise<JSHandle>,
  close(): Promise<void>,
  on(type: string, (e: any) => void): void,
  removeListener(type: string, (e: any) => void): void,
  setRequestInterception(value: boolean): void,
  type(
    selector: string,
    text: string,
    options?: { delay?: number },
  ): Promise<void>,
  url(): Promise<string>,
  // Patchs
  getUserAgent(): Promise<string>,
  shortcut(key: string): Promise<void>,
  setDataToClipboard(type: string, data: string): Promise<void>,
  waitForResponse(
    method: "OPTIONS" | "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    url: string,
    options?: { timeout?: number },
    logger?: Logger,
  ): Promise<{ status: number, result: Object }>,
  waitForURL(
    url: string,
    options?: { timeout?: number },
  ): Promise<{ result: Object }>,
  waitForLogin(target: string): Promise<Array<Cookie> | void>,
};

export type JSHandle = {
  getProperties(): Promise<Map<string, JSHandle>>,
  asElement(): ElementHandle,
  jsonValue(): Promise<any>,
};

export type ElementHandle = {
  click(): Promise<void>,
  type(text: string): Promise<void>,
  asElement(): ElementHandle,
  boundingBox(): Rect,
  $(selector: string): Promise<ElementHandle>,
  $$(selector: string): Promise<Array<ElementHandle>>,
  getProperty(propertyName: string): Promise<JSHandle>,
};

export type Mouse = {
  move(x: number, y: number): Promise<void>,
  down(): Promise<void>,
  up(): Promise<void>,
  click(x: number, y: number, { delay?: number }): Promise<void>,
};

export type Keyboard = {
  down(key: string): Promise<void>,
  up(key: string): Promise<void>,
  press(key: string, option?: { delay?: number }): Promise<void>,
};

export type Viewport = {
  width?: number,
  height?: number,
  deviceScaleFactor?: number,
  isMobile?: boolean,
  hasTouch?: boolean,
  isLandscape?: boolean,
};

export type Rect = {
  x: number,
  y: number,
  width: number,
  height: number,
};

export type Cookie = {};

export class ClipboardEvent extends Event {
  clipboardData: DataTransfer;
}

export type PostOptions = {
  tags?: Array<string>,
};

export type Logger = {
  succeed(text?: string): void,
  fail(text?: string): void,
  warn(text?: string): void,
  info(text?: string): void,
  log(text?: string): void,
};

export type Context = {
  startLog(message: string): Logger,
  debug: boolean,
};

export type Options = {
  cookiesPath: string,
};

export type Key = {
  name: string,
};
