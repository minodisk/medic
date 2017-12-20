// @flow

const Client = require("@minodisk/medkit");
const ora = require("ora");
import type { RootOptions } from "./types";

module.exports = (options: RootOptions) => {
  return new Client(
    {
      startLog: (title: string) => {
        const spinner = ora(title).start();
        return {
          succeed: (text?: string) => {
            spinner.succeed(text ? `${title}: ${text}` : title);
          },
          fail: (text?: string) => {
            spinner.fail(text ? `${title}: ${text}` : title);
          },
          warn: (text?: string) => {
            spinner.warn(text ? `${title}: ${text}` : title);
          },
          info: (text?: string) => {
            spinner.info(text ? `${title}: ${text}` : title);
          },
          log: function(text?: string) {
            spinner.text = text ? `${title}: ${text}` : title;
          },
        };
      },
      debug: options.debug,
    },
    { cookiesPath: options.cookiesPath },
  );
};
