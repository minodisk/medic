// @flow

const cheerio = require("cheerio");
const Client = require("../src/client");
const { stat, removeFile, wait } = require("../src/utils");

jest.setTimeout(60000);

describe.skip("login", () => {
  let client: Client;

  beforeAll(async () => {
    try {
      await stat("cookis.json");
      await removeFile("cookies.json");
    } catch (err) {}
    client = new Client({
      logger: {
        log: (...messages: Array<any>) => console.log(...messages),
      },
    });
  });

  afterAll(async () => {
    console.log("after all");
    await client.close();
  });

  it("should create cookies file", async () => {
    await client.login();
  });
});

describe("CRUD post", () => {
  let postId;
  let client: Client;

  beforeAll(async () => {
    try {
      await stat("cookis.json");
      await removeFile("cookies.json");
    } catch (err) {}
    client = new Client({
      logger: {
        log: (...messages: Array<any>) => console.log(...messages),
      },
    });
  });

  afterAll(async () => {
    console.log("after all");
    await client.close();
  });

  it("create and read", async () => {
    expect.assertions(4);

    const title = "Test for mediumn.createPost()";
    const subtitle = `Testing at ${new Date().getTime()}`;
    const text = "Is post created?";

    postId = await client.createPost(
      `<h3>${title}</h3><h4>${subtitle}</h4><p>${text}</p>`,
      {
        tags: ["medic", "test"],
      },
    );

    const { html, options } = await client.readPost(postId);
    const $ = cheerio.load(`<div>${html}</div>`);
    expect($("h1").text() || $("h3").text()).toBe(title);
    expect($("h2").text() || $("h4").text()).toBe(subtitle);
    expect($("p").text()).toBe(text);
    expect(options.tags).toEqual(["Medic", "Test"]);
  });

  it("created", () => {
    expect(postId).not.toBeUndefined();
  });

  it("update and read", async () => {
    expect.assertions(4);

    const title = "Test for mediumn.updatePost()";
    const subtitle = `Testing at ${new Date().getTime()}`;
    const text = "Is post updated?";

    await client.updatePost(
      postId,
      `<h3>${title}</h3><h4>${subtitle}</h4><p>${text}</p>`,
      {
        tags: ["medic", "updated"],
      },
    );

    const { html, options } = await client.readPost(postId);
    const $ = cheerio.load(`<div>${html}</div>`);
    expect($("h1").text() || $("h3").text()).toBe(title);
    expect($("h2").text() || $("h4").text()).toBe(subtitle);
    expect($("p").text()).toBe(text);
    expect(options.tags).toEqual(["Medic", "Updated"]);
  });

  it("destroy", async () => {
    expect.assertions(1);

    await client.destroyPost(postId);
    await expect(client.readPost(postId)).rejects.toMatch(
      "bad status: 410 is responsed",
    );
  });
});
