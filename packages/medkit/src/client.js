// @flow

const url = require("url");
const qs = require("querystring");
const puppeteer = require("puppeteer");
const { wait, stat, readFile, writeFile, statusText } = require("./utils");
const patchToPage = require("./page");
import type { Browser, Page, Cookie, PostOptions } from "./types";

const rEditURL = /^https:\/\/medium\.com\/p\/([\w\d]+)\/edit$/;

type Options = {
  cookiesPath?: string
};

class Client {
  options: Options;
  browser: Browser;
  cookies: Array<Cookie>;

  constructor(options?: Options) {
    this.options = {
      cookiesPath: "cookies.json",
      ...options
    };
  }

  open(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (this.browser != null) {
        resolve();
        return;
      }
      this.browser = await puppeteer.launch({ headless: false });
      resolve();
    });
  }

  close(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (this.browser == null) {
        resolve();
        return;
      }
      await this.browser.close();
      delete this.browser;
      resolve();
    });
  }

  newPage(): Promise<Page> {
    return new Promise(async (resolve, reject) => {
      await this.open();
      const page = patchToPage(await this.browser.newPage());
      await page.setViewport({
        width: 1000,
        height: 1000
      });
      if (this.cookies == null) {
        try {
          await stat(this.options.cookiesPath);
          const content = await readFile(this.options.cookiesPath);
          this.cookies = JSON.parse(content);
        } catch (err) {}
      }
      if (this.cookies != null) {
        await page.setCookie(...this.cookies);
      }
      resolve(page);
    });
  }

  waitForLogin(page: Page, redirect: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      let loggingIn = false;
      const onChanged = async e => {
        try {
          if (!loggingIn) {
            const u = url.parse(e._url);
            if (u.query != null) {
              const q = qs.parse(u.query);
              if (
                u.host === "medium.com" &&
                u.pathname === "/m/signin" &&
                q.redirect === redirect
              ) {
                loggingIn = true;
                return;
              }
            }
          }
          if (e._url === redirect) {
            page.removeListener("framenavigated", (onChanged: any));
            if (loggingIn) {
              this.cookies = await page.cookies();
              await writeFile(
                this.options.cookiesPath,
                JSON.stringify(this.cookies)
              );
            }
            resolve();
          }
        } catch (err) {
          reject(err);
        }
      };
      page.on("framenavigated", (onChanged: any));
    });
  }

  createPost(html: string, options?: PostOptions): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const page = await this.newPage();
      await this.gotoAndPaste(
        page,
        "https://medium.com/new-story",
        html,
        options
      );
      const matched = await page.waitForPushed(rEditURL);
      await page.close();
      resolve(matched[1]);
    });
  }

  updatePost(
    postId: string,
    html: string,
    options?: PostOptions
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const page = await this.newPage();
      await this.gotoAndPaste(
        page,
        `https://medium.com/p/${postId}/edit`,
        html,
        options
      );
      await page.close();
      resolve();
    });
  }

  gotoAndPaste(
    page: Page,
    url: string,
    html: string,
    options?: PostOptions
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      await page.setDataToClipboard("text/html", html);
      await page.goto(url, {
        timeout: 0
      });
      console.log("wait for login");
      await this.waitForLogin(page, url);
      console.log("wait for loading");
      await this.waitForLoadingApp(page);
      await page.focus("div.section-inner");
      await page.shortcut("a");
      await page.shortcut("v");

      console.log("embed tweets");
      const jsHandle = await page.evaluateHandle(() => {
        return Array.prototype.filter.call(
          document.querySelectorAll(
            'a.markup--anchor.markup--p-anchor[target="_blank"]'
          ),
          el => {
            const text = el.innerText;
            return /^https:\/\/twitter\.com\/.+\/status\/\d+$/.test(text);
          }
        );
      });
      const props = await jsHandle.getProperties();
      for (const prop of props.values()) {
        const el = prop.asElement();
        if (el != null) {
          const { x, y, width, height } = await el.boundingBox();
          console.log("  at:", x + width, y + height);
          await page.mouse.click(x + width, y + height, { delay: 100 });
          await page.keyboard.press("Enter", { delay: 100 });
          await page.keyboard.press("Backspace", { delay: 100 });
        }
      }

      await page.shortcut("s");
      await this.waitForRequest(page, 10000, {
        rePathname: /^\/p\/[\dabcdef]+\/deltas$/
      });
      if (options != null && Object.keys(options).length > 0) {
        await this.updatePostOptions(page, options);
      }
      resolve();
    });
  }

  waitForLoadingApp(page: Page): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        await wait(1000);
        console.log("wait for medium's scripts");
        for (;;) {
          const existsMDM = await page.evaluate(() => window._mdm != null);
          console.log("  scripts exists:", existsMDM);
          if (existsMDM) {
            break;
          }
          await wait(500);
        }
        console.log("wait for loading medium's app");
        for (;;) {
          const isLoading = (await page.$("body.is-loadingApp")) != null;
          console.log("  loading:", isLoading);
          if (!isLoading) {
            break;
          }
          await wait(500);
        }
        resolve();
      } catch (err) {
        console.log("  loading error:", err);
        reject(err);
      }
    });
  }

  updatePostOptions(page: Page, options: PostOptions): Promise<void> {
    return new Promise(async (resolve, reject) => {
      console.log("open post options");
      await this.openPostOptions(page);
      {
        try {
          const selector = "div.js-tagToken";
          await page.waitForSelector(selector, { timeout: 1000 });
          await wait(1000);
          const tags = await page.$$(selector);
          if (tags.length > 0) {
            console.log("remove tags:", tags.length);
            const updated = this.waitForRequest(page, 1000, {
              rePathname: /^\/_\/api\/posts\/[\dabcdef]+\/tags$/
            });
            for (const tag of tags) {
              const button = await tag.$('button[data-action="remove-token"]');
              await button.click();
            }
            await updated;
          }
        } catch (err) {
          console.log("fail to remeove tag:", err);
        }
      }
      if (options.tags != null && options.tags.length > 0) {
        const { tags } = options;
        const selector = "div.js-tagInput span";
        await page.waitForSelector(selector);
        await wait(1000);
        console.log("add tags");
        const updated = this.waitForRequest(page, 1000, {
          rePathname: /^\/_\/api\/posts\/[\dabcdef]+\/tags$/
        });
        await page.click(selector);
        await page.focus(selector);
        for (const tag of tags) {
          console.log("  add tag:", tag);
          await page.type(selector, `${tag},`);
        }
        await updated;
      }
      resolve();
    });
  }

  waitForRequest(
    page: Page,
    timeout: number,
    matcher: {
      method?: string,
      host?: string,
      rePathname: RegExp
    }
  ): Promise<void> {
    const { method, host, rePathname } = {
      method: "POST",
      host: "medium.com",
      ...matcher
    };

    return new Promise(async (resolve, reject) => {
      console.log("wait for request:", method, host, rePathname);
      let timeoutId = setTimeout(async () => {
        await page.setRequestInterception(false);
        page.removeListener("request", (onRequested: any));
        resolve();
      }, timeout);
      const onRequested = async req => {
        req.continue();
        try {
          const u = url.parse(req.url);
          const matched =
            req.method === method &&
            u.host === host &&
            rePathname.test(String(u.pathname));
          console.log("  requested:", req.method, u.host, u.pathname, matched);
          if (matched) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(async () => {
              await page.setRequestInterception(false);
              page.removeListener("request", (onRequested: any));
              resolve();
            }, timeout);
          }
        } catch (err) {
          await page.setRequestInterception(false);
          page.removeListener("request", (onRequested: any));
          reject(err);
        }
      };
      await page.setRequestInterception(true);
      page.on("request", (onRequested: any));
    });
  }

  readPostOptions(page: Page): Promise<PostOptions> {
    return new Promise(async (resolve, reject) => {
      await this.openPostOptions(page);
      const options = {};
      {
        try {
          const selector = "div.js-tagToken";
          await page.waitForSelector(selector, { timeout: 100 });
          options.tags = await page.$$eval(selector, els =>
            Array.prototype.map.call(els, el => el.getAttribute("data-value"))
          );
        } catch (err) {}
      }
      resolve(options);
    });
  }

  openPostOptions(page: Page): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const selector = 'button[data-action="pre-publish"]';
      await page.waitForSelector(selector);
      const button = await page.$(selector);
      await wait(100);
      await button.click();
      resolve();
    });
  }

  readPost(postId: string): Promise<{ html: string, options: PostOptions }> {
    return new Promise(async (resolve, reject) => {
      const page = await this.newPage();
      const onResponse = async res => {
        const req = res.request();
        if (
          req.method !== "GET" ||
          req.url !== `https://medium.com/p/${postId}/edit`
        ) {
          return;
        }
        page.removeListener("response", (onResponse: any));
        if (res.status < 400) {
          return;
        }
        page.close().then(() => {
          reject(`${res.status} ${statusText(res.status)}`);
        });
      };
      page.on("response", (onResponse: any));

      const url = `https://medium.com/p/${postId}/edit`;
      await page.goto(url, { timeout: 0 });
      await this.waitForLogin(page, url);
      await page.waitForNavigation({ timeout: 0, waitUntil: "load" });
      await page.waitForSelector("div.section-inner");
      const html = await page.$eval("div.section-inner", el => {
        return el.innerHTML;
      });
      const options = await this.readPostOptions(page);
      await page.close();
      resolve({ html, options });
    });
  }

  destroyPost(postId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const page = await this.newPage();
      const url = `https://medium.com/p/${postId}/edit`;
      await page.goto(url, { timeout: 0 });
      await this.waitForLogin(page, url);
      {
        await page.waitForSelector(
          'button[data-action="show-post-actions-popover"]'
        );
        const button = await page.$(
          'button[data-action="show-post-actions-popover"]'
        );
        await wait(1000);
        await button.click();
      }
      {
        await page.waitForSelector('button[data-action="delete-post"]');
        const button = await page.$('button[data-action="delete-post"]');
        await wait(1000);
        await button.click();
      }
      {
        await page.waitForSelector('button[data-action="overlay-confirm"]');
        const button = await page.$('button[data-action="overlay-confirm"]');
        await wait(1000);
        await button.click();
      }
      const onResponse = async res => {
        const req = res.request();
        if (
          req.method !== "DELETE" ||
          req.url !== `https://medium.com/p/${postId}`
        ) {
          return;
        }
        page.removeListener("response", (onResponse: any));
        await page.close();
        resolve();
      };
      page.on("response", (onResponse: any));
    });
  }
}

module.exports = Client;
