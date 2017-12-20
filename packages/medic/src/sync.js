// @flow

const Client = require("@minodisk/medkit");
const { md2html } = require("@minodisk/medmd");
const { toPost, toText } = require("./format");
const { readFile, writeFile, glob } = require("./utils");

module.exports = function sync(
  patterns: Array<string>,
  options: {
    parent: {
      debug: boolean,
      verbose: boolean,
      cookiesPath: string,
    },
  },
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const { verbose, debug, cookiesPath } = options.parent;
    await syncPosts(
      new Client(
        {
          logger: verbose
            ? {
                log: (...messages: Array<any>) => console.log(...messages),
              }
            : null,
          debug,
        },
        { cookiesPath },
      ),
      patterns,
    );
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
