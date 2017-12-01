// @flow

export type Browser = {
  newPage(): Promise<Page>,
  close(): Promise<void>,
  on(type: string, (e: any) => void): void,
  removeListener(type: string, (e: any) => void): void
};

export type Page = {
  // Primitive
  mouse: Mouse,
  keyboard: Keyboard,
  focus(selector: string): Promise<void>,
  cookies(): Promise<Array<Cookie>>,
  setCookie(...cookies: Array<Cookie>): Promise<void>,
  setViewport(viewport: Viewport): Promise<void>,
  goto(url: string, options?: { timeout?: number }): Promise<void>,
  waitForNavigation({ timeout: number, waitUntil: string }): Promise<void>,
  waitForSelector(
    selector: string,
    options?: { timeout?: number }
  ): Promise<void>,
  $(selector: string): Promise<ElementHandle>,
  $$(selector: string): Promise<Array<ElementHandle>>,
  $eval<T>(selector: string, (e: HTMLElement) => T): Promise<T>,
  $$eval<T>(selector: string, (e: Array<HTMLElement>) => T): Promise<T>,
  evaluate<T>(() => T): Promise<T>,
  evaluate<T, U>((U) => T, u: U): Promise<T>,
  evaluate<T, U, V>((U, V) => T, u: U, v: V): Promise<T>,
  evaluate<T, U, V, W>((U, V, W) => T, u: U, v: V, w: W): Promise<T>,
  evaluateHandle<T>(() => T): Promise<JSHandle<T>>,
  close(): Promise<void>,
  on(type: string, (e: any) => void): void,
  removeListener(type: string, (e: any) => void): void,
  type(
    selector: string,
    text: string,
    options?: { delay?: number }
  ): Promise<void>,
  // Patched
  shortcut(key: string): Promise<void>,
  setDataToClipboard(type: string, data: string): Promise<void>,
  waitForPushed(re: RegExp, timeout?: number): Promise<Array<string>>
};

export type ElementHandle = {
  click(): Promise<void>,
  type(text: string): Promise<void>,
  asElement(): ElementHandle
};

export type JSHandle<T> = {
  jsonValue(): T
};

export type Mouse = {
  move(x: number, y: number): Promise<void>,
  down(): Promise<void>,
  up(): Promise<void>
};

export type Keyboard = {
  down(key: string): Promise<void>,
  up(key: string): Promise<void>,
  press(key: string, option?: { delay?: number }): Promise<void>
};

export type Viewport = {
  width?: number,
  height?: number,
  deviceScaleFactor?: number,
  isMobile?: boolean,
  hasTouch?: boolean,
  isLandscape?: boolean
};

export type Rect = {
  left: number,
  top: number,
  width: number,
  height: number
};

export type Cookie = {};

export class ClipboardEvent extends Event {
  clipboardData: DataTransfer;
}

export type PostOptions = {
  tags?: Array<string>
};
