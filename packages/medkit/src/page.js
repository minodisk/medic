// @flow

import type {Page, ClipboardEvent} from './types';

const enhance = {
  shortcut: function(key: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      await this.keyboard.down('Control');
      await this.keyboard.press(key, {delay: 100});
      await this.keyboard.up('Control');
      resolve();
    });
  },

  setDataToClipboard: function(type: string, data: string) {
    return new Promise(async (resolve, reject) => {
      await this.evaluate(
        (t, d) => {
          const onCopy = (e: ClipboardEvent): void => {
            e.preventDefault();
            e.clipboardData.setData(t, d);
          };
          (document: any).addEventListener('copy', onCopy);
        },
        type,
        data,
      );
      await this.shortcut('c');
      resolve();
    });
  },

  waitForPushed: function(re: RegExp, timeout: number = 0) {
    return new Promise((resolve, reject) => {
      // Workaround
      // Page.prototype.waitForNavigation doens't work and 'framenavigated' event isn't fired when the url is changed via History API.
      // See this issue about this problem: https://github.com/GoogleChrome/puppeteer/issues/257
      const intervalId = setInterval(async () => {
        const url = await this.evaluate(() => location.href);
        const matched = url.match(re);
        if (matched == null) {
          return;
        }
        clearInterval(intervalId);
        if (timeoutId != null) {
          clearTimeout(timeoutId);
        }
        resolve(matched);
      }, 100);
      let timeoutId;
      if (timeout != null && timeout > 0) {
        timeoutId = setTimeout(() => {
          clearInterval(intervalId);
          reject(`waiting failed: timeout ${timeout}ms exceeded`);
        }, timeout);
      }
    });
  },
};

module.exports = function(page: any): Page {
  return Object.assign(page, enhance);
};
