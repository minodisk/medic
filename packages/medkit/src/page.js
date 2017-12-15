// @flow

const { statusText } = require("./utils");
import type { Page, ClipboardEvent, Cookie, Logger, Context } from "./types";

const test = (str: string, re: string | RegExp): boolean => {
  if (typeof re === "string") {
    return str === re;
  }
  return re.test(str);
};

const enhance = {
  shortcut: function(key: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      await this.keyboard.down("Control");
      await this.keyboard.press(key, { delay: 100 });
      await this.keyboard.up("Control");
      resolve();
    });
  },

  setDataToClipboard: function(type: string, data: string) {
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
    url: string | RegExp,
    context: Context,
    options?: {
      timeout?: number,
    },
  ): Promise<void> {
    const opts = {
      timeout: 10000,
      ...options,
    };
    return new Promise((resolve, reject) => {
      context.logger.log("wait for response:", method, url);
      let timeoutId;
      if (opts.timeout > 0) {
        timeoutId = setTimeout(() => {
          this.removeListener("response", (onResponse: any));
          context.logger.log("  timeout:", opts.timeout);
          reject("timeout");
        }, opts.timeout);
      }
      const onResponse = async res => {
        const req = res.request();
        if (req.method !== method || !test(req.url, url)) {
          // context.logger.log("  unmatch:", req.method, req.url);
          return;
        }

        context.logger.log("  match:", req.method, req.url);
        clearTimeout(timeoutId);
        this.removeListener("response", (onResponse: any));

        if (res.status >= 400) {
          context.logger.log("  bad status:", res.status);
          reject(`${res.status} ${statusText(res.status)}`);
          return;
        }
        context.logger.log("  good status:", res.status);
        resolve();
      };
      this.on("response", (onResponse: any));
    });
  },

  waitForPushed: function(re: RegExp, timeout: number = 0) {
    return new Promise((resolve, reject) => {
      // Workaround
      // Page.prototype.waitForNavigation doens't work and 'framenavigated' event isn't fired when the url is changed via History API.
      // See this issue about this problem: https://github.com/GoogleChrome/puppeteer/issues/257
      const intervalId = setInterval(async () => {
        const url = await this.evaluate(() => location.href);
        const matched = url.match(re);
        if (matched == null) {
          return;
        }
        clearInterval(intervalId);
        if (timeoutId != null) {
          clearTimeout(timeoutId);
        }
        resolve(matched);
      }, 100);
      let timeoutId;
      if (timeout != null && timeout > 0) {
        timeoutId = setTimeout(() => {
          clearInterval(intervalId);
          reject(`waiting failed: timeout ${timeout}ms exceeded`);
        }, timeout);
      }
    });
  },
};

module.exports = function(page: any): Page {
  return Object.assign(page, enhance);
};
