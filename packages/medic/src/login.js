// @flow

const createClient = require("./client");
import type { SyncOptions } from "./types";

module.exports = (
  options: SyncOptions,
  args?: Array<string>,
): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    const client = createClient(options.parent, args);
    await client.login();
    resolve();
  });
};
