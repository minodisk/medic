const {
  cookiesJSON,
  getCookies,
  createClient,
  createPost,
  readPost,
  updatePost,
  destroyPost,
  close,
} = require('../src/index');
const cheerio = require('cheerio');
const fs = require('fs');

jest.setTimeout(60000);

test.skip('cookies', async () => {
  expect.assertions(1);

  await (() =>
    new Promise((resolve, reject) => {
      fs.unlink(cookiesJSON, err => {
        resolve();
      });
    }))();
  const cookies = await getCookies();
  for (cookie of cookies) {
    if (cookie.name === 'sid') {
      expect(cookie.name).toBe('sid');
    }
  }
});

describe('CRUD post', () => {
  let postId;
  let client;

  beforeAll(async () => {
    client = await createClient();
  });

  afterAll(async () => {
    await close(client);
  });

  it(`create and read`, async () => {
    expect.assertions(3);

    const title = 'Test for mediumn.createPost()';
    const subtitle = `Testing at ${new Date().getTime()}`;
    const text = 'Is post created?';

    postId = await createPost(
      client,
      `<h3>${title}</h3><h4>${subtitle}</h4><p>${text}</p>`,
    );

    const html = await readPost(client, postId);
    const $ = cheerio.load(`<div>${html}</div>`);
    expect($('h1').text() || $('h3').text()).toBe(title);
    expect($('h2').text() || $('h4').text()).toBe(subtitle);
    expect($('p').text()).toBe(text);
  });

  it('created', () => {
    expect(postId).not.toBeUndefined();
  });

  it(`update and read`, async () => {
    expect.assertions(3);

    const title = 'Test for mediumn.updatePost()';
    const subtitle = `Testing at ${new Date().getTime()}`;
    const text = 'Is post updated?';

    await updatePost(
      client,
      postId,
      `<h3>${title}</h3><h4>${subtitle}</h4><p>${text}</p>`,
    );

    const html = await readPost(client, postId);
    const $ = cheerio.load(`<div>${html}</div>`);
    expect($('h1').text() || $('h3').text()).toBe(title);
    expect($('h2').text() || $('h4').text()).toBe(subtitle);
    expect($('p').text()).toBe(text);
  });

  it(`destroy`, async () => {
    expect.assertions(1);

    await destroyPost(client, postId);
    await expect(readPost(client, postId)).rejects.toMatch('410 Gone');
  });
});
