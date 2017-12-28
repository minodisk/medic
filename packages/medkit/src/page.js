// @flow

const { wait } = require("./utils");
const pathToRegexp = require("path-to-regexp");
import type {
  Page,
  ClipboardEvent,
  Cookie,
  Logger,
  Context,
  Key,
} from "./types";

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
  async getUserAgent(): Promise<string> {
    return await this.evaluate(() => navigator.userAgent);
  },

  async shortcut(key: string): Promise<void> {
    switch (process.platform) {
      case "darwin":
        await this.bringToFront();
        await this.keyboard.press("Meta", { text: key });
        break;
      default:
        await this.keyboard.down("Control");
        await this.keyboard.press(key);
        await this.keyboard.up("Control");
        break;
    }
  },

  async setDataToClipboard(type: string, data: string) {
    const handle = await this.evaluateHandle(
      (t, d) => {
        const onCopyToClipboard = (e: ClipboardEvent): void => {
          e.preventDefault();
          e.clipboardData.setData(t, d);
          (document: any).removeEventListener("copy", onCopyToClipboard);
        };
        (document: any).addEventListener("copy", onCopyToClipboard);
      },
      type,
      data,
    );
    await this.shortcut("c");
  },

  waitForResponse(
    method: "OPTIONS" | "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    url: string,
    options?: {
      timeout?: number,
    },
  ): Promise<{ status: number, result: Object }> {
    return new Promise((resolve, reject) => {
      const keys = [];
      const re = pathToRegexp(url, keys);
      const opts = {
        timeout: 10000,
        ...options,
      };

      if (method === "GET") {
        const result = re.exec(this.url());
        if (result != null) {
          resolve({ status: 200, result: mapKeys(keys, result) });
          return;
        }
      }

      let timeoutId;
      if (opts.timeout > 0) {
        timeoutId = setTimeout(() => {
          this.removeListener("response", onResponse);
          reject("timeout");
        }, opts.timeout);
      }

      const onResponse = res => {
        const req = res.request();
        const result = re.exec(req.url());
        if (req.method() !== method || result == null) {
          return;
        }
        clearTimeout(timeoutId);
        this.removeListener("response", onResponse);
        const status = res.status();
        if (status >= 400) {
          reject(`bad status: ${status}`);
          return;
        }
        resolve({ status: status, result: mapKeys(keys, result) });
      };
      this.on("response", onResponse);
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
