// @flow

const { join } = require("path");
const puppeteer = require("puppeteer");
const defer = require("deferp");
const { wait, stat, readFile, writeFile } = require("./utils");
const patchToPage = require("./page");

const HEX = "([\\dabcdef]+)";

import type {
  Browser,
  Page,
  Cookie,
  PostOptions,
  JSHandle,
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
    const pathToExtension = join(__dirname, "../extensions/paste/");
    this.launchOptions = {
      headless: true,
      args:
        process.env.DOCKER === "true"
          ? ["--no-sandbox", "--disable-setuid-sandbox"]
          : [
              `--disable-extensions-except=${pathToExtension}`,
              `--load-extension=${pathToExtension}`,
            ],
    };
    if (options != null) {
      if (options.headless != null) {
        this.launchOptions.headless = options.headless;
      }
      if (options.args != null) {
        this.launchOptions.args = [...this.launchOptions.args, ...options.args];
      }
    }
  }

  async open(useShortcut: boolean): Promise<void> {
    if (this.browser != null) {
      return;
    }
    console.log(this.launchOptions);
    this.browser = await puppeteer.launch(this.launchOptions);
  }

  async close(): Promise<void> {
    if (this.browser == null) {
      return;
    }
    await this.browser.close();
    delete this.browser;
  }

  async newPage(useShortcut: boolean = false): Promise<Page> {
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

    await this.open(useShortcut);
    const page = patchToPage(await this.browser.newPage());
    await page.setViewport({
      width: 1000,
      height: 1000,
    });
    const ua = await page.getUserAgent();
    await page.setUserAgent(ua.replace("Headless", ""));
    await page.setCookie(...this.cookies);
    return page;
  }

  async login(): Promise<void> {
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
    await page.waitForResponse("GET", "https://medium.com/me/stats", {
      timeout: 0,
    });
    this.cookies = await page.cookies();
    await browser.close();
    await writeFile(this.cookiesPath, JSON.stringify(this.cookies));

    logger.succeed();
  }

  async gotoAndLogin(
    page: Page,
    url: string,
    options?: { timeout?: number },
  ): Promise<void> {
    for (;;) {
      const deferred = defer(
        page.waitForResponse("GET", url, {
          timeout: 0,
        }),
      );
      await page.goto(url, options);
      const { status } = await deferred();
      if (status >= 300) {
        await this.login();
        await page.setCookie(...this.cookies);
        continue;
      }
      return;
    }
  }

  async createPost(html: string, options?: PostOptions): Promise<string> {
    const page = await this.newPage(true);
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
    return postId;
  }

  async updatePost(
    postId: string,
    html: string,
    options?: PostOptions,
  ): Promise<void> {
    const page = await this.newPage(true);
    await this.gotoAndPaste(
      page,
      `https://medium.com/p/${postId}/edit`,
      html,
      options,
    );
    await page.close();
  }

  async gotoAndPaste(
    page: Page,
    url: string,
    html: string,
    options?: PostOptions,
  ): Promise<void> {
    await this.gotoAndLogin(page, url, { timeout: 0 });
    await this.waitForLoading(page);
    await this.waitForInitializing(page);
    await this.pasteHTML(page, html);
    await this.embed(page);
    await this.savePost(page);
    if (options != null && Object.keys(options).length > 0) {
      await this.openPostOptions(page);
      await this.removeTags(page);
      if (options.tags != null && options.tags.length > 0) {
        await this.addTags(page, options.tags);
      }
    }
  }

  async waitForLoading(page: Page): Promise<void> {
    const logger = this.context.startLog("loading");
    await page.waitForFunction(() => window._mdm != null);
    logger.succeed();
  }

  async waitForInitializing(page: Page): Promise<void> {
    const logger = this.context.startLog("initializing");
    await page.waitForFunction(
      () => document.querySelector("body.is-loadingApp") == null,
      { polling: "mutation" },
    );
    logger.succeed();
  }

  async pasteHTML(page: Page, html: string): Promise<void> {
    const logger = this.context.startLog("pasting");
    const selector = "div.section-inner";
    await page.waitForSelector(selector);

    logger.log("focus");
    await page.focus(selector);
    logger.log("select all");
    await page.execCommand("selectAll");
    logger.log("set data to clipboard");
    await page.setDataToClipboard("text/html", html);
    logger.log("paste");
    await page.execCommandViaExtension("paste");

    logger.succeed();
  }

  async embed(page: Page): Promise<void> {
    const hints = [
      "https://gist.github.com/",
      "https://medium.com/",
      "https://twitter.com/",
    ];
    const logger = this.context.startLog("embedding");

    const jsHandle = await page.evaluateHandle((hints: Array<string>) => {
      return Array.prototype.filter.call(
        document.querySelectorAll(
          'a.markup--anchor.markup--p-anchor[target="_blank"]',
        ),
        el => {
          const url = el.innerText;
          for (const hint of hints) {
            if (url.indexOf(hint) === 0) {
              return true;
            }
          }
          return false;
        },
      );
    }, hints);
    const props: Map<string, JSHandle> = await jsHandle.getProperties();
    for (const prop of props.values()) {
      const el = prop.asElement();
      if (el != null) {
        const { x, y, width, height } = await el.boundingBox();
        const right = Math.floor(x + width - 1);
        const bottom = Math.floor(y + height - 1);

        logger.log(`expand at (${right}, ${bottom})`);

        await page.mouse.click(right, bottom, { delay: 100 });
        await page.keyboard.press("Enter", { delay: 100 });
        await page.keyboard.press("Backspace", { delay: 100 });
      }
    }

    logger.succeed();
  }

  async savePost(page: Page): Promise<void> {
    const logger = this.context.startLog("saving post");
    for (let i = 0; ; i++) {
      try {
        await page.waitForResponse(
          "POST",
          `https://medium.com/p/${HEX}/deltas?(.*)`,
        );

        logger.log(`saved partially ${i}`);

        continue;
      } catch (err) {
        if (err === "timeout") {
          logger.succeed();
          return;
        }
        logger.fail(err);
        throw err;
      }
    }
  }

  async openPostOptions(page: Page): Promise<void> {
    const selector = 'button[data-action="pre-publish"]';
    await page.waitForSelector(selector);
    const button = await page.$(selector);
    await wait(100);
    await button.click();
  }

  async removeTags(page: Page): Promise<void> {
    const logger = this.context.startLog("removing tags");

    const selector = "div.js-tagToken";
    try {
      await page.waitForSelector(selector, { timeout: 1000 });
    } catch (err) {
      logger.succeed();
      return;
    }
    const tips = await page.$$(selector);
    if (tips.length === 0) {
      logger.succeed();
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
        );
      } catch (err) {
        logger.fail(err);
        throw err;
      }
    }

    logger.succeed();
  }

  async addTags(page: Page, tags: Array<string>): Promise<void> {
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
        );
      } catch (err) {
        logger.fail(err);
        throw err;
      }
    }

    logger.succeed();
  }

  async readPostOptions(page: Page): Promise<PostOptions> {
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
    return options;
  }

  async readPost(
    postId: string,
  ): Promise<{ html: string, options: PostOptions }> {
    const logger = this.context.startLog(`reading post`);
    logger.log(`${postId}`);

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
      return { html, options };
    } catch (err) {
      logger.fail(err);
      throw err;
    }
  }

  async destroyPost(postId: string): Promise<void> {
    const logger = this.context.startLog(`destroying post`);
    logger.log(`${postId}`);

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

    {
      const selector = 'button[data-action="overlay-confirm"]';
      await page.waitForSelector(selector);
      await wait(1000);
      await page.click(selector);
    }

    try {
      await page.waitForResponse("DELETE", `https://medium.com/p/${postId}`);
    } catch (err) {
      await page.close();
      logger.fail(err);
      throw err;
    }

    await page.close();
    logger.succeed();
  }
}

module.exports = Client;
