// @flow

const { statusText } = require("./utils");
const pathToRegexp = require("path-to-regexp");
import type {
  Page,
  ClipboardEvent,
  Cookie,
  Logger,
  Context,
  Key,
} from "./types";

const shortcutKey = process.platform === "darwin" ? "Command" : "Control";

const mapKeys = (keys: Array<Key>, result: Array<string>) => {
  const map = {};
  keys.forEach((key, i) => {
    const value = result[i + 1];
    if (value != null) {
      map[key.name] = value;
    }
  });
  return map;
};

const patches = {
  getUserAgent(): Promise<string> {
    return new Promise(async (resolve, reject) => {
      resolve(await this.evaluate(() => navigator.userAgent));
    });
  },

  shortcut(key: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      await this.keyboard.down(shortcutKey);
      await this.keyboard.press(key, { delay: 100 });
      await this.keyboard.up(shortcutKey);
      resolve();
    });
  },

  setDataToClipboard(type: string, data: string) {
    return new Promise(async (resolve, reject) => {
      await this.evaluate(
        (t, d) => {
          const onCopy = (e: ClipboardEvent): void => {
            e.preventDefault();
            e.clipboardData.setData(t, d);
          };
          (document: any).addEventListener("copy", onCopy);
        },
        type,
        data,
      );
      await this.shortcut("c");
      resolve();
    });
  },

  waitForResponse(
    method: "OPTIONS" | "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    url: string,
    options?: {
      timeout?: number,
    },
    logger?: Logger,
  ): Promise<{ status: number, result: Object }> {
    return new Promise((resolve, reject) => {
      const keys = [];
      const re = pathToRegexp(url, keys);
      const opts = {
        timeout: 10000,
        ...options,
      };

      let timeoutId;
      if (opts.timeout > 0) {
        timeoutId = setTimeout(() => {
          this.removeListener("response", (onResponse: any));
          reject("timeout");
        }, opts.timeout);
      }

      const onResponse = async res => {
        const req = res.request();
        const result = re.exec(req.url);
        if (req.method !== method || result == null) {
          return;
        }
        clearTimeout(timeoutId);
        this.removeListener("response", (onResponse: any));
        if (res.status >= 400) {
          reject(`bad status: ${res.status} is responsed`);
          return;
        }
        resolve({ status: res.status, result: mapKeys(keys, result) });
      };
      this.on("response", (onResponse: any));
    });
  },

  // Workaround
  // Page.prototype.waitForNavigation doens't work and 'framenavigated' event isn't fired when the url is changed via History API.
  // In this case Page.url() doens't work too.
  // See this issue about this problem: https://github.com/GoogleChrome/puppeteer/issues/257
  waitForURL(
    url: string,
    options?: { timeout?: number },
  ): Promise<{ result: Object }> {
    return new Promise((resolve, reject) => {
      const keys = [];
      const re = pathToRegexp(url, keys);
      const opts = {
        timeout: 10000,
        ...options,
      };

      let timeoutId;
      if (opts.timeout > 0) {
        timeoutId = setTimeout(() => {
          clearInterval(intervalId);
          reject("timeout");
        }, opts.timeout);
      }

      const intervalId = setInterval(async () => {
        const url = await this.evaluate(() => window.location.href);
        const result = re.exec(url);
        if (result == null) {
          return;
        }
        clearTimeout(timeoutId);
        clearInterval(intervalId);
        resolve({ result: mapKeys(keys, result) });
      }, 100);
    });
  },
};

module.exports = (page: any): Page => {
  return Object.assign(page, patches);
};
