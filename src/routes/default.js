const Composer = require("telegraf/composer");

const defaultRoute = new Composer();
defaultRoute.on("new_chat_members", async (ctx) => {
  await ctx.replyWithMarkdown(`Подпольное Вещание Батол @veshaniebatol`);
});

module.exports = defaultRoute;
