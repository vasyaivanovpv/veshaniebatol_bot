const Scene = require("telegraf/scenes/base");
const Markup = require("telegraf/markup");
const { typesQuery, trackCaption } = require("../../constants");
const { splitArray } = require("../../utils");
const { getTrackList } = require("../../helpers");

const Track = require("../../models/Track");

const mainMenuBtn = [
  Markup.callbackButton(
    "Главное меню",
    JSON.stringify({
      type: typesQuery.MAIN_MENU,
    })
  ),
];

const getIK = (items) => {
  const trackBtns = items.map((item, i) =>
    Markup.callbackButton(
      i + 1,
      JSON.stringify({
        type: typesQuery.GET_TRACK,
        id: item._id.toString(),
      })
    )
  );

  const ik = splitArray(trackBtns);

  ik.push(mainMenuBtn);

  return Markup.inlineKeyboard(ik).extra({ parse_mode: "markdown" });
};

const topTracks = new Scene("top_tracks");

topTracks.start(async (ctx) => {
  return ctx.scene.enter("main_menu");
});

topTracks.enter(async (ctx) => {
  const topTrackDB = await Track.find({}, "popularRate rateUsers", {
    sort: { popularRateCoef: -1 },
    limit: 10,
  })
    .populate("user", "rapName")
    .populate("round", "theme name");

  const topTrackList = getTrackList(topTrackDB);
  const ik = getIK(topTrackDB);

  await ctx.replyWithMarkdown(
    `🌈 *Рейтинг треков, ТОП-10* \n_Народное голосование_ \n\n${topTrackList}_Чтобы послушать трек из ТОП-10, нажми на кнопку с его номером._`,
    ik
  );
});

topTracks.on("callback_query", async (ctx) => {
  const { type, id } = JSON.parse(ctx.callbackQuery.data);

  let trackDB;

  switch (type) {
    case typesQuery.GET_TRACK:
      trackDB = await Track.findById(id);
      await ctx.replyWithAudio(trackDB.trackId, { caption: trackCaption });

      return ctx.answerCbQuery();

    case typesQuery.MAIN_MENU:
      await ctx.answerCbQuery();
      return ctx.scene.enter("main_menu");

    default:
      return ctx.answerCbQuery("🖕🖕🖕");
  }
});

topTracks.use(async (ctx) => {
  return ctx.replyWithMarkdown(`❗️ Вернуться в главное меню /start`);
});

module.exports = topTracks;
