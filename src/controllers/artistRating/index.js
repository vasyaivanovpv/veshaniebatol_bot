const Scene = require("telegraf/scenes/base");
const Markup = require("telegraf/markup");
const { typesQuery } = require("../../constants");
const { getArtistList } = require("../../helpers");

const Track = require("../../models/Track");
const User = require("../../models/User");

const mainMenuBtn = [
  Markup.callbackButton(
    "Главное меню",
    JSON.stringify({
      type: typesQuery.MAIN_MENU,
    })
  ),
];

const artistRating = new Scene("artist_rating");

artistRating.start(async (ctx) => {
  return ctx.scene.enter("main_menu");
});

artistRating.enter(async (ctx) => {
  const artistsDB = await User.find(
    { status: ["active", "finished"] },
    "rapName status totalRate",
    {
      sort: {
        totalRate: -1,
      },
      limit: 20,
    }
  );

  const topTrackList = getArtistList(artistsDB);

  await ctx.replyWithMarkdown(
    `👥 *Рейтинг исполнителей, ТОП-20* \n_Судейские баллы. Рейтинг обновляется каждый раунд после окончания судейства._ \n\n${topTrackList}\n_Введи никнейм исполнителя, чтобы узнать его количество баллов._`,
    Markup.inlineKeyboard(mainMenuBtn).extra()
  );
});

artistRating.on("text", async (ctx) => {
  const { text } = ctx.message;

  const userDB = await User.findOne({
    rapName: { $regex: new RegExp("^" + text.toLowerCase(), "i") },
  });
  if (!userDB) return ctx.replyWithMarkdown("❗️ Нет такого юзера");

  return ctx.replyWithMarkdown(
    `❗️ Репер *${userDB.rapName}*, баллов: *${userDB.totalRate}*!`
  );
});

artistRating.on("callback_query", async (ctx) => {
  const { type } = JSON.parse(ctx.callbackQuery.data);

  switch (type) {
    case typesQuery.MAIN_MENU:
      await ctx.answerCbQuery();
      return ctx.scene.enter("main_menu");

    default:
      return ctx.answerCbQuery("🐶ГАВ🐶");
  }
});

artistRating.use(async (ctx) => {
  return ctx.replyWithMarkdown(`❗️ Вернуться в главное меню /start`);
});

module.exports = artistRating;
