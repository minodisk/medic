// @flow

const Client = require("@minodisk/medkit");
const { html2md } = require("@minodisk/medmd");
const { toText } = require("./format");

module.exports = (client: Client, postId: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const { html, options } = await client.readPost(postId);
    await client.close();
    const body = await html2md(html);
    resolve(toText({ meta: { id: postId, ...options }, body }));
  });
};
