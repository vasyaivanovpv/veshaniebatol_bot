const { ADMIN_PVB, REFEREE_CHANNEL } = require("../config");
const Composer = require("telegraf/composer");

const adminRoute = require("./admin");
const refereeRoute = require("./referee");
const defaultRoute = require("./default");

const groupChatRoute = new Composer();
groupChatRoute.use(
  Composer.lazy((ctx) => {
    const { chat } = ctx;

    switch (chat.id) {
      case +REFEREE_CHANNEL:
        return refereeRoute;
      case +ADMIN_PVB:
        return adminRoute;
      default:
        console.log(ctx.chat);
        return defaultRoute;
    }
  })
);

module.exports = groupChatRoute;
