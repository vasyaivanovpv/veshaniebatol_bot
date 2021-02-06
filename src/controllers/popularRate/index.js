const Scene = require("telegraf/scenes/base");
const Markup = require("telegraf/markup");
const { typesQuery } = require("../../constants");
const { getRandomInt } = require("../../utils");

const Track = require("../../models/Track");

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

const getRandomSkip = async () => {
  const numberOfTracks = await Track.estimatedDocumentCount();
  return getRandomInt(0, numberOfTracks - 1);
};

const getRandomTrackId = async () => {
  const randomSkip = await getRandomSkip();
  const trackDB = await Track.findOne({}, null, {
    skip: randomSkip,
    sort: {
      uploadedAt: 1,
    },
  });

  return { trackDbId: trackDB._id.toString(), trackId: trackDB.trackId };
};

const popularRate = new Scene("popular_rate");

popularRate.start(async (ctx) => {
  return ctx.scene.enter("main_menu");
});

popularRate.enter(async (ctx) => {
  const { trackDbId, trackId } = await getRandomTrackId();

  const ik = getIK(trackDbId);

  const trackMessage = await ctx.replyWithAudio(
    trackId,
    Markup.inlineKeyboard(ik).extra()
  );

  ctx.session.trackMessageId = trackMessage.message_id;
});

popularRate.leave(async (ctx) => {
  delete ctx.session.trackMessageId;
});

popularRate.on("callback_query", async (ctx) => {
  const { type, id } = JSON.parse(ctx.callbackQuery.data);
  const { trackMessageId } = ctx.session;

  let trackDB, ik, randomTrackIds;

  switch (type) {
    case typesQuery.LIKE:
      trackDB = await Track.findById(id);
      trackDB.popularRate = trackDB.popularRate + 1;
      await trackDB.save();

      do {
        randomTrackIds = await getRandomTrackId();
      } while (id === randomTrackIds.trackDbId);

      ik = getIK(randomTrackIds.trackDbId);

      await ctx.editMessageReplyMarkup();
      await ctx.replyWithAudio(
        randomTrackIds.trackId,
        Markup.inlineKeyboard(ik).extra()
      );

      return ctx.answerCbQuery();

    case typesQuery.DISLIKE:
      trackDB = await Track.findById(id);
      trackDB.popularRate = trackDB.popularRate - 1;
      await trackDB.save();

      do {
        randomTrackIds = await getRandomTrackId();
      } while (id === randomTrackIds.trackDbId);

      ik = getIK(randomTrackIds.trackDbId);

      await ctx.editMessageReplyMarkup();
      await ctx.replyWithAudio(
        randomTrackIds.trackId,
        Markup.inlineKeyboard(ik).extra()
      );

      return ctx.answerCbQuery();

    case typesQuery.MAIN_MENU:
      await ctx.answerCbQuery();
      return ctx.scene.enter("main_menu");
    default:
      return ctx.answerCbQuery("🖕🖕🖕");
  }
});

popularRate.use(async (ctx) => {
  return ctx.replyWithMarkdown(`❗️ Вернуться в главное меню /start`);
});

module.exports = popularRate;
