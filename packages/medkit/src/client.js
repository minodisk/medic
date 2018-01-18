// @flow

const { join } = require("path");
const puppeteer = require("puppeteer");
const defer = require("deferp");
const Listr = require("listr");
const { wait, stat, readFile, writeFile } = require("./utils");
const patchToPage = require("./page");

const HEX = "([\\dabcdef]+)";

import type { ListrItem, Task } from "listr";
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

  gotoAndLogin(
    page: Page,
    url: string,
    options?: { timeout?: number },
  ): ListrItem {
    return {
      title: "check login status",
      task: ({}, task) => {
        return new Listr([
          {
            title: `go to ${url}`,
            task: async ctx => {
              const deferred = defer(
                page.waitForResponse("GET", url, {
                  timeout: 0,
                }),
              );
              await page.goto(url, options);
              const { status } = await deferred();
              ctx.status = status;
            },
          },
          {
            title: "login and set cookies",
            skip: ctx => ctx.status < 300,
            task: () => {
              return new Listr([
                this.login(),
                {
                  title: "set cookies",
                  task: () => page.setCookie(...this.cookies),
                },
              ]);
            },
          },
        ]);
      },
    };
  }

  login(): ListrItem {
    return {
      title: "login",
      task: (): Listr<{ page: Page }> => {
        return new Listr([
          {
            title: "open browser",
            task: async ctx => {
              ctx.browser = await puppeteer.launch({
                ...this.launchOptions,
                headless: false,
              });
            },
          },
          {
            title: "open new page",
            task: async ctx => {
              ctx.page = patchToPage(await ctx.browser.newPage());
              return ctx.page.setViewport({ width: 1000, height: 1000 });
            },
          },
          {
            title: "go to login page",
            task: ctx =>
              ctx.page.goto(
                "https://medium.com/m/signin?redirect=https://medium.com/me/stats",
              ),
          },
          {
            title: "wait for user operation",
            task: ctx =>
              ctx.page.waitForResponse("GET", "https://medium.com/me/stats", {
                timeout: 0,
              }),
          },
          {
            title: "get cookies",
            task: ctx => (this.cookies = ctx.page.cookies()),
          },
          {
            title: "close browser",
            task: ctx => ctx.browser.close(),
          },
          {
            title: "write cookies file",
            task: () =>
              writeFile(this.cookiesPath, JSON.stringify(this.cookies)),
          },
        ]);
      },
    };
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

  updatePost(
    postId: string,
    html: string,
    options?: PostOptions,
  ): Array<ListrItem> {
    return [
      {
        title: "open new page",
        task: async ctx => {
          ctx.page = await this.newPage(true);
        },
      },
      {
        title: "go to post page",
        task: ctx =>
          new Listr(
            this.gotoAndPaste(
              ctx.page,
              `https://medium.com/p/${postId}/edit`,
              html,
              options,
            ),
          ),
      },
      {
        title: "close page",
        task: ctx => ctx.page.close(),
      },
    ];
  }

  gotoAndPaste(
    page: Page,
    url: string,
    html: string,
    options?: PostOptions,
  ): Array<ListrItem> {
    return [
      this.gotoAndLogin(page, url, { timeout: 0 }),
      {
        title: "loading",
        task: () => this.waitForLoading(page),
      },
      {
        title: "initializing",
        task: () => this.waitForInitializing(page),
      },
      this.pasteHTML(page, html),
      this.embed(page),
      this.savePost(page),
      {
        title: "update post options",
        skip: () => options == null || Object.keys(options).length === 0,
        task: () =>
          new Listr([
            {
              title: "open post options",
              task: () => this.openPostOptions(page),
            },
            this.removeTags(page),
            ...(options == null || options.tags == null
              ? []
              : [this.addTags(page, options.tags)]),
          ]),
      },
    ];
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

  pasteHTML(page: Page, html: string): ListrItem {
    const selector = "div.section-inner";
    return {
      title: "paste HTML",
      task: () =>
        new Listr([
          {
            title: "wait for selector",
            task: () => page.waitForSelector(selector),
          },
          {
            title: "focus at text area",
            task: () => page.focus(selector),
          },
          {
            title: "select all",
            task: () => page.execCommand("selectAll"),
          },
          {
            title: "set data to clipboard",
            task: () => page.setDataToClipboard("text/html", html),
          },
          {
            title: "paste",
            task: () => page.execCommandViaExtension("paste"),
          },
        ]),
    };
  }

  embed(page: Page): ListrItem {
    return {
      title: "embed URLs",
      task: async (ctx, task) => {
        const hints = [
          "https://gist.github.com/",
          "https://medium.com/",
          "https://twitter.com/",
        ];
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
            task.output = `expand at (${right}, ${bottom})`;
            await page.mouse.click(right, bottom, { delay: 100 });
            await page.keyboard.press("Enter", { delay: 100 });
            await page.keyboard.press("Backspace", { delay: 100 });
          }
        }
      },
    };
  }

  savePost(page: Page): ListrItem {
    return {
      title: "save post",
      task: async (ctx, task): Promise<void> => {
        for (let i = 0; ; i++) {
          try {
            await page.waitForResponse(
              "POST",
              `https://medium.com/p/${HEX}/deltas?(.*)`,
            );
            task.output = `saved partially ${i}`;
            continue;
          } catch (err) {
            if (err === "timeout") {
              return;
            }
            throw err;
          }
        }
      },
    };
  }

  async openPostOptions(page: Page): Promise<void> {
    const selector = 'button[data-action="pre-publish"]';
    await page.waitForSelector(selector);
    const button = await page.$(selector);
    await wait(100);
    await button.click();
  }

  removeTags(page: Page): ListrItem {
    return {
      title: "remove tags",
      task: (_, task) => {
        const selector = "div.js-tagToken";
        return new Listr([
          {
            title: `wait for selector '${selector}'`,
            task: async () => {
              try {
                await page.waitForSelector(selector, { timeout: 1000 });
              } catch (err) {
                task.skip(`no tag`);
              }
            },
          },
          {
            title: `get tags`,
            task: async ctx => {
              ctx.tips = await page.$$(selector);
              if (ctx.tips.length === 0) {
                task.skip(`no tag`);
              }
            },
          },
          {
            title: `remove tags`,
            task: ctx =>
              new Listr(
                ctx.tips.map((tip, i) => {
                  return {
                    title: `remove tag: ${i}`,
                    task: async () => {
                      const label = await tip.$(
                        'button[data-action="focus-token"]',
                      );
                      const tag = await (await label.getProperty(
                        "innerText",
                      )).jsonValue();
                      const button = await tip.$(
                        'button[data-action="remove-token"]',
                      );
                      await button.click();
                      await page.waitForResponse(
                        "POST",
                        `https://medium.com/_/api/posts/${HEX}/tags`,
                      );
                    },
                  };
                }),
              ),
          },
        ]);
      },
    };
  }

  addTags(page: Page, tags: Array<string>): ListrItem {
    return {
      title: "add tags",
      task: () => {
        const selector = "div.js-tagInput span";
        return new Listr([
          {
            title: `wait for selector '${selector}'`,
            task: () => page.waitForSelector(selector),
          },
          {
            title: `click selector '${selector}'`,
            task: () => page.click(selector),
          },
          {
            title: `add tags`,
            task: () =>
              new Listr(
                tags.map((tag, i) => {
                  return {
                    title: `add tag: '${tag}'`,
                    task: async () => {
                      await page.type(selector, `${tag},`);
                      await page.waitForResponse(
                        "POST",
                        `https://medium.com/_/api/posts/${HEX}/tags`,
                      );
                    },
                  };
                }),
              ),
          },
        ]);
      },
    };
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
