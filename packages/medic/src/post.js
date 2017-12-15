// @flow

const { md2html, html2md } = require("@minodisk/medmd");
const Client = require("@minodisk/medkit");
const { toPost, toText } = require("./format");
const { readFile, writeFile, glob } = require("./utils");

const readPost = (client: Client, postId: string): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const { html, options } = await client.readPost(postId);
    await client.close();
    const body = await html2md(html);
    resolve(toText({ meta: { id: postId, ...options }, body }));
  });
};

const syncPosts = (client: Client, patterns: Array<string>): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    for (const pattern of patterns) {
      const paths = await glob(pattern);
      for (const path of paths) {
        await syncPost(client, path);
      }
    }
  });
};

const syncPost = (client: Client, path: string): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    const text = await readFile(path);
    const post = toPost(text);
    const html = await md2html(post.body);

    client.context.logger.log("sync post:", html);

    const { id, ...options } = post.meta;
    if (id == null) {
      const postId = await client.createPost(html, options);
      post.meta.id = postId;
      const newText = toText(post);
      await writeFile(path, newText);
    } else {
      await client.updatePost(id, html, options);
    }
    await client.close();
    resolve();
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
