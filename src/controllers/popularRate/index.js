const Scene = require("telegraf/scenes/base");
const Markup = require("telegraf/markup");
const rateLimit = require("telegraf-ratelimit");
const { typesQuery } = require("../../constants");
const { shuffleArray } = require("../../utils");

const Track = require("../../models/Track");
const User = require("../../models/User");

const limitConfig = {
  window: 3 * 1000,
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
  const userDB = await User.findOne({ telegramId: ctx.from.id });
  if (!userDB.tempRateTracks.length) {
    await ctx.replyWithMarkdown(
      `❗️ Ты оценил все треки! Но можешь еще раз сделать это!`
    );
    return ctx.scene.enter("popular_rate");
  }

  const firstTrackId = userDB.tempRateTracks.shift();
  await userDB.save();

  const trackDB = await Track.findById(firstTrackId);
  const ik = getIK(firstTrackId);

  await ctx.editMessageReplyMarkup();
  await ctx.replyWithAudio(trackDB.trackId, Markup.inlineKeyboard(ik).extra());
};

const popularRate = new Scene("popular_rate");

popularRate.use(rateLimit(limitConfig));

popularRate.start(async (ctx) => {
  return ctx.scene.enter("main_menu");
});

popularRate.enter(async (ctx) => {
  const userDB = await User.findOne({ telegramId: ctx.from.id });
  const tracksDB = await Track.find({ user: { $ne: userDB._id } }, "_id");
  if (!tracksDB.length) {
    await ctx.replyWithMarkdown(
      `❗️ Нет треков для оценивания! Вернуться в главное меню /start`
    );
    return ctx.scene.enter("main_menu");
  }

  await ctx.replyWithMarkdown(
    "🎶 *Оценить треки* \n\n*Новый алгоритм!* Бот присылает вам случайным образом треки со всей базы ПВБ9. С этого момента репер не сможет оценить свои треки, а все остальные *не будут повторяться*, но можно оценить еще раз все треки в новой сессии. Кнопка 💖 это +1 балл, а кнопка 💩 это -1 балл."
  );

  const trackIds = tracksDB.map((track) => track._id.toString());
  shuffleArray(trackIds);

  const firstTrackId = trackIds.shift();

  userDB.tempRateTracks = trackIds;
  await userDB.save();

  const trackDB = await Track.findById(firstTrackId);
  const ik = getIK(firstTrackId);

  return ctx.replyWithAudio(trackDB.trackId, Markup.inlineKeyboard(ik).extra());
});

popularRate.on("callback_query", async (ctx) => {
  const { type, id } = JSON.parse(ctx.callbackQuery.data);

  let prevTrackDB;

  switch (type) {
    case typesQuery.LIKE:
      prevTrackDB = await Track.findById(id);
      prevTrackDB.popularRate = prevTrackDB.popularRate + 1;
      await prevTrackDB.save();

      await ctx.answerCbQuery();
      return sendNextTrack(ctx);

    case typesQuery.DISLIKE:
      prevTrackDB = await Track.findById(id);
      prevTrackDB.popularRate = prevTrackDB.popularRate - 1;
      await prevTrackDB.save();

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
