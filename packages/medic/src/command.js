#!/usr/bin/env node
// @flow

const program = require("commander");
const login = require("./login");
const sync = require("./sync");
const { version } = require("../package.json");

program
  .version(version)
  .option("-d, --debug", "not to use headless Chromium", false)
  .option("-c, --cookies-path <path>", "cookies file path", "cookies.json");

program
  .command("login")
  .description("login to Medium")
  .action(async options => {
    try {
      await login(options);
    } catch (err) {
      process.stderr.write(err.toString());
    }
  });

// program
//   .command("fetch [ids...]")
//   .description("fetches posts")
//   .option("-o, --out <directory>", "output directory")
//   .action((ids, options) => {
//     console.log("action:", ids, options);
//   })
//   .on("--help", () => {
//     process.stdout.write(`
//   Examples:
//
//     medic fetch 0123456789abc
//     medic fetch --out=articles/
//     medic fetch --out=articles/ 0123456789abc
// `);
//   });

program
  .command("sync <patterns...>")
  .description("creates or updates posts in Medium")
  .on("--help", () => {
    process.stdout.write(`

  Examples:

    medic sync articles/*.md
    medic sync articles/example.md
    medic sync $(git diff --name-only)
`);
  })
  .action(async (patterns, options) => {
    try {
      await sync(patterns, options);
    } catch (err) {
      process.stderr.write(err.toString());
    }
  });

// program
//   .command("delete <patterns...>")
//   .description("deletes posts")
//   .action((patterns, options) => {
//     console.log("delete:", patterns, options);
//   })
//   .on("--help", () => {
//     process.stdout.write(`
//   Examples:
//
//     medic delete articles/example.md
// `);
//   });

program.parse(process.argv);
