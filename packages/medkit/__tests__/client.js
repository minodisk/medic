// @flow

const cheerio = require("cheerio");
const Client = require("../src/client");
const { stat, removeFile, wait } = require("../src/utils");

jest.setTimeout(120000);

// describe.skip("login", () => {
//   let client: Client;
//
//   beforeAll(async () => {
//     try {
//       await stat("cookies.json");
//       await removeFile("cookies.json");
//     } catch (err) {}
//     client = new Client();
//   });
//
//   afterAll(async () => {
//     await client.close();
//   });
//
//   it("should create cookies file", async () => {
//     await client.login();
//   });
// });

describe("CRUD post", () => {
  let client: Client;
  let postId;

  beforeAll(async () => {
    client = new Client();
  });

  afterAll(async () => {
    await client.close();
  });

  it("create", async () => {
    expect.assertions(5);
    const title = "Test for mediumn.createPost()";
    const subtitle = `Testing at ${new Date().getTime()}`;
    const text = "Is post created?";
    postId = await client.createPost(
      `<h3>${title}</h3><h4>${subtitle}</h4><p>${text}</p>`,
      {
        tags: ["medic", "test"],
      },
    );

    expect(postId).not.toBeUndefined();

    const { html, options } = await client.readPost(postId);
    const $ = cheerio.load(`<div>${html}</div>`);
    expect($("h1").text() || $("h3").text()).toBe(title);
    expect($("h2").text() || $("h4").text()).toBe(subtitle);
    expect($("p").text()).toBe(text);
    expect(options.tags).toEqual(["Medic", "Test"]);
  });

  it("update", async () => {
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
    await expect(client.readPost(postId)).rejects.toBe("bad status: 410");
  });
});
