const Scene = require("telegraf/scenes/base");
const Markup = require("telegraf/markup");
const rateLimit = require("telegraf-ratelimit");
const { typesQuery } = require("../../constants");

const Track = require("../../models/Track");
const User = require("../../models/User");

const limitConfig = {
  window: 1 * 1000,
  limit: 1,
  keyGenerator: function (ctx) {
    return ctx.chat.id;
  },
  onLimitExceeded: async (ctx) => {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery();
    }
    await ctx.reply("❗️ Не спеши, послушай сначала трек!");
  },
};

const actionBtnValues = [
  { type: typesQuery.DISLIKE, text: "💩" },
  { type: typesQuery.LIKE, text: "💖" },
];

const mainMenuBtn = [
  Markup.callbackButton(
    "Главное меню",
    JSON.stringify({
      type: typesQuery.MAIN_MENU,
    })
  ),
];

const getIK = (trackDbId) => {
  const actionBtns = actionBtnValues.map((value) =>
    Markup.callbackButton(
      value.text,
      JSON.stringify({
        type: value.type,
        id: trackDbId,
      })
    )
  );

  return [actionBtns, mainMenuBtn];
};

const sendNextTrack = async (ctx) => {
  const filter = await getFilter(ctx.from.id);
  const trackDB = await Track.findOne(filter, "trackId", {
    sort: { uploadedAt: 1 },
  });
  if (!trackDB) return ctx.scene.enter("main_menu");

  const ik = getIK(trackDB._id.toString());

  await ctx.editMessageReplyMarkup();
  return ctx.replyWithAudio(trackDB.trackId, Markup.inlineKeyboard(ik).extra());
};

const getFilter = async (userTgId) => {
  const userDB = await User.findOne({ telegramId: userTgId });
  return {
    user: { $ne: userDB._id },
    rateUsers: { $ne: userTgId },
  };
};

const popularRate = new Scene("popular_rate");

popularRate.use(rateLimit(limitConfig));

popularRate.start(async (ctx) => {
  return ctx.scene.enter("main_menu");
});

popularRate.enter(async (ctx) => {
  const filter = await getFilter(ctx.from.id);

  const countTracksDB = await Track.countDocuments(filter);
  if (!countTracksDB) {
    await ctx.replyWithMarkdown(`❗️ Нет треков для оценивания!`);
    return ctx.scene.enter("main_menu");
  }

  await ctx.replyWithMarkdown(
    "🎶 *Оценить треки* \n\n*Новый алгоритм!* Бот присылает тебе по порядку все треки начиная с промо раунда ПВБ9. С этого момента репер не сможет оценить свои треки, а все остальные *не будут повторяться*. Таким образом каждый трек с батла получится оценить *только один раз*! Кнопка 💖 это +1 балл, а кнопка 💩 это 0 баллов."
  );
  await ctx.replyWithMarkdown(
    `❗️ Остались без твоей оценки: *${countTracksDB}!*`
  );

  const trackDB = await Track.findOne(filter, "trackId", {
    sort: { uploadedAt: 1 },
  });
  const ik = getIK(trackDB._id.toString());

  return ctx.replyWithAudio(trackDB.trackId, Markup.inlineKeyboard(ik).extra());
});

popularRate.leave(async (ctx) => {
  const filter = await getFilter(ctx.from.id);
  const countTracksDB = await Track.countDocuments(filter);

  await ctx.replyWithMarkdown(
    `❗️ Остались без твоей оценки: *${countTracksDB}!*`
  );
});

popularRate.on("callback_query", async (ctx) => {
  const { type, id } = JSON.parse(ctx.callbackQuery.data);

  let trackDB;

  switch (type) {
    case typesQuery.LIKE:
      trackDB = await Track.findById(id);
      trackDB.popularRate = trackDB.popularRate + 1;
      trackDB.rateUsers.push(ctx.from.id);
      await trackDB.save();

      await ctx.answerCbQuery();
      return sendNextTrack(ctx);

    case typesQuery.DISLIKE:
      trackDB = await Track.findById(id);
      trackDB.rateUsers.push(ctx.from.id);
      await trackDB.save();

      await ctx.answerCbQuery();
      return sendNextTrack(ctx);

    case typesQuery.MAIN_MENU:
      await ctx.answerCbQuery();
      return ctx.scene.enter("main_menu");
    default:
      return ctx.answerCbQuery("Используй актуальные кнопки");
  }
});

popularRate.use(async (ctx) => {
  return ctx.replyWithMarkdown(`❗️ Вернуться в главное меню /start`);
});

module.exports = popularRate;
