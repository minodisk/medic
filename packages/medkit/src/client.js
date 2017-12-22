// @flow

const { join } = require("path");
const url = require("url");
const qs = require("querystring");
const puppeteer = require("puppeteer");
const { wait, stat, readFile, writeFile } = require("./utils");
const patchToPage = require("./page");

const HEX = "([\\dabcdef]+)";

import type {
  Browser,
  Page,
  Cookie,
  PostOptions,
  JSHandle,
  ElementHandle,
  Logger,
  Context,
  LaunchOptions,
} from "./types";

class Client {
  context: Context;
  cookiesPath: string;
  launchOptions: LaunchOptions;
  browser: Browser;
  cookies: Array<Cookie>;

  constructor(
    context?: {
      startLog: (message: string) => Logger,
    },
    options?: {
      cookiesPath?: string,
      headless?: boolean,
      args?: Array<string>,
    },
  ) {
    this.context = {
      startLog: (title: string) => {
        console.log(`start ${title}`);
        return {
          succeed: (text?: string = "") =>
            console.log(`succeed ${title}: ${text}`),
          fail: (text?: string = "") => console.error(`${title}: ${text}`),
          warn: (text?: string = "") => console.warn(`${title}: ${text}`),
          info: (text?: string = "") => console.info(`${title}: ${text}`),
          log: (text?: string = "") => console.log(`${title}: ${text}`),
        };
      },
      ...context,
    };
    this.cookiesPath =
      options != null && options.cookiesPath != null
        ? options.cookiesPath
        : join(process.cwd(), "cookies.json");
    this.launchOptions =
      options != null
        ? {
            headless: options.headless,
            args: options.args,
          }
        : {};
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
      this.browser = await puppeteer.launch(this.launchOptions);
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
            await stat(this.cookiesPath);
            const content = await readFile(this.cookiesPath);
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
      const logger = this.context.startLog("login");
      const browser = await puppeteer.launch({
        ...this.launchOptions,
        headless: false,
      });
      const page = patchToPage(await browser.newPage());
      await page.setViewport({ width: 1000, height: 1000 });

      logger.log("open login page");
      await page.goto(
        "https://medium.com/m/signin?redirect=https://medium.com/me/stats",
      );

      logger.log("wait for user operation");
      await page.waitForResponse(
        "GET",
        "https://medium.com/me/stats",
        {
          timeout: 0,
        },
        logger,
      );
      this.cookies = await page.cookies();
      await browser.close();
      await writeFile(this.cookiesPath, JSON.stringify(this.cookies));

      logger.succeed();
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
          const { status } = await page.waitForResponse("GET", url);
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

      const logger = this.context.startLog("getting post ID");
      const { result } = await page.waitForURL(
        `https://medium.com/p/:postId${HEX}/edit`,
      );
      const { postId } = result;
      logger.succeed(postId);

      await page.close();
      resolve(postId);
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
      await this.gotoAndLogin(page, url, { timeout: 0 });
      await this.waitForLoading(page);
      await this.waitForInitializing(page);
      await this.pasteHTML(page, html);
      await this.embedTweets(page);
      await this.savePost(page);
      if (options != null && Object.keys(options).length > 0) {
        await this.openPostOptions(page);
        await this.removeTags(page);
        if (options.tags != null && options.tags.length > 0) {
          await this.addTags(page, options.tags);
        }
      }
      resolve();
    });
  }

  waitForLoading(page: Page): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const logger = this.context.startLog("loading");
      await page.waitForFunction(() => window._mdm != null);
      logger.succeed();
      resolve();
    });
  }

  waitForInitializing(page: Page): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const logger = this.context.startLog("initializing");
      await page.waitForFunction(
        () => document.querySelector("body.is-loadingApp") == null,
        { polling: "mutation" },
      );
      logger.succeed();
      resolve();
    });
  }

  pasteHTML(page: Page, html: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const logger = this.context.startLog("pasting");
      await page.setDataToClipboard("text/html", html);
      const selector = "div.section-inner";
      await page.waitForSelector(selector);
      await page.focus(selector);
      await page.shortcut("a");
      await page.shortcut("v");
      logger.succeed();
      resolve();
    });
  }

  embedTweets(page: Page): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const logger = this.context.startLog("embedding tweets");

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

          logger.log(`expand at (${right}, ${center})`);

          await page.mouse.click(right, center, { delay: 100 });
          await page.keyboard.press("Enter", { delay: 100 });
          await page.keyboard.press("Backspace", { delay: 100 });
        }
      }

      logger.succeed();
      resolve();
    });
  }

  savePost(page: Page): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const logger = this.context.startLog("saving post");

      for (let i = 0; ; i++) {
        try {
          await page.waitForResponse(
            "POST",
            `https://medium.com/p/${HEX}/deltas?(.*)`,
            {},
            logger,
          );

          logger.log(`saved partially ${i}`);

          continue;
        } catch (err) {
          if (err === "timeout") {
            logger.succeed();
            resolve();
            break;
          }
          logger.fail(err);
          reject(err);
          return;
        }
      }
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
      const logger = this.context.startLog("removing tags");

      const selector = "div.js-tagToken";
      try {
        await page.waitForSelector(selector, { timeout: 1000 });
      } catch (err) {
        logger.succeed();
        resolve();
        return;
      }
      const tips = await page.$$(selector);
      if (tips.length === 0) {
        logger.succeed();
        resolve();
        return;
      }

      for (let i = 0; i < tips.length; i++) {
        const tip = tips[i];
        const label = await tip.$('button[data-action="focus-token"]');
        const tag = await (await label.getProperty("innerText")).jsonValue();
        logger.log(`${i + 1}/${tips.length} ${tag}`);
        const button = await tip.$('button[data-action="remove-token"]');
        await button.click();
        try {
          await page.waitForResponse(
            "POST",
            `https://medium.com/_/api/posts/${HEX}/tags`,
            {},
            logger,
          );
        } catch (err) {
          logger.fail(err);
          reject(err);
          return;
        }
      }

      logger.succeed();
      resolve();
    });
  }

  addTags(page: Page, tags: Array<string>): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const logger = this.context.startLog("adding tags");

      const selector = "div.js-tagInput span";
      await page.waitForSelector(selector);
      await page.click(selector);
      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        logger.log(`${i + 1}/${tags.length} ${tag}`);
        await page.type(selector, `${tag},`);
        try {
          await page.waitForResponse(
            "POST",
            `https://medium.com/_/api/posts/${HEX}/tags`,
            {},
            logger,
          );
        } catch (err) {
          logger.fail(err);
          reject(err);
          return;
        }
      }

      logger.succeed();
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
      const logger = this.context.startLog(`reading post`);
      logger.log(`ID ${postId}`);

      try {
        const page = await this.newPage();
        const url = `https://medium.com/p/${postId}/edit`;
        await this.gotoAndLogin(page, url, { timeout: 0 });
        await page.waitForSelector("div.section-inner");
        const html = await page.$eval("div.section-inner", el => {
          return el.innerHTML;
        });
        const options = await this.readPostOptions(page);
        await page.close();

        logger.succeed();
        resolve({ html, options });
      } catch (err) {
        logger.fail(err);
        reject(err);
      }
    });
  }

  destroyPost(postId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const logger = this.context.startLog(`destroying post`);
      logger.log(`ID ${postId}`);

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

        logger.succeed();
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
