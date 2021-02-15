const Scene = require("telegraf/scenes/base");
const Markup = require("telegraf/markup");
const { typesQuery, trackCaption } = require("../../constants");
const { splitArray } = require("../../utils");
const { getTrackList } = require("../../helpers");

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

const personalTop = new Scene("personal_top");

personalTop.start(async (ctx) => {
  return ctx.scene.enter("main_menu");
});

personalTop.enter(async (ctx) => {
  const userDB = await User.findOne({ telegramId: ctx.from.id });
  const personalTracksDB = await Track.find(
    { user: userDB._id },
    "popularRate rateUsers",
    {
      sort: { popularRateCoef: -1 },
    }
  )
    .populate("user")
    .populate("round");

  const personalTrackList = getTrackList(personalTracksDB);
  const ik = getIK(personalTracksDB);

  await ctx.replyWithMarkdown(
    `👶 *Личный ТОП* \n_Народное голосование_ \n\n${personalTrackList}_Чтобы послушать трек из Личного ТОПа, нажми на кнопку с его номером._`,
    ik
  );
});

personalTop.on("callback_query", async (ctx) => {
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

personalTop.use(async (ctx) => {
  return ctx.replyWithMarkdown(`❗️ Вернуться в главное меню /start`);
});

module.exports = personalTop;
