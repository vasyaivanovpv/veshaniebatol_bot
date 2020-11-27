const { ADMIN_ID, CHANNEL, REFEREE_CHANNEL } = require("../config");

const Composer = require("telegraf/composer");
const Markup = require("telegraf/markup");
const Extra = require("telegraf/extra");
const spreadsheet = require("../g_spreadsheet");

const User = require("../models/User");
const Round = require("../models/Round");
const Track = require("../models/Track");
const Referee = require("../models/Referee");

const { toStringDate, isValidDate, shuffleArray } = require("../utils");
const {
  typesQuery,
  scores,
  innerRoundStatus,
  sheetValues,
  textCellColors,
} = require("../constants");

const adminRoute = new Composer();

adminRoute.command("commands", async (ctx) => {
  if (ctx.from.id !== +ADMIN_ID)
    return ctx.replyWithMarkdown("❗️ Только Вася Иванов имеют такую силу)!");

  return ctx.replyWithMarkdown(
    `*Команды* \n\naddReferee 5234523\\*столбец(F)\\*пикуль \naddRound 1\\*1 РАУНД ПВБ9\\*парный0-1 \nremoveRound 1 \nstartNextRound Тема\\*Кол судей\\*10.10.2020 \nsetMinScore 40 \neditCountReferee 5 \nshowScoreUser Никнейм \nbyeUser Никнейм \n\n/listRounds список раундов \n/finishScoring закончить судейство`
  );
});

adminRoute.command("test", async (ctx) => {
  const doc = await spreadsheet();
  if (!doc) {
    await ctx.replyWithMarkdown("❗️ Таблицы НЕ работают!");
  }
  await ctx.replyWithMarkdown("❗️ Таблицы работают!");
});

adminRoute.command("listRounds", async (ctx) => {
  if (ctx.from.id !== +ADMIN_ID)
    return ctx.replyWithMarkdown("❗️ Только Вася Иванов имеют такую силу)!");

  const roundsDB = await Round.find();

  if (!roundsDB.length)
    return ctx.replyWithMarkdown(`❗️ Нет созданных раундов!`);

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

  let roundDB = await Round.findOne({ index: indexRound });

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

adminRoute.hears(/^addReferee(.+)/, async (ctx) => {
  if (ctx.from.id !== +ADMIN_ID)
    return ctx.replyWithMarkdown("❗️ Только Вася Иванов имеют такую силу)!");

  const round = ctx.match[1].split("*");
  const telegramId = +round[0];
  if (typeof telegramId !== "number")
    return ctx.replyWithMarkdown(`❗️ Неверный формат tgID!`);
  const sheetColumn = round[1];
  if (!sheetColumn || sheetColumn.length > 1)
    return ctx.replyWithMarkdown(`❗️ Неверный формат стобца!`);
  const rapName = round[2];
  if (!rapName)
    return ctx.replyWithMarkdown(`❗️ Необходимо ввести псевдоним судьи!`);

  let refereeDB = await Referee.findOne({ telegramId });

  if (refereeDB) return ctx.replyWithMarkdown("❗️ Такой судья уже есть!");

  refereeDB = await new Referee({
    telegramId,
    rapName,
    sheetColumn,
  });

  await refereeDB.save();

  return ctx.replyWithMarkdown(
    `❗️ Добавлен в судьи *${refereeDB.rapName}* в колонку *${refereeDB.sheetColumn}*.`
  );
});

adminRoute.hears(/^removeRound ([0-9]+)/, async (ctx) => {
  if (ctx.from.id !== +ADMIN_ID)
    return ctx.replyWithMarkdown("❗️ Только Вася Иванов имеют такую силу)!");

  const indexRound = +ctx.match[1];

  await Round.deleteOne({ index: indexRound });

  return ctx.replyWithMarkdown(`❗️ Удален раунд с индексом ${indexRound}.`);
});

adminRoute.hears(/^setMinScore ([0-9]+)/, async (ctx) => {
  if (ctx.from.id !== +ADMIN_ID)
    return ctx.replyWithMarkdown("❗️ Только Вася Иванов имеют такую силу)!");

  const minScore = +ctx.match[1];

  const roundDB = await Round.findOne({ status: "active" });

  if (!roundDB) return ctx.replyWithMarkdown(`❗️ Нет запущенных раундов.`);

  roundDB.minScore = minScore;
  await roundDB.save();

  return ctx.replyWithMarkdown(
    `❗️ Раунд с индексом ${roundDB.index} имеет минимальный проходной балл ${minScore}.`
  );
});

adminRoute.hears(/^editCountReferee ([0-9]+)/, async (ctx) => {
  if (ctx.from.id !== +ADMIN_ID)
    return ctx.replyWithMarkdown("❗️ Только Вася Иванов имеют такую силу)!");

  const countReferee = +ctx.match[1];

  const roundDB = await Round.findOne({ status: "active" });

  if (!roundDB) return ctx.replyWithMarkdown(`❗️ Нет запущенных раундов.`);

  roundDB.countReferee = countReferee;
  await roundDB.save();

  return ctx.replyWithMarkdown(
    `❗️ Раунд с индексом ${roundDB.index} имеет количество судей ${countReferee}.`
  );
});

adminRoute.command(
  "finishScoring",
  Composer.fork(async (ctx) => {
    if (ctx.from.id !== +ADMIN_ID)
      return ctx.replyWithMarkdown("❗️ Только Вася Иванов имеют такую силу)!");

    const currentRoundDB = await Round.findOne({ status: "active" });
    if (!currentRoundDB)
      return ctx.replyWithMarkdown(`❗️ Нет запущенных раундов.`);

    if (!currentRoundDB.minScore && currentRoundDB.isPaired) {
      currentRoundDB.minScore = (currentRoundDB.countReferee + 1) / 2;
      await currentRoundDB.save();
    } else if (!currentRoundDB.minScore && currentRoundDB.index > 0)
      return ctx.replyWithMarkdown(
        `❗️ Добавь проходной бал minScore для текущего раунда ${currentRoundDB.index} с количеством судей ${currentRoundDB.countReferee}`
      );

    const partialScoreTracks = await Track.find({
      round: currentRoundDB._id,
      refereeCount: { $lt: currentRoundDB.countReferee },
    }).populate("user");

    if (partialScoreTracks.length && !currentRoundDB.isPaired) {
      const artists = partialScoreTracks.reduce(
        (acc, track) => `${acc} ${track.user.rapName},`,
        ""
      );
      return ctx.replyWithMarkdown(`❗️ Треки без оценок: ${artists}`);
    }

    if (partialScoreTracks.length && currentRoundDB.isPaired) {
      for (const track of partialScoreTracks) {
        await Track.updateOne(
          { _id: track._id },
          { total: (currentRoundDB.countReferee + 1) / 2 }
        );
      }
    }

    if (currentRoundDB.index) {
      await Track.updateMany(
        {
          round: currentRoundDB._id,
          total: { $gte: currentRoundDB.minScore },
        },
        {
          status: "next",
        }
      );
      const stopTracks = await Track.find({
        round: currentRoundDB._id,
        total: { $lt: currentRoundDB.minScore },
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
    }

    currentRoundDB.innerStatus = "ending";
    await currentRoundDB.save();

    return ctx.replyWithMarkdown(
      `❗️ Раунд с индексом ${currentRoundDB.index} закончил оценивать треки.`
    );
  })
);

adminRoute.hears(/^startNextRound (.+)/, async (ctx) => {
  if (ctx.from.id !== +ADMIN_ID)
    return ctx.replyWithMarkdown("❗️ Только Вася Иванов имеют такую силу)!");
  const round = ctx.match[1].split("*");
  const roundTheme = round[0].trim();
  if (!round[1])
    return ctx.replyWithMarkdown(`❗️ Не хватает данных о количестве судей!`);
  if (!round[2])
    return ctx.replyWithMarkdown(`❗️ Не хватает даты завершения раунда!`);
  const roundRefereeCount = +round[1];
  if (typeof roundRefereeCount !== "number")
    return ctx.replyWithMarkdown(
      `❗️ Введи правильное значение для поля Количество судей!`
    );
  if (roundRefereeCount % 2 === 0)
    return ctx.replyWithMarkdown(
      `❗️ Введи нечетное количество судей вместо ${roundRefereeCount}!`
    );
  const finishedAtStr = round[2].split(".");
  const roundFinishedAt = new Date(
    finishedAtStr[2],
    finishedAtStr[1] - 1,
    finishedAtStr[0],
    23,
    59
  );
  if (!isValidDate(roundFinishedAt))
    return ctx.replyWithMarkdown(
      `❗️ Введи правильное значение для поля Конечная дата приема треков!`
    );

  const roundDB = await Round.findOne({ status: "active" });
  if (roundDB && roundDB.innerStatus !== "ending")
    return ctx.replyWithMarkdown(
      `❗️ Заверши текущий раунд командой /finishScoring!`
    );
  const nextRoundIndex = roundDB ? roundDB.index + 1 : 0;
  const nextRoundDB = await Round.findOne({ index: nextRoundIndex });

  if (!nextRoundDB)
    return ctx.replyWithMarkdown(
      `❗️ Не существует раунда с индексом *${nextRoundIndex}*!`
    );

  const activeUsersDB = await User.find({ status: "active" });
  if (!activeUsersDB.length && nextRoundIndex > 1)
    return ctx.replyWithMarkdown(`❗️ На батле нет АКТИВНЫХ участников!`);

  await User.updateMany({ hasTrack: true }, { hasTrack: false });

  nextRoundDB.status = "active";
  nextRoundDB.theme = roundTheme;
  nextRoundDB.countReferee = roundRefereeCount;
  nextRoundDB.finishedAt = roundFinishedAt;
  await nextRoundDB.save();

  await Round.updateMany(
    { index: { $lt: nextRoundDB.index } },
    { status: "finished" }
  );
  await Round.updateMany(
    { index: { $gt: nextRoundDB.index } },
    { status: "awaiting" }
  );

  if (roundDB && roundDB.isPaired) {
    const doc = await spreadsheet();
    const firstSheet = doc.sheetsByIndex[0];

    const firstCell = sheetValues.rapNameColumn + sheetValues.firstScoreRow;
    const lastCell =
      sheetValues.rapNameColumn +
      (sheetValues.firstScoreRow + activeUsersDB.length);

    await firstSheet.loadCells(`${firstCell}:${lastCell}`);

    let currentCell, actualCell, currentSheetRow;

    for (const activeUser of activeUsersDB) {
      currentSheetRow =
        activeUser.currentSheetRow % 2
          ? (activeUser.currentSheetRow + 1) / 2 + 2
          : activeUser.currentSheetRow / 2 + 2;
      await User.updateOne(
        { _id: activeUser._id },
        {
          currentPair:
            activeUser.currentPair % 2
              ? (activeUser.currentPair + 1) / 2
              : activeUser.currentPair / 2,
          currentSheetRow: currentSheetRow,
        }
      );

      actualCell = sheetValues.rapNameColumn + currentSheetRow;
      currentCell = firstSheet.getCellByA1(actualCell);
      currentCell.value = activeUser.rapName;
      currentCell.textFormat = {
        ...currentCell.textFormat,
        foregroundColorStyle: {
          rgbColor: textCellColors.blue,
        },
      };
    }

    await firstSheet.saveUpdatedCells();
    doc.resetLocalCache();
  }

  if (roundDB && !roundDB.isPaired && nextRoundDB.isPaired) {
    const promoRoundDB = await Round.findOne({ index: 0 });
    const nextTracksDB = await Track.aggregate([
      {
        $match: {
          round: { $nin: [promoRoundDB._id] },
          status: "next",
        },
      },
      {
        $project: {
          user: 1,
          total: 1,
          round: 1,
        },
      },
      {
        $group: {
          _id: "$user",
          total: { $sum: "$total" },
          round: { $last: "$round" },
        },
      },
      {
        $match: {
          round: roundDB._id,
        },
      },
      { $sort: { total: -1 } },
    ]);

    const groupA = nextTracksDB.slice(0, nextTracksDB.length / 2);
    const groupB = nextTracksDB.slice(nextTracksDB.length / 2);
    const shuffleGroupA = shuffleArray(groupA);
    const shuffleGroupB = shuffleArray(groupB);

    for (const [index, id] of shuffleGroupA.entries()) {
      await User.updateOne(
        { _id: id },
        {
          currentPair: index + 1,
          currentSheetRow: sheetValues.firstScoreRow + index * 2,
        }
      );
    }
    for (const [index, id] of shuffleGroupB.entries()) {
      await User.updateOne(
        { _id: id },
        {
          currentPair: index + 1,
          currentSheetRow: sheetValues.firstScoreRow + 1 + index * 2,
        }
      );
    }

    const doc = await spreadsheet();
    const firstSheet = doc.sheetsByIndex[0];

    const firstCell = sheetValues.rapNameColumn + sheetValues.firstScoreRow;
    const lastCell =
      sheetValues.rapNameColumn +
      (sheetValues.firstScoreRow + nextTracksDB.length);

    await firstSheet.loadCells(`${firstCell}:${lastCell}`);

    let currentCell, actualCell;

    const activeUsersWithRowDB = await User.find(
      { status: "active" },
      "currentSheetRow rapName"
    );
    for (const user of activeUsersWithRowDB) {
      actualCell = sheetValues.rapNameColumn + user.currentSheetRow;
      currentCell = firstSheet.getCellByA1(actualCell);
      currentCell.value = user.rapName;
      currentCell.textFormat = {
        ...currentCell.textFormat,
        foregroundColorStyle: {
          rgbColor: textCellColors.blue,
        },
      };
    }

    await firstSheet.saveUpdatedCells();
    doc.resetLocalCache();
  }

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
  if (!roundDB) return ctx.replyWithMarkdown(`❗️ Нет запущенных раундов.`);
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
        `Трек [${userDB.rapName}](tg://user?id=${userDB.telegramId}) удален!`,
        Extra.markdown()
      );
      return ctx.answerCbQuery(`Трек удален!`);

    case typesQuery.ACCEPT:
      if (ctx.from.id !== +ADMIN_ID)
        return ctx.answerCbQuery(`У тебя нет прав!`);

      try {
        await ctx.telegram.sendMessage(
          userDB.telegramId,
          `❗️ *Уведомление* \n\nТвой трек принят на раунд! Смотри здесь @pvb\\_tracks`,
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
      trackDB.status = "accept";
      await trackDB.save();

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
      });

      await ctx.editMessageText(
        `Трек [${userDB.rapName}](tg://user?id=${userDB.telegramId}) принят!`,
        Extra.markdown()
      );

      if (roundDB.isPaired) {
        const tracksPairDB = await Track.find({
          round: roundDB._id,
          pair: trackDB.pair,
          status: "accept",
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
          });
          await ctx.telegram.sendAudio(REFEREE_CHANNEL, trackTwo.trackId, {
            parse_mode: "Markdown",
          });

          await ctx.telegram.sendMessage(
            REFEREE_CHANNEL,
            `*${trackOne.user.rapName}* \n*${trackTwo.user.rapName}* \n\nПослушай оба трека и выбери лучшего! \nА чтобы оставить комментарий, используй реплай к треку! \n\nОценки поставили:`,
            Markup.inlineKeyboard(scoreIK).extra({ parse_mode: "Markdown" })
          );
        }

        const doc = await spreadsheet();
        const firstSheet = doc.sheetsByIndex[0];

        const actualCell = sheetValues.rapNameColumn + userDB.currentSheetRow;

        await firstSheet.loadCells(actualCell);

        const currentCell = firstSheet.getCellByA1(actualCell);
        currentCell.textFormat = {
          ...currentCell.textFormat,
          foregroundColorStyle: {
            rgbColor: textCellColors.navyBlue,
          },
        };

        await firstSheet.saveUpdatedCells();
        doc.resetLocalCache();

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
      });

      await ctx.telegram.sendMessage(
        REFEREE_CHANNEL,
        `*${userDB.rapName}* \n\nПослушай трек и поставь оценку! А чтобы оставить комментарий, используй реплай к треку! \n\nОценки поставили:`,
        Markup.inlineKeyboard(scoreIK, { columns: 5 }).extra({
          parse_mode: "Markdown",
        })
      );

      const doc = await spreadsheet();
      const firstSheet = doc.sheetsByIndex[0];

      const actualSheetRow =
        roundDB.actualSheetRow || sheetValues.firstScoreRow;
      const actualCell = sheetValues.rapNameColumn + actualSheetRow;

      await firstSheet.loadCells(actualCell);

      const currentCell = firstSheet.getCellByA1(actualCell);
      currentCell.value = userDB.rapName;
      await firstSheet.saveUpdatedCells();

      doc.resetLocalCache();

      userDB.currentSheetRow = actualSheetRow;
      await userDB.save();

      roundDB.actualSheetRow = actualSheetRow + 1;
      await roundDB.save();

      return ctx.answerCbQuery(`Трек принят!`);

    default:
      break;
  }

  await ctx.answerCbQuery();
});

module.exports = adminRoute;
