const { GoogleSpreadsheet } = require("google-spreadsheet");
const {
  GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY,
} = require("./config");

async function init() {
  const doc = new GoogleSpreadsheet(
    "1tL66Q4ywdBdLG7zxMX5oQlAEgjPxogUJu5q0eyz69Lg"
  );

  try {
    await doc.useServiceAccountAuth({
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
    await doc.loadInfo();

    // console.log(doc.title + " spreadsheet is ready");
  } catch (err) {
    console.log("GoogleSpreadsheet - !!!Something went wrong!!!");
    console.log(err);
  }

  return doc;
}

module.exports = init;
