const { GoogleSpreadsheet } = require("google-spreadsheet");

async function init() {
  const doc = new GoogleSpreadsheet(
    "1tL66Q4ywdBdLG7zxMX5oQlAEgjPxogUJu5q0eyz69Lg"
  );

  try {
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY,
    });
    await doc.loadInfo();

    // console.log(doc.title + " spreadsheet is ready");
  } catch (err) {
    console.log("GoogleSpreadsheet - !!!Something went wrong!!!");
  }

  return doc;
}

module.exports = init;
