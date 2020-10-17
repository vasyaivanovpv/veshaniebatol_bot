const { ADMIN_ID, CHANNEL, REFEREE_CHANNEL } = require("../config");

const Composer = require("telegraf/composer");
const Markup = require("telegraf/markup");
const Extra = require("telegraf/extra");
const User = require("../models/User");
const Round = require("../models/Round");

const { toStringDate } = require("../utils");
const {
  typesQuery,
  trackCaption,
  scores,
  innerRoundStatus,
} = require("../constants");
const Track = require("../models/Track");

const adminRoute = new Composer();

adminRoute.command("commands", async (ctx) => {
  if (ctx.from.id !== +ADMIN_ID)
    return ctx.replyWithMarkdown("❗️ Только Вася Иванов имеют такую силу)!");

  return ctx.replyWithMarkdown(
    `*Команды* \n\naddRound 1\\*1 РАУНД ПВБ9\\*парный0-1 \nremoveRound 1 \nstartNextRound Тема\\*Кол судей\\*10.10.2020 \naddMinScore 40 \nshowScoreUser Никнейм \nbyeUser Никнейм \n\n/listRounds список раундов \n/finishScoring закончить судейство`
  );
});

adminRoute.command("listRounds", async (ctx) => {
  if (ctx.from.id !== +ADMIN_ID)
    return ctx.replyWithMarkdown("❗️ Только Вася Иванов имеют такую силу)!");

  const roundsDB = await Round.find();

  const listRound = roundsDB.reduce((acc, round) => {
    acc = `${acc} \n\n${round.index} ${
      round.status === "active" ? "⚡️⚡️⚡️" : round.status
    } \n*${round.name}* ${round.isPaired ? "Парный" : "Отборочный"}`;
    if (round.theme) {
      acc = `${acc} \n${round.theme} \nКол-во судей: *${
        round.countReferee
      }* \nДо ${toStringDate(round.finishedAt)} \n${innerRoundStatus[
        round.innerStatus
      ].toUpperCase()}`;
    }
    return acc;
  }, "");

  return ctx.replyWithMarkdown(`*Список раундов* ${listRound}`);
});

adminRoute.hears(/^addRound(.+)/, async (ctx) => {
  if (ctx.from.id !== +ADMIN_ID)
    return ctx.replyWithMarkdown("❗️ Только Вася Иванов имеют такую силу)!");

  const round = ctx.match[1].split("*");
  const indexRound = +round[0];

  let roundDB = await Round.findOne({
    index: indexRound,
  });

  if (roundDB) return ctx.replyWithMarkdown("❗️ Такой раунд уже есть!");

  roundDB = await new Round({
    index: +round[0],
    name: round[1],
    isPaired: !!+round[2],
  });

  await roundDB.save();

  return ctx.replyWithMarkdown(
    `❗️ Создан ${roundDB.name} с индексом ${roundDB.index}.`
  );
});

adminRoute.hears(/^removeRound ([0-9]+)/, async (ctx) => {
  if (ctx.from.id !== +ADMIN_ID)
    return ctx.replyWithMarkdown("❗️ Только Вася Иванов имеют такую силу)!");

  const indexRound = +ctx.match[1];

  await Round.deleteOne({
    index: indexRound,
  });

  return ctx.replyWithMarkdown(`❗️ Удален раунд с индексом ${indexRound}.`);
});

adminRoute.hears(/^addMinScore ([0-9]+)/, async (ctx) => {
  if (ctx.from.id !== +ADMIN_ID)
    return ctx.replyWithMarkdown("❗️ Только Вася Иванов имеют такую силу)!");

  const minScore = +ctx.match[1];

  const roundDB = await Round.findOne({
    status: "active",
  });

  if (!roundDB) return ctx.replyWithMarkdown(`❗️ Нет запущенных раундов.`);

  roundDB.minScore = minScore;
  await roundDB.save();

  return ctx.replyWithMarkdown(
    `❗️ Раунд с индексом ${roundDB.index} с минимальным проходным баллом ${minScore}.`
  );
});

adminRoute.command("finishScoring", async (ctx) => {
  if (ctx.from.id !== +ADMIN_ID)
    return ctx.replyWithMarkdown("❗️ Только Вася Иванов имеют такую силу)!");

  const currentRoundDB = await Round.findOne({ status: "active" });
  if (!currentRoundDB.minScore)
    return ctx.replyWithMarkdown(
      `❗️ Добавь проходной бал minScore для текущего раунда ${currentRoundDB.index}`
    );

  const partialScoreTracks = await Track.find({
    round: currentRoundDB._id,
    refereeCount: { $lt: currentRoundDB.countReferee },
  }).populate("user");

  if (partialScoreTracks.length) {
    const artists = partialScoreTracks.reduce(
      (acc, track) => `${acc} ${track.user.rapName},`,
      ""
    );
    return ctx.replyWithMarkdown(`❗️ Треки без оценок: ${artists}`);
  }

  await Track.updateMany(
    {
      round: currentRoundDB._id,
      total: { $gt: currentRoundDB.minScore },
    },
    {
      status: "next",
    }
  );
  const stopTracks = await Track.find({
    round: currentRoundDB._id,
    total: { $lte: currentRoundDB.minScore },
  });

  for (const stopTrack of stopTracks) {
    stopTrack.status = "stop";
    await stopTrack.save();
    await User.updateOne({ _id: stopTrack.user }, { status: "finished" });
  }

  await User.updateMany(
    { status: "active", hasTrack: false },
    { status: "finished" }
  );
  await User.updateMany({ hasTrack: true }, { hasTrack: false });

  if (currentRoundDB.index === 1) {
  }

  return ctx.replyWithMarkdown(
    `❗️ Раунд с индексом ${currentRoundDB.index} закончил оценивать треки.`
  );
});

adminRoute.hears(/^startNextRound(.+)/, async (ctx) => {
  if (ctx.from.id !== +ADMIN_ID)
    return ctx.replyWithMarkdown("❗️ Только Вася Иванов имеют такую силу)!");

  const round = ctx.match[1].split("*");
  const finishedAt = round[2].split(".");

  const roundDB = await Round.findOne({
    status: "active",
  });
  const nextRoundIndex = roundDB.index + 1;
  const nextRoundDB = await Round.findOne({
    index: roundDB ? nextRoundIndex : 0,
  });

  if (!nextRoundDB)
    return ctx.replyWithMarkdown(
      `❗️ Не существует раунда с индексом *${nextRoundIndex}*!`
    );

  nextRoundDB.status = "active";
  nextRoundDB.theme = round[0];
  nextRoundDB.countReferee = round[1];
  nextRoundDB.finishedAt = new Date(
    finishedAt[2],
    finishedAt[1] - 1,
    finishedAt[0],
    23,
    59
  );
  await nextRoundDB.save();

  await Round.updateMany(
    { index: { $lt: nextRoundDB.index } },
    { status: "finished" }
  );
  await Round.updateMany(
    { index: { $gt: nextRoundDB.index } },
    { status: "awaiting" }
  );

  return ctx.replyWithMarkdown(
    `❗️ Запущен ${nextRoundDB.name} с индексом ${nextRoundDB.index}.`
  );
});

adminRoute.hears(/^byeUser (.+)/, async (ctx) => {
  if (ctx.from.id !== +ADMIN_ID)
    return ctx.replyWithMarkdown("❗️ Только Вася Иванов имеют такую силу)!");

  const rapName = ctx.match[1];

  const userDB = await User.findOne({
    rapName: { $regex: new RegExp("^" + rapName.toLowerCase(), "i") },
  });
  if (!userDB) return ctx.replyWithMarkdown("❗️ Нет такого юзера");
  const trackDB = await Track.findOne({ user: userDB._id }, "status", {
    sort: {
      uploadedAt: -1,
    },
  });

  userDB.status = "finished";
  trackDB.status = "stop";

  await userDB.save();
  await trackDB.save();

  return ctx.replyWithMarkdown(`❗️ Репер *${userDB.rapName}* покидает батол!`);
});

adminRoute.hears(/^showScoreUser (.+)/, async (ctx) => {
  if (ctx.from.id !== +ADMIN_ID)
    return ctx.replyWithMarkdown("❗️ Только Вася Иванов имеют такую силу)!");

  const rapName = ctx.match[1];

  const userDB = await User.findOne({
    rapName: { $regex: new RegExp("^" + rapName.toLowerCase(), "i") },
  });
  if (!userDB) return ctx.replyWithMarkdown("❗️ Нет такого юзера");

  const promoRoundDB = await Round.findOne({ index: 0 });
  const tracksDB = await Track.find(
    { user: userDB._id, round: { $nin: [promoRoundDB._id] } },
    "total"
  );
  const seasonTotal = tracksDB.reduce((acc, track) => acc + track.total, 0);

  return ctx.replyWithMarkdown(
    `❗️ Репер *${userDB.rapName}*, балов: *${seasonTotal}*!`
  );
});

adminRoute.on("callback_query", async (ctx) => {
  const { data } = ctx.callbackQuery;
  const { type, aMId } = JSON.parse(data);

  const roundDB = await Round.findOne({ status: "active" });
  const trackDB = await Track.findOne({ adminMessageId: aMId });
  const userDB = await User.findOne({ _id: trackDB.user });

  let scoreIK = [];

  switch (type) {
    case typesQuery.DELETE:
      if (ctx.from.id !== +ADMIN_ID)
        return ctx.answerCbQuery(`У тебя нет прав!`);

      try {
        await ctx.telegram.sendMessage(
          userDB.telegramId,
          `❗️ *Уведомление* \n\nТвой трек не принят на раунд! В чате пвб можешь уточнить почему.`,
          Extra.markdown()
        );
      } catch (err) {
        console.log(`Send message failed: ${err}`);

        if (err.code === 403) {
          userDB.blocked = true;
          await userDB.save();
        }
      }

      await trackDB.remove();

      await ctx.editMessageText(
        `Трек *${userDB.rapName}* удален!`,
        Extra.markdown()
      );
      return ctx.answerCbQuery(`Трек удален!`);

    case typesQuery.ACCEPT:
      if (ctx.from.id !== +ADMIN_ID)
        return ctx.answerCbQuery(`У тебя нет прав!`);

      try {
        await ctx.telegram.sendMessage(
          userDB.telegramId,
          `❗️ *Уведомление* \n\nТвой трек принят на раунд!`,
          Extra.markdown()
        );
      } catch (err) {
        console.log(`Send message failed: ${err}`);

        if (err.code === 403) {
          userDB.blocked = true;
          await userDB.save();
        }
      }

      userDB.hasTrack = true;
      await userDB.save();

      if (roundDB.index === 1) {
        userDB.status = "active";
        await userDB.save();

        const promoRound = await Round.findOne({ index: 0 });
        const promoTrack = await Track.findOne({
          user: userDB._id,
          round: promoRound._id,
        });

        trackDB.total = promoTrack ? promoTrack.total : 0;
        await trackDB.save();
      }

      await ctx.telegram.sendAudio(CHANNEL, trackDB.trackId, {
        parse_mode: "Markdown",
        caption: trackCaption,
      });

      await ctx.editMessageText(
        `Трек *${userDB.rapName}* принят!`,
        Extra.markdown()
      );

      if (roundDB.isPaired) {
        const tracksPairDB = await Track.find({
          round: roundDB._id,
          pair: trackDB.pair,
        }).populate("user");

        if (tracksPairDB.length === 2) {
          const trackOne = tracksPairDB[0];
          const trackTwo = tracksPairDB[1];

          scoreIK = [
            [
              Markup.callbackButton(
                trackOne.user.rapName,
                JSON.stringify({
                  type: typesQuery.WIN_PAIR,
                  win: trackOne.adminMessageId,
                  lose: trackTwo.adminMessageId,
                })
              ),
              Markup.callbackButton(
                trackTwo.user.rapName,
                JSON.stringify({
                  type: typesQuery.WIN_PAIR,
                  win: trackTwo.adminMessageId,
                  lose: trackOne.adminMessageId,
                })
              ),
            ],
          ];

          await ctx.telegram.sendAudio(REFEREE_CHANNEL, trackOne.trackId, {
            parse_mode: "Markdown",
            caption: trackCaption,
          });
          await ctx.telegram.sendAudio(REFEREE_CHANNEL, trackTwo.trackId, {
            parse_mode: "Markdown",
            caption: trackCaption,
          });

          await ctx.telegram.sendMessage(
            REFEREE_CHANNEL,
            `*${trackOne.user.rapName}* \n*${trackTwo.user.rapName}* \n\nПослушай оба трека и выбери лучшего! \nА чтобы оставить комментарий, используй реплай к треку! \n\nОценки поставили:`,
            Markup.inlineKeyboard(scoreIK).extra({ parse_mode: "Markdown" })
          );
        }

        return ctx.answerCbQuery(`Трек принят!`);
      }

      if (!roundDB.index) {
        scoreIK = scores.slice(0, 2).map((score) =>
          Markup.callbackButton(
            score,
            JSON.stringify({
              type: typesQuery.ADD_SCORE,
              aMId,
              score,
            })
          )
        );
      } else {
        scoreIK = scores.map((score) =>
          Markup.callbackButton(
            score,
            JSON.stringify({
              type: typesQuery.ADD_SCORE,
              aMId,
              score,
            })
          )
        );
      }

      await ctx.telegram.sendAudio(REFEREE_CHANNEL, trackDB.trackId, {
        parse_mode: "Markdown",
        caption: trackCaption,
      });

      await ctx.telegram.sendMessage(
        REFEREE_CHANNEL,
        `*${userDB.rapName}* \n\nПослушай трек и поставь оценку! А чтобы оставить комментарий, используй реплай к треку! \n\nОценки поставили:`,
        Markup.inlineKeyboard(scoreIK, { columns: 5 }).extra({
          parse_mode: "Markdown",
        })
      );

      return ctx.answerCbQuery(`Трек принят!`);

    default:
      break;
  }

  await ctx.answerCbQuery();
});

module.exports = adminRoute;
