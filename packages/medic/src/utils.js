// @flow

const fs = require("fs");
const glob = require("glob");

exports.readFile = (path: string): Promise<string> =>
  new Promise((resolve, reject) => {
    fs.readFile(path, (err, text) => {
      if (err != null) {
        return reject(err);
      }
      resolve(text.toString());
    });
  });

exports.writeFile = (path: string, data: string): Promise<void> =>
  new Promise((resolve, reject) => {
    fs.writeFile(path, data, err => {
      if (err != null) {
        return reject(err);
      }
      resolve();
    });
  });

exports.glob = (pattern: string): Promise<Array<string>> =>
  new Promise((resolve, reject) => {
    glob(pattern, (err, files) => {
      if (err != null) {
        return reject(err);
      }
      resolve(files);
    });
  });
