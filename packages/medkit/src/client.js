// @flow

const puppeteer = require("puppeteer");
const { wait, readFile, writeFile, statusText } = require("./utils");
const patchToPage = require("./page");
import type { Browser, Page, Cookie, PostOptions } from "./types";

const rEditURL = /^https:\/\/medium\.com\/p\/([\w\d]+)\/edit$/;

class Client {
  browser: Browser;
  cookies: Array<Cookie>;

  ready(cookiesPath: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await readFile(cookiesPath);
        this.cookies = JSON.parse(data);
      } catch (err) {
        this.cookies = await this.login();
        await writeFile(cookiesPath, JSON.stringify(this.cookies));
      }
      resolve();
    });
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
      if (this.cookies != null) {
        await page.setCookie(...this.cookies);
      }
      resolve(page);
    });
  }

  login(): Promise<Array<Cookie>> {
    return new Promise(async (resolve, reject) => {
      const page = await this.newPage();
      await page.goto("https://medium.com/m/signin", { timeout: 0 });
      const onChanged = async e => {
        if (e._url !== "https://medium.com/") {
          return;
        }
        page.removeListener("framenavigated", (onChanged: any));
        const cookies = await page.cookies();
        await page.close();
        resolve(cookies);
      };
      page.on("framenavigated", (onChanged: any));
    });
  }

  createPost(html: string, options?: PostOptions): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const page = await this.newPage();
      await this.gotoAndPaste(page, "https://medium.com/new-story", html);
      if (options != null) {
        await this.updatePostOptions(page, options);
      }
      await this.savePost(page);
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
        html
      );
      if (options != null) {
        await this.updatePostOptions(page, options);
      }
      await this.savePost(page);
      await page.close();
      resolve();
    });
  }

  gotoAndPaste(page: Page, url: string, html: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      await page.setDataToClipboard("text/html", html);
      await page.goto(url, { timeout: 0 });
      await page.waitForSelector("div.section-inner");
      await wait(1000);
      await page.focus("div.section-inner");
      await page.shortcut("a");
      await page.shortcut("v");
      resolve();
    });
  }

  updatePostOptions(page: Page, options: PostOptions): Promise<void> {
    return new Promise(async (resolve, reject) => {
      await this.openPostOptions(page);
      {
        try {
          const selector = 'button[data-action="remove-token"]';
          await page.waitForSelector(selector, { timeout: 100 });
          const buttons = await page.$$(selector);
          for (const button of buttons) {
            await button.click();
          }
        } catch (err) {}
      }
      if (options.tags != null && options.tags.length > 0) {
        const { tags } = options;
        const selector = "p.graf--p";
        await page.waitForSelector(selector);
        for (const tag of tags) {
          await wait(100);
          await page.type(selector, `${tag},`);
        }
      }
      resolve();
    });
  }

  savePost(page: Page): Promise<void> {
    return new Promise(async (resolve, reject) => {
      await page.shortcut("s");
      await wait(3000);
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
      await page.goto(`https://medium.com/p/${postId}/edit`, { timeout: 0 });
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
      await page.goto(`https://medium.com/p/${postId}/edit`, { timeout: 0 });
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
