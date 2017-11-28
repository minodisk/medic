// @flow

const {md2html, html2md} = require('@minodisk/medmd');
const {
  createClient,
  createPost,
  readPost,
  updatePost,
  destroyPost,
} = require('@minodisk/medkit');

const ready = (() => {
  let client;
  return async () => {
    if (client != null) {
      return Promise.resolve(client);
    }
    client = await createClient();
    return Promise.resolve(client);
  };
})();

const create = async (md: string) => {
  const client = await ready();
  const html = await md2html(md);
  return createPost(client, html);
};

const read = async (postId: string) => {
  const client = await ready();
  const html = await readPost(client, postId);
  return html2md(html);
};

const update = async (postId: string, md: string) => {
  const client = await ready();
  const html = await md2html(md);
  return updatePost(client, postId, html);
};

const destroy = async (postId: string) => {
  const client = await ready();
  return destroyPost(client);
};

module.exports = {create, read};
