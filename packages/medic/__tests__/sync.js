// @flow

const { join } = require("path");
const { sync } = require("../src");

jest.setTimeout(60000);

const postIds = [];

describe("sync", () => {
  it("should work without error", async () => {
    await sync([join(__dirname, "fixtures/sync.md")], {
      parent: {
        debug: false,
      },
    });
  });
});
