const config = {
  TOKEN: process.env.TOKEN_TEST,
  MAIN_CHANNEL: process.env.CHANNEL_TEST,
  CHANNEL: process.env.CHANNEL_TEST,
  ADMIN_PVB: process.env.TEST_ADMIN_GROUP,
  CHAT_PVB: process.env.CHAT_PVB,
  CHANNEL_NAME: process.env.CHANNEL_NAME,
  REFEREE_CHANNEL: process.env.TEST_CHAT,
  DB_URL: "mongodb://localhost:27017/" + process.env.DB_NAME,
  DB_HOST: "localhost:27017",
  DB_NAME: process.env.DB_NAME,
  DB_USER: "",
  DB_PASSWORD: "",
  ADMIN_ID: process.env.ADMIN_ID,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
  ACTIVE_SHEET: 4,
};

if (process.env.NODE_ENV === "production") {
  config.TOKEN = process.env.TOKEN;
  config.MAIN_CHANNEL = process.env.MAIN_CHANNEL;
  config.CHANNEL = process.env.CHANNEL;
  config.ADMIN_PVB = process.env.ADMIN_PVB;
  config.REFEREE_CHANNEL = process.env.REFEREE_CHANNEL;
  config.DB_URL = process.env.DB_URL;
  config.DB_HOST = process.env.DB_HOST;
  config.DB_USER = process.env.DB_USER;
  config.DB_PASSWORD = process.env.DB_PASSWORD;
  config.ACTIVE_SHEET = 0;
}

module.exports = config;
