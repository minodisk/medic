// @flow

const Client = require("@minodisk/medkit");
const { toPost } = require("./format");

module.exports = (client: Client, text: string): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    const { meta } = toPost(text);
    await client.destroyPost(meta.id);
    await client.close();
    resolve();
  });
};
