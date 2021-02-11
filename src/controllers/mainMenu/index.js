const Scene = require("telegraf/scenes/base");
const Markup = require("telegraf/markup");
const {
  typesQuery,
  trackStatus,
  innerRoundStatus,
} = require("../../constants");
const { checkJSONmw } = require("../../helpers");
const { toStringDate } = require("../../utils");

const User = require("../../models/User");
const Round = require("../../models/Round");
const Track = require("../../models/Track");

const mainMenu = new Scene("main_menu");

mainMenu.start(async (ctx) => {
  return ctx.scene.enter("main_menu");
});

mainMenu.enter(async (ctx) => {
  const userDB = await User.findOne({
    telegramId: ctx.from.id,
  });

  if (userDB && userDB.blocked) {
    userDB.blocked = false;
    await userDB.save();
  }

  const now = new Date();
  const roundDB = await Round.findOne({ status: "active" });
  if (!roundDB)
    return ctx.replyWithMarkdown(
      `*Подпольное Вещание Батол* \n\n⚠️ 9 СЕЗОН ПВБ ЕЩЕ НЕ НАЧАЛСЯ! \nПридется подождать некоторое время! Следи за актуальной информацией в основном канале ПВБ! \n\nПВБ @veshaniebatol \nВсе треки @pvb\\_tracks \nТаблица clck.ru/QygAz \n\nАренда жилья @lvngrm\\_bot`,
      Markup.inlineKeyboard([
        Markup.callbackButton(
          "Обновить инфу",
          JSON.stringify({ type: typesQuery.UPDATE_INFO })
        ),
      ]).extra({
        disable_web_page_preview: true,
      })
    );

  const promoRoundDB = await Round.findOne({ index: 0 });
  const firstRoundDB = await Round.findOne({ index: 1 });
  const trackDB = await Track.findOne({ user: userDB._id, round: roundDB._id });
  const lastTrackDB = await Track.findOne(
    { user: userDB._id },
    {},
    { sort: { uploadedAt: -1 } }
  ).populate("round");
  const userTracksDB = await Track.find({
    user: userDB._id,
    round: { $nin: [promoRoundDB._id] },
  });
  const countTracksCurrentRoundDB = await Track.countDocuments({
    round: roundDB._id,
  });
  const countFirstRoundTracksDB =
    firstRoundDB && firstRoundDB.theme
      ? await Track.countDocuments({ round: firstRoundDB._id })
      : countTracksCurrentRoundDB;
  const countSeasonTracksDB = await Track.estimatedDocumentCount();

  let roundUsers = "";
  if (roundDB.index > 1) {
    const prevRoundDB = await Round.findOne({ index: roundDB.index - 1 });
    const prevRoundTracksToNextDB = await Track.countDocuments({
      round: prevRoundDB._id,
      status: "next",
    });
    roundUsers = `из ${prevRoundTracksToNextDB}`;
  }

  const trackTotal = trackDB ? trackDB.total : 0;
  const seasonTotal = userTracksDB.reduce((acc, track) => acc + track.total, 0);

  let rapNamesStr = `*${userDB.rapName}*`;
  if (roundDB.isPaired) {
    const vsUser = await User.findOne({
      status: "active",
      currentPair: userDB.currentPair,
      rapName: { $ne: userDB.rapName },
    });
    rapNamesStr = vsUser
      ? `*${userDB.rapName}* VS *${vsUser.rapName}*`
      : `*${userDB.rapName}*`;
  }

  const minScoreStr = roundDB.minScore
    ? `\n👮 Проходной бал: *${roundDB.minScore}*`
    : "";
  const scoreRoundStr =
    roundDB.index === 1 ? "Оценка за раунд (+промо):" : "Оценка за раунд:";
  const scoring = innerRoundStatus[roundDB.innerStatus].toUpperCase();
  const userStatus =
    userDB.status === "finished"
      ? `Вылетел на ${lastTrackDB.round.index} раунде`
      : trackDB
      ? trackStatus[trackDB.status]
      : "Еще не сдал трек";
  const finishedAt = toStringDate(roundDB.finishedAt);

  let topBtns = [
    Markup.callbackButton(
      "ТОП-10",
      JSON.stringify({ type: typesQuery.TOP_TRACKS })
    ),
    Markup.callbackButton(
      "Личный ТОП",
      JSON.stringify({ type: typesQuery.PERSONAL_TOP })
    ),
  ];

  const countPersonalTracksDB = await Track.countDocuments({
    user: userDB._id,
  });

  if (!countPersonalTracksDB) {
    topBtns = topBtns.slice(0, 1);
  }

  let btns = [
    [
      Markup.callbackButton(
        "Обновить инфу",
        JSON.stringify({ type: typesQuery.UPDATE_INFO })
      ),
    ],
    topBtns,
    [
      Markup.callbackButton(
        "💩 ОЦЕНИТЬ ТРЕКИ 💖",
        JSON.stringify({ type: typesQuery.POPULAR_RATE })
      ),
    ],
    [
      Markup.callbackButton(
        "Сдать трек",
        JSON.stringify({ type: typesQuery.SEND_TRACK })
      ),
    ],
  ];
  if (
    (userDB.status === "empty" && roundDB.index > 1) ||
    userDB.status === "finished" ||
    now > roundDB.finishedAt ||
    trackDB
  ) {
    btns = btns.slice(0, 3);
  }

  if (
    (roundDB.index > 1 && userDB.status === "empty") ||
    userDB.status === "finished"
  )
    return ctx.replyWithMarkdown(
      `*Подпольное Вещание Батол* \n${roundDB.name} \nТема: "${roundDB.theme}" \nПрием треков до 23:59 (МСК) *${finishedAt}*. \n\n⚠️ ${scoring} ${minScoreStr} \n\nУчастников на раунде: *${countTracksCurrentRoundDB}* ${roundUsers} \nСудей на раунде: *${roundDB.countReferee}* \n\nВсего участников: ${countFirstRoundTracksDB} \nВсего треков: ${countSeasonTracksDB} \n\nПВБ @veshaniebatol \nВсе треки @pvb\\_tracks \nТаблица clck.ru/QygAz \n\nПоиск и аренда жилья @lvngrm\\_bot`,
      Markup.inlineKeyboard(btns).extra({
        disable_web_page_preview: true,
      })
    );

  await ctx.replyWithMarkdown(
    `*Подпольное Вещание Батол* \n${roundDB.name} \nТема: "${
      roundDB.theme
    }" \nПрием треков до 23:59 (МСК) *${finishedAt}*. \n\n⚠️ ${scoring} ${minScoreStr} \n\n${rapNamesStr} \n${userStatus.toUpperCase()} \n${scoreRoundStr} *${trackTotal}* \nОценка за сезон: ${seasonTotal} \n\nУчастников на раунде: *${countTracksCurrentRoundDB}* ${roundUsers} \nСудей на раунде: *${
      roundDB.countReferee
    }* \n\nВсего участников: ${countFirstRoundTracksDB} \nВсего треков: ${countSeasonTracksDB} \n\nПВБ @veshaniebatol \nВсе треки @pvb\\_tracks \nТаблица clck.ru/QygAz \n\nПоиск и аренда жилья @lvngrm\\_bot`,
    Markup.inlineKeyboard(btns).extra({
      disable_web_page_preview: true,
    })
  );
});

mainMenu.on("callback_query", checkJSONmw, async (ctx) => {
  const { type } = JSON.parse(ctx.callbackQuery.data);
  const userDB = await User.findOne({
    telegramId: ctx.from.id,
  });

  if (userDB && userDB.blocked) {
    userDB.blocked = false;
    await userDB.save();
  }

  const now = new Date();
  const roundDB = await Round.findOne({ status: "active" });
  if (!roundDB) {
    await ctx.answerCbQuery();
    return ctx.scene.enter("main_menu");
  }
  const trackDB = await Track.findOne({ user: userDB._id, round: roundDB._id });

  switch (type) {
    case typesQuery.SEND_TRACK:
      if (userDB.status === "empty" && roundDB.index > 1) {
        await ctx.answerCbQuery("Ты не участвуешь в батле!");
        return ctx.replyWithMarkdown(`❗️ Ты не участвуешь в батле!`);
      }
      if (userDB.status === "finished") {
        await ctx.answerCbQuery("Ты не прошел дальше!");
        return ctx.replyWithMarkdown(`❗️ Ты не прошел дальше!`);
      }
      if (now > roundDB.finishedAt) {
        await ctx.answerCbQuery("Прием треков закончился!");
        return ctx.replyWithMarkdown(
          `❗️ Ты не успел! Прием треков закончился.`
        );
      }
      if (trackDB) {
        await ctx.answerCbQuery("Ты уже сдал трек!");
        return ctx.replyWithMarkdown(
          `❗️ Ты уже сдал трек! Перезалить не получится.`
        );
      }

      await ctx.answerCbQuery();
      return ctx.scene.enter("send_track");

    case typesQuery.UPDATE_INFO:
      if (now > roundDB.finishedAt && roundDB.innerStatus !== "ending") {
        roundDB.innerStatus = "scoring";
        await roundDB.save();
      }

      await ctx.answerCbQuery();
      return ctx.scene.enter("main_menu");

    case typesQuery.POPULAR_RATE:
      const countTrackDB = await Track.countDocuments({
        user: { $ne: userDB._id },
        rateUsers: { $ne: ctx.from.id },
      });
      if (!countTrackDB) return ctx.answerCbQuery(`Нет треков для оценивания!`);
      await ctx.answerCbQuery();
      return ctx.scene.enter("popular_rate");

    case typesQuery.TOP_TRACKS:
      await ctx.answerCbQuery();
      return ctx.scene.enter("top_tracks");

    case typesQuery.PERSONAL_TOP:
      const countPersonalTracksDB = await Track.countDocuments({
        user: userDB._id,
      });
      if (!countPersonalTracksDB)
        return ctx.answerCbQuery(`У тебя нет треков!`);

      await ctx.answerCbQuery();
      return ctx.scene.enter("personal_top");

    default:
      await ctx.replyWithMarkdown(
        `❗️ Используй кнопки в меню _Главное меню_.`
      );
      break;
  }

  await ctx.answerCbQuery();
});

mainMenu.use(async (ctx) => {
  await ctx.replyWithMarkdown(`❗️ Используй кнопки в меню _Главное меню_.`);
});

module.exports = mainMenu;
