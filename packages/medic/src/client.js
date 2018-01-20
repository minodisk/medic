// @flow

const Client = require("@minodisk/medkit");
const ora = require("ora");
import type { RootOptions } from "./types";

module.exports = (options: RootOptions, args?: Array<string>) => {
  return new Client(
    {
      startLog: (title: string) => {
        const spinner = ora(title).start();
        return {
          succeed: (text?: string) => {
            spinner.succeed(text ? `${title}: ${text}` : null);
          },
          fail: (text?: string) => {
            spinner.fail(text ? `${title}: ${text}` : null);
          },
          warn: (text?: string) => {
            spinner.warn(text ? `${title}: ${text}` : null);
          },
          info: (text?: string) => {
            spinner.info(text ? `${title}: ${text}` : null);
          },
          log: function(text?: string) {
            spinner.text = text ? `${title}: ${text}` : null;
          },
        };
      },
    },
    {
      cookiesPath: options.cookiesPath,
      headless: !options.debug,
      args,
    },
  );
};
