// @flow

const puppeteer = require("puppeteer");
const { wait, readFile, writeFile, statusText } = require("./utils");
const patchToPage = require("./page");
import type { Browser, Page, Cookie } from "./types";

const rEditURL = /^https:\/\/medium\.com\/p\/([\w\d]+)\/edit$/;

class Client {
  browser: Browser;
  cookies: Array<Cookie>;

  ready(cookiesPath: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      this.browser = await puppeteer.launch({ headless: false });
      this.cookies = await this.readCookies(cookiesPath);
      resolve();
    });
  }

  async close() {
    return this.browser.close();
  }

  readCookies(cookiesPath: string): Promise<Array<Cookie>> {
    return new Promise(async (resolve, reject) => {
      let cookies;
      try {
        const data = await readFile(cookiesPath);
        cookies = JSON.parse(data);
      } catch (err) {
        cookies = await this.login();
        await writeFile(cookiesPath, JSON.stringify(cookies));
      }
      resolve(cookies);
    });
  }

  newPage(): Promise<Page> {
    return new Promise(async (resolve, reject) => {
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
      await page.goto("https://medium.com/m/signin");
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

  createPost(html: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const page = await this.newPage();
      await page.setDataToClipboard("text/html", html);
      await page.goto(`https://medium.com/new-story`);
      await page.waitForSelector("div.section-inner");
      await wait(100);
      await page.focus("div.section-inner");
      await page.shortcut("a");
      await page.shortcut("v");
      await page.shortcut("s");
      const matched = await page.waitForPushed(rEditURL);
      await wait(2000);
      await page.close();
      resolve(matched[1]);
    });
  }

  readPost(postId: string): Promise<string> {
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
      await page.goto(`https://medium.com/p/${postId}/edit`);
      await page.waitForNavigation({ timeout: 0, waitUntil: "load" });
      await page.waitForSelector("div.section-inner");
      const html = await page.$eval("div.section-inner", el => {
        return el.innerHTML;
      });
      await page.close();
      resolve(html);
    });
  }

  updatePost(postId: string, html: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const page = await this.newPage();
      await page.setDataToClipboard("text/html", html);
      await page.goto(`https://medium.com/p/${postId}/edit`);
      await page.waitForSelector(".js-postField");
      await wait(100);
      await page.focus(".js-postField");
      await page.shortcut("a");
      await page.shortcut("v");
      await page.shortcut("s");
      await wait(2000);
      await page.close();
      resolve();
    });
  }

  destroyPost(postId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const page = await this.newPage();
      await page.goto(`https://medium.com/p/${postId}/edit`);
      {
        await page.waitForSelector(
          'button[data-action="show-post-actions-popover"]'
        );
        const button = await page.$(
          'button[data-action="show-post-actions-popover"]'
        );
        await wait(100);
        await button.click();
      }
      {
        await page.waitForSelector('button[data-action="delete-post"]');
        const button = await page.$('button[data-action="delete-post"]');
        await wait(100);
        await button.click();
      }
      {
        await page.waitForSelector('button[data-action="overlay-confirm"]');
        const button = await page.$('button[data-action="overlay-confirm"]');
        await wait(100);
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
