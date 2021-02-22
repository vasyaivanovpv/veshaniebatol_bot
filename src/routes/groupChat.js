const { ADMIN_PVB, REFEREE_CHANNEL, CHAT_PVB } = require("../config");
const Composer = require("telegraf/composer");

const adminRoute = require("./admin");
const pvbChat = require("./pvbсhat");
const refereeRoute = require("./referee");
const defaultRoute = require("./default");

const groupChatRoute = new Composer();
groupChatRoute.use(
  Composer.lazy((ctx) => {
    switch (ctx.chat.id) {
      case +REFEREE_CHANNEL:
        return refereeRoute;
      case +ADMIN_PVB:
        return adminRoute;
      case +CHAT_PVB:
        return pvbChat;
      default:
        return defaultRoute;
    }
  })
);

module.exports = groupChatRoute;
