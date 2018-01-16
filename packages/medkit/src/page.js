// @flow

const defer = require("deferp");
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

  async selectText(selector: string) {
    const el = await this.$(selector);
    const { x, y, width, height } = await el.boundingBox();
    await this.mouse.down(x, y);
    await this.mouse.move(x + width, y + height);
    await this.mouse.up();
  },

  async setDataToClipboard(type: string, data: string) {
    const deferred = defer(
      this.evaluate(
        (t, d) => {
          return new Promise(resolve => {
            const onCopyToClipboard = (e: ClipboardEvent): void => {
              e.preventDefault();
              e.clipboardData.setData(t, d);
              (document: any).removeEventListener("copy", onCopyToClipboard);
              resolve();
            };
            (document: any).addEventListener("copy", onCopyToClipboard);
          });
        },
        type,
        data,
      ),
    );
    await this.execCommand("copy");
    await deferred();
  },

  async execCommand(command: string) {
    console.log("execCommand");
    await this.evaluate(
      (cmd: string) =>
        new Promise((resolve, reject) => {
          try {
            window.chrome.runtime.sendMessage(
              window.pasteExtensionId,
              cmd,
              null,
              result => {
                if (result) {
                  resolve();
                } else {
                  reject(new Error(`${cmd} isn't executable`));
                }
              },
            );
          } catch (err) {
            reject(err);
          }
        }),
      command,
    );
    console.log("execCommand done");
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
