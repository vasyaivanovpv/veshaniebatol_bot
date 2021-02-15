const https = require("https");
const fs = require("fs");

module.exports = {
  logStart: () => console.log("BOT HAS BEEN STARTED......"),

  debug: (obj = {}) => JSON.stringify(obj, null, 4),

  escapeRegExp: (str = "") =>
    `${str}`.replace(/[_*[\]()~`>#+-=|{}.!]/g, "\\$&"), // $& means the whole matched string
  escapeChar: (string = "") => string.replace(/[_*[`]/g, "\\$&"), // $& means the whole matched string
  checkInteger: (num) =>
    (num ^ 0) === num && num > 0 && num !== Infinity && num !== -Infinity,
  parseFloor: (string) => {
    if (string.split("/").length === 2) {
      return string.split("/").map((str) => Number(str));
    } else {
      return null;
    }
  },
  toHashTag: (str) =>
    str
      .replace(/[-]/g, " ")
      .split(" ")
      .map((s) => s[0].toUpperCase() + s.slice(1))
      .join(""),
  toNumber: (str) => {
    if (str.split(",").length > 1) {
      return +Number(str.split(",").join(".")).toFixed(1);
    } else {
      return +Number(str).toFixed(1);
    }
  },
  toString: (number) => String(number).split(".").join(","),
  toPlural: (str) => `${str.slice(0, -1).toLowerCase()}ы`,
  getCountDaysFromNow: (date) =>
    +((new Date() - date) / 1000 / 60 / 60 / 24).toFixed(),
  isJSONString: (str) => {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  },
  declOfNum: (n, titles) =>
    titles[
      n % 10 == 1 && n % 100 != 11
        ? 0
        : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)
        ? 1
        : 2
    ],
  increaseMonth: (now, num) =>
    new Date(
      now.getFullYear(),
      now.getMonth() + num,
      now.getDate(),
      now.getHours(),
      now.getMinutes()
    ),
  toStringDate: (date) =>
    [
      `${date.getDate()}`.padStart(2, "0"),
      `${date.getMonth() + 1}`.padStart(2, "0"),
      date.getFullYear(),
    ].join("."),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  formatPrice: (price) => `${price}`.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1 "),
  downloadFIle: (url, dest) => {
    return new Promise((resolve, reject) => {
      const request = https.get(url, (response) => {
        if (response.statusCode === 200) {
          const file = fs.createWriteStream(dest, { flags: "wx" });
          file.on("finish", () => resolve());
          file.on("error", (err) => {
            file.close();
            if (err.code === "EEXIST") reject("File already exists");
            else fs.unlink(dest, () => reject(err.message)); // Delete temp file
          });
          response.pipe(file);
        } else if (response.statusCode === 302 || response.statusCode === 301) {
          //Recursively follow redirects, only a 200 will resolve.
          // this.downloadFIle(response.headers.location, dest).then(() =>
          //   resolve()
          // );
          reject(
            `Server responded with ${response.statusCode}: ${response.statusMessage}`
          );
        } else {
          reject(
            `Server responded with ${response.statusCode}: ${response.statusMessage}`
          );
        }
      });

      request.on("error", (err) => {
        reject(err.message);
      });
    });
  },
  removeFile: (path) => {
    return new Promise((resolve, reject) => {
      fs.unlink(path, (err) => {
        if (err) throw err;
        reject("file was deleted");
      });
      resolve();
    });
  },
  shuffleArray: (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  isValidDate: (d) => d instanceof Date && !isNaN(d),
  getRandomInt: (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  splitArray: (arr, perChunk = 5) => {
    let i, j, tempArr;
    const resultArr = [];
    for (i = 0, j = arr.length; i < j; i += perChunk) {
      tempArr = arr.slice(i, i + perChunk);
      resultArr.push(tempArr);
    }
    return resultArr;
  },
  calculateRate: (likes, all) => {
    const a = likes + 1;
    const b = all - likes + 1;

    return (
      a / (a + b) -
      1.65 * Math.sqrt((a * b) / (Math.pow(a + b, 2) * (a + b + 1)))
    );
  },
};
