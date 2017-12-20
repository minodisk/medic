// @flow

const { md2html, html2md } = require("@minodisk/medmd");
const Client = require("@minodisk/medkit");
const { toPost, toText } = require("./format");

const readPost = (client: Client, postId: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const { html, options } = await client.readPost(postId);
    await client.close();
    const body = await html2md(html);
    resolve(toText({ meta: { id: postId, ...options }, body }));
  });
};

const destroyPost = (client: Client, text: string): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    const { meta } = toPost(text);
    await client.destroyPost(meta.id);
    await client.close();
    resolve();
  });
};

module.exports = { syncPosts, readPost, destroyPost };
