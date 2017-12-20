// @flow

const url = require("url");
const qs = require("querystring");
const puppeteer = require("puppeteer");
const { wait, stat, readFile, writeFile } = require("./utils");
const patchToPage = require("./page");

import type {
  Browser,
  Page,
  Cookie,
  PostOptions,
  JSHandle,
  ElementHandle,
  Logger,
  Context,
  Options,
} from "./types";

const rEditURL = /^https:\/\/medium\.com\/p\/([\w\d]+)\/edit$/;

class Client {
  context: Context;
  options: Options;
  browser: Browser;
  cookies: Array<Cookie>;

  constructor(
    context?: {
      logger?: Logger,
      debug?: boolean,
    },
    options?: {
      cookiesPath?: string,
    },
  ) {
    this.context = {
      debug: false,
      ...context,
    };
    this.options = {
      cookiesPath: "cookies.json",
      ...options,
    };
    if (this.context.logger == null) {
      this.context.logger = {
        log: (...message: Array<any>): void => {},
      };
    }
  }

  open(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (this.browser != null) {
        resolve();
        return;
      }
      this.browser = await puppeteer.launch({ headless: !this.context.debug });
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
      if (this.cookies == null) {
        for (;;) {
          try {
            await stat(this.options.cookiesPath);
            const content = await readFile(this.options.cookiesPath);
            this.cookies = JSON.parse(content);
            if (this.cookies != null) {
              break;
            }
          } catch (err) {
            await this.login();
          }
        }
      }

      await this.open();
      const page = patchToPage(await this.browser.newPage());
      page.setContext(this.context);
      await page.setViewport({
        width: 1000,
        height: 1000,
      });
      const ua = await page.getUserAgent();
      await page.setUserAgent(ua.replace("Headless", ""));
      await page.setCookie(...this.cookies);
      resolve(page);
    });
  }

  login(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      this.context.logger.log("start to login");
      const browser = await puppeteer.launch({ headless: false });
      const page = patchToPage(await browser.newPage());
      page.setContext(this.context);
      await page.setViewport({ width: 1000, height: 1000 });
      this.context.logger.log("  open login page");
      await page.goto(
        "https://medium.com/m/signin?redirect=https://medium.com/me/stats",
      );
      this.context.logger.log("  wait for user operation");
      await page.waitForResponse("GET", "https://medium.com/me/stats", {
        timeout: 0,
      });
      this.cookies = await page.cookies();
      await browser.close();
      await writeFile(this.options.cookiesPath, JSON.stringify(this.cookies));
      this.context.logger.log("complete to login");
      resolve();
    });
  }

  gotoAndLogin(
    page: Page,
    url: string,
    options?: { timeout?: number },
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      for (;;) {
        try {
          await page.goto(url, options);
          const status = await page.waitForResponse("GET", url);
          if (status >= 300) {
            await this.login();
            await page.setCookie(...this.cookies);
            continue;
          }
        } catch (err) {
          reject(err);
          return;
        }
        resolve();
        return;
      }
    });
  }

  createPost(html: string, options?: PostOptions): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const page = await this.newPage();
      await this.gotoAndPaste(
        page,
        "https://medium.com/new-story",
        html,
        options,
      );
      const matched = await page.waitForPushed(rEditURL);
      await page.close();
      resolve(matched[1]);
    });
  }

  updatePost(
    postId: string,
    html: string,
    options?: PostOptions,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const page = await this.newPage();
      await this.gotoAndPaste(
        page,
        `https://medium.com/p/${postId}/edit`,
        html,
        options,
      );
      await page.close();
      resolve();
    });
  }

  gotoAndPaste(
    page: Page,
    url: string,
    html: string,
    options?: PostOptions,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      await page.setDataToClipboard("text/html", html);
      await this.gotoAndLogin(page, url, { timeout: 0 });
      await this.waitForLoading(page);
      await page.focus("div.section-inner");
      await page.shortcut("a");
      await page.shortcut("v");

      this.context.logger.log("embed tweets");
      const jsHandle = await page.evaluateHandle(() => {
        return Array.prototype.filter.call(
          document.querySelectorAll(
            'a.markup--anchor.markup--p-anchor[target="_blank"]',
          ),
          el => {
            const text = el.innerText;
            return /^https:\/\/twitter\.com\/.+\/status\/\d+$/.test(
              String(text),
            );
          },
        );
      });
      const props: Map<string, JSHandle> = await jsHandle.getProperties();
      for (const prop of props.values()) {
        const el = prop.asElement();
        if (el != null) {
          const { x, y, width, height } = await el.boundingBox();
          const right = Math.floor(x + width - 1);
          const center = Math.floor(y + height / 2);
          this.context.logger.log("  at:", right, center);
          await page.mouse.click(right, center, { delay: 100 });
          await page.keyboard.press("Enter", { delay: 100 });
          await page.keyboard.press("Backspace", { delay: 100 });
        }
      }

      await page.shortcut("s");
      this.context.logger.log("wait for saving post");
      for (let i = 0; ; i++) {
        try {
          await page.waitForResponse(
            "POST",
            /^https:\/\/medium\.com\/p\/[\dabcdef]+\/deltas/,
          );
          this.context.logger.log("  saved:", i);
          continue;
        } catch (err) {
          if (err === "timeout") {
            this.context.logger.log("saving post complete");
            break;
          }
          reject(err);
          return;
        }
      }

      if (options != null && Object.keys(options).length > 0) {
        await this.updatePostOptions(page, options);
      }
      resolve();
    });
  }

  waitForLoading(page: Page): Promise<void> {
    return new Promise(async (resolve, reject) => {
      this.context.logger.log("wait for loading");
      try {
        await wait(1000);

        // await page.waitForNavigation({ waitUntil: "load" });

        this.context.logger.log("  wait for loading scripts");
        for (;;) {
          const existsMDM = await page.evaluate(() => window._mdm != null);
          this.context.logger.log("  exists scripts:", existsMDM);
          if (existsMDM) {
            break;
          }
          await wait(500);
        }
        this.context.logger.log("  complete to loading scripts");

        this.context.logger.log("  wait for loading app");
        for (;;) {
          const isLoading = (await page.$("body.is-loadingApp")) != null;
          this.context.logger.log("  loading app:", isLoading);
          if (!isLoading) {
            break;
          }
          await wait(500);
        }
        this.context.logger.log("  complete to loading app");

        this.context.logger.log("complete loading");
        resolve();
      } catch (err) {
        this.context.logger.log("  loading error:", err);
        reject(err);
        return;
      }
    });
  }

  updatePostOptions(page: Page, options: PostOptions): Promise<void> {
    return new Promise(async (resolve, reject) => {
      this.context.logger.log("open post options");
      await this.openPostOptions(page);
      await this.removeTags(page);
      if (options.tags != null && options.tags.length > 0) {
        await this.addTags(page, options.tags);
      }
      resolve();
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

  removeTags(page: Page): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const selector = "div.js-tagToken";
      try {
        await page.waitForSelector(selector, { timeout: 1000 });
      } catch (err) {
        resolve();
        return;
      }
      const tags = await page.$$(selector);
      if (tags.length === 0) {
        resolve();
        return;
      }
      this.context.logger.log("remove tags:", tags.length);
      for (const tag of tags) {
        const button = await tag.$('button[data-action="remove-token"]');
        await button.click();
        try {
          await page.waitForResponse(
            "POST",
            /^https:\/\/medium.com\/_\/api\/posts\/[\dabcdef]+\/tags$/,
          );
        } catch (err) {
          reject(err);
          return;
        }
      }
      this.context.logger.log("remove tags: complete");
      resolve();
    });
  }

  addTags(page: Page, tags: Array<string>): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const selector = "div.js-tagInput span";
      await page.waitForSelector(selector);
      this.context.logger.log("add tags:", tags);
      await page.click(selector);
      for (const tag of tags) {
        this.context.logger.log("  add tag:", tag);
        await page.type(selector, `${tag},`);
        try {
          await page.waitForResponse(
            "POST",
            /^https:\/\/medium.com\/_\/api\/posts\/[\dabcdef]+\/tags$/,
          );
        } catch (err) {
          console.log("udpated error:", err);
          reject(err);
          return;
        }
      }
      this.context.logger.log("add tags: complete");
      resolve();
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
            Array.prototype.map.call(els, el => el.getAttribute("data-value")),
          );
        } catch (err) {}
      }
      resolve(options);
    });
  }

  readPost(postId: string): Promise<{ html: string, options: PostOptions }> {
    return new Promise(async (resolve, reject) => {
      try {
        this.context.logger.log("read post:", postId);
        const page = await this.newPage();
        const url = `https://medium.com/p/${postId}/edit`;
        await this.gotoAndLogin(page, url, { timeout: 0 });
        await page.waitForSelector("div.section-inner");
        const html = await page.$eval("div.section-inner", el => {
          return el.innerHTML;
        });
        const options = await this.readPostOptions(page);
        await page.close();
        resolve({ html, options });
      } catch (err) {
        reject(err);
      }
    });
  }

  destroyPost(postId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const page = await this.newPage();
      const url = `https://medium.com/p/${postId}/edit`;
      await this.gotoAndLogin(page, url, { timeout: 0 });
      {
        const selector = 'button[data-action="show-post-actions-popover"]';
        await page.waitForSelector(selector);
        await wait(1000);
        await page.click(selector);
      }
      {
        const selector = 'button[data-action="delete-post"]';
        await page.waitForSelector(selector);
        await wait(1000);
        await page.click(selector);
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

      {
        const selector = 'button[data-action="overlay-confirm"]';
        await page.waitForSelector(selector);
        await wait(1000);
        await page.click(selector);
      }
    });
  }
}

module.exports = Client;
