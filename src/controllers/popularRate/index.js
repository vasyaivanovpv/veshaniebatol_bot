const Scene = require("telegraf/scenes/base");
const Markup = require("telegraf/markup");
const rateLimit = require("telegraf-ratelimit");
const { typesQuery } = require("../../constants");
const { splitArray, calculateRate } = require("../../utils");

const Track = require("../../models/Track");
const User = require("../../models/User");
const Round = require("../../models/Round");

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
  { text: "💩", value: 0 },
  { text: "💖", value: 1 },
];

const mainMenuBtn = [
  Markup.callbackButton(
    "Главное меню",
    JSON.stringify({
      type: typesQuery.MAIN_MENU,
    })
  ),
];

const selectRoundBtn = [
  Markup.callbackButton(
    "Выбрать раунд",
    JSON.stringify({
      type: typesQuery.ROUND_LIST,
    })
  ),
];

const getTrackIK = (trackDBid) => {
  const actionBtns = actionBtnValues.map((btn) =>
    Markup.callbackButton(
      btn.text,
      JSON.stringify({
        type: typesQuery.LIKE,
        id: trackDBid,
        v: btn.value,
      })
    )
  );

  return [actionBtns, selectRoundBtn];
};

const getRoundIK = async () => {
  const roundsDB = await Round.find(
    { status: ["active", "finished"] },
    "name",
    { sort: { index: 1 } }
  );

  const btns = roundsDB.map((round) =>
    Markup.callbackButton(
      round.name.split(" ")[0],
      JSON.stringify({
        type: typesQuery.SELECT_ROUND,
        id: round._id.toString(),
      })
    )
  );

  const ik = splitArray(btns);

  ik.push(mainMenuBtn);

  return ik;
};

const popularRate = new Scene("popular_rate");

popularRate.use(rateLimit(limitConfig));

popularRate.start(async (ctx) => {
  return ctx.scene.enter("main_menu");
});

popularRate.enter(async (ctx) => {
  const promoRoundDB = await Round.findOne({ index: 0 });
  const userDB = await User.findOne({ telegramId: ctx.from.id });

  ctx.session.rateOptions = {
    userDBid: userDB._id.toString(),
    roundDBid: promoRoundDB._id.toString(),
  };

  const countTracksDB = await Track.countDocuments({
    user: { $ne: ctx.session.rateOptions.userDBid },
    rateUsers: { $ne: ctx.from.id },
  });
  if (!countTracksDB) {
    await ctx.replyWithMarkdown(`❗️ Нет треков для оценивания!`);
    return ctx.scene.enter("main_menu");
  }

  const roundIK = await getRoundIK();

  await ctx.replyWithMarkdown(
    `🎶 *Оценить треки* \n\n*Новый алгоритм!* Бот присылает тебе по порядку все треки начиная с выбранного тобой раунда ПВБ9. С этого момента репер не сможет оценить свои треки, а все остальные *не будут повторяться*. Таким образом каждый трек с батла получится оценить *только один раз*! Кнопка 💖 это +1 балл, а кнопка 💩 это 0 баллов. \n\nВсего треков без твоей оценки: *${countTracksDB}!* \n\n*ВЫБЕРИ РАУНД!*`,
    Markup.inlineKeyboard(roundIK, { columns: 5 }).extra()
  );
});

popularRate.leave(async (ctx) => {
  const countTracksDB = await Track.countDocuments({
    user: { $ne: ctx.session.rateOptions.userDBid },
    rateUsers: { $ne: ctx.from.id },
  });

  delete ctx.session.rateOptions;

  await ctx.replyWithMarkdown(
    `❗️ Остались без твоей оценки: *${countTracksDB}!*`
  );
});

popularRate.on("callback_query", async (ctx) => {
  const { type, id, v } = JSON.parse(ctx.callbackQuery.data);

  let trackDB, roundIK, trackIK;

  switch (type) {
    case typesQuery.SELECT_ROUND:
      trackDB = await Track.findOne(
        {
          user: { $ne: ctx.session.rateOptions.userDBid },
          round: id,
          rateUsers: { $ne: ctx.from.id },
        },
        "trackId",
        {
          sort: { uploadedAt: 1 },
        }
      );

      if (!trackDB) return ctx.answerCbQuery(`Нет треков для оценивания!`);

      ctx.session.rateOptions.roundDBid = id;

      const roundDB = await Round.findById(id);
      trackIK = getTrackIK(trackDB._id.toString());

      await ctx.replyWithMarkdown(`❗️ Ты выбрал *${roundDB.name}*!`);

      await ctx.editMessageReplyMarkup();
      await ctx.answerCbQuery();
      return ctx.replyWithAudio(
        trackDB.trackId,
        Markup.inlineKeyboard(trackIK).extra()
      );

    case typesQuery.LIKE:
      trackDB = await Track.findById(id);
      trackDB.popularRate = trackDB.popularRate + v;
      trackDB.rateUsers.push(ctx.from.id);
      await trackDB.save();

      const popularRateCoef = calculateRate(
        trackDB.popularRate,
        trackDB.rateUsers.length
      );

      await Track.updateOne({ _id: id }, { popularRateCoef: popularRateCoef });

      trackDB = await Track.findOne(
        {
          user: { $ne: ctx.session.rateOptions.userDBid },
          round: ctx.session.rateOptions.roundDBid,
          rateUsers: { $ne: ctx.from.id },
        },
        "trackId",
        {
          sort: { uploadedAt: 1 },
        }
      );

      if (!trackDB) {
        roundIK = await getRoundIK();

        await ctx.editMessageReplyMarkup();
        await ctx.replyWithMarkdown(`❗️ С этого раунда закончились треки!`);
        return ctx.replyWithMarkdown(
          `❗️ Выбери раунд, треки которого будешь оценивать!`,
          Markup.inlineKeyboard(roundIK, { columns: 5 }).extra()
        );
      }

      trackIK = getTrackIK(trackDB._id.toString());

      await ctx.editMessageReplyMarkup();
      await ctx.answerCbQuery();
      return ctx.replyWithAudio(
        trackDB.trackId,
        Markup.inlineKeyboard(trackIK).extra()
      );

    case typesQuery.ROUND_LIST:
      roundIK = await getRoundIK();

      await ctx.editMessageReplyMarkup();

      await ctx.replyWithMarkdown(
        `❗️ Выбери раунд, треки которого будешь оценивать!`,
        Markup.inlineKeyboard(roundIK, { columns: 5 }).extra()
      );

      return ctx.answerCbQuery();

    case typesQuery.MAIN_MENU:
      await ctx.editMessageReplyMarkup();
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
