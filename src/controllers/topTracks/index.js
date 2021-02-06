const Scene = require("telegraf/scenes/base");
const Markup = require("telegraf/markup");
const { typesQuery } = require("../../constants");
const { splitArray } = require("../../utils");

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
  const topTrackDB = await Track.find({}, "popularRate", {
    sort: { popularRate: -1 },
    limit: 10,
  })
    .populate("user")
    .populate("round");

  const topTrackList = topTrackDB.reduce((acc, track, i) => {
    acc += `${i + 1}. *${track.user.rapName}* *(${track.popularRate})*\n${
      track.round.theme
    }\n${track.round.name}\n`;
    return acc;
  }, "");

  const ik = getIK(topTrackDB);

  const userDB = await User.findOne({ telegramId: ctx.from.id });
  const personalTracksDB = await Track.find(
    { user: userDB._id },
    "popularRate",
    {
      sort: { popularRate: -1 },
    }
  )
    .populate("user")
    .populate("round");
  const personalTrackList = personalTracksDB.length
    ? personalTracksDB.reduce((acc, track, i) => {
        acc += `*${track.popularRate}* - ${track.round.theme} (${track.round.name})\n`;
        return acc;
      }, `\n*ЛИЧНЫЙ РЕЙТИНГ*\n${userDB.rapName}\n`)
    : "";

  await ctx.replyWithMarkdown(
    `🌈 *ТОП-10 (Народное голосование)* \n\n${topTrackList}${personalTrackList}\nЧтобы послушать трек из ТОП-10, нажми на кнопку с его номером.`,
    ik
  );
});

topTracks.on("callback_query", async (ctx) => {
  const { type, id } = JSON.parse(ctx.callbackQuery.data);

  let trackDB;

  switch (type) {
    case typesQuery.GET_TRACK:
      trackDB = await Track.findById(id);
      await ctx.replyWithAudio(trackDB.trackId);

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
