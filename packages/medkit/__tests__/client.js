// @flow

const cheerio = require("cheerio");
const Client = require("../src/client");
const { stat, removeFile, wait } = require("../src/utils");

jest.setTimeout(120000);

const createClient = () =>
  new Client(undefined, {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

// describe.skip("login", () => {
//   let client: Client;
//
//   beforeAll(async () => {
//     try {
//       await stat("cookies.json");
//       await removeFile("cookies.json");
//     } catch (err) {}
//     client = createClient();
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

  beforeAll(async () => {
    client = createClient();
  });

  afterAll(async () => {
    await client.close();
  });

  it("should work", async () => {
    expect.assertions(10);

    let postId;

    {
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
    }

    expect(postId).not.toBeUndefined();

    {
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
    }

    {
      await client.destroyPost(postId);
      await expect(client.readPost(postId)).rejects.toMatch(
        "bad status: 410 is responsed",
      );
    }
  });
});
