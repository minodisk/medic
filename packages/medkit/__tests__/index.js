// @flow

const cheerio = require('cheerio');
const Client = require('../src/client');
const {removeFile} = require('../src/utils');

jest.setTimeout(60000);

describe.skip('readCookies()', () => {
  it('should be create cookies', async () => {
    expect.assertions(1);
    await removeFile('cookies.json');
    const client = new Client();
    const cookies = await client.readCookies();
    for (const cookie of cookies) {
      if (cookie.name === 'sid') {
        expect(cookie.name).toBe('sid');
      }
    }
  });
});

describe('CRUD post', () => {
  let postId;
  let client: Client;

  beforeAll(async () => {
    client = new Client();
    await client.ready('cookies.json');
  });

  afterAll(async () => {
    console.log('afterAll');
    await client.close();
  });

  it(`create and read`, async () => {
    expect.assertions(3);

    const title = 'Test for mediumn.createPost()';
    const subtitle = `Testing at ${new Date().getTime()}`;
    const text = 'Is post created?';

    postId = await client.createPost(
      `<h3>${title}</h3><h4>${subtitle}</h4><p>${text}</p>`,
    );

    const html = await client.readPost(postId);
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

    await client.updatePost(
      postId,
      `<h3>${title}</h3><h4>${subtitle}</h4><p>${text}</p>`,
    );

    const html = await client.readPost(postId);
    const $ = cheerio.load(`<div>${html}</div>`);
    expect($('h1').text() || $('h3').text()).toBe(title);
    expect($('h2').text() || $('h4').text()).toBe(subtitle);
    expect($('p').text()).toBe(text);
  });

  it(`destroy`, async () => {
    expect.assertions(1);

    await client.destroyPost(postId);
    await expect(client.readPost(postId)).rejects.toMatch('410 Gone');
  });
});
