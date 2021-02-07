const { ADMIN_ID, ADMIN_PVB, ACTIVE_SHEET } = require("../config");

const Composer = require("telegraf/composer");
const Markup = require("telegraf/markup");
const Extra = require("telegraf/extra");
const spreadsheet = require("../g_spreadsheet");

const Referee = require("../models/Referee");
const Round = require("../models/Round");
const Track = require("../models/Track");

const { escapeChar } = require("../utils");
const { typesQuery } = require("../constants");

const sendMessageToUser = async (
  ctx,
  userTgId,
  refereeName,
  text,
  isScore,
  isUpdate
) => {
  const escapeText = typeof text === "number" ? text : escapeChar(text);
  const typeMessage = isScore ? "оценку" : "комментарий";
  const typeAction = isUpdate ? "изменил" : "добавил";

  try {
    await ctx.telegram.sendMessage(
      userTgId,
      `❗️ Судья *${refereeName}* ${typeAction} ${typeMessage} к твоему треку: \n\n_${escapeText}_`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.log(`Send message failed: ${err}`);

    if (err.code === 403) {
      await User.updateOne({ telegramId: userTgId }, { blocked: true });
    }
  }
};

const refereeRoute = new Composer();

refereeRoute.on("new_chat_members", async (ctx) => {
  const { id, first_name, last_name } = ctx.message.new_chat_member;
  const escapeName = escapeChar(
    [first_name, last_name].filter((v) => v).join(" ")
  );

  await ctx.telegram.sendMessage(
    ADMIN_PVB,
    `❗️ *Уведомление* \n\nК судейству присоединился новый судья *${escapeName}* с tgID *${id}*`,
    {
      parse_mode: "Markdown",
    }
  );
});

refereeRoute.on(
  "message",
  async (ctx, next) => {
    const { reply_to_message, from, message_id, text } = ctx.message;
    const isScore = false;

    if (!reply_to_message) return;
    if (!reply_to_message.audio) return;

    const refereeDB = await Referee.findOne({ telegramId: from.id });
    if (!refereeDB)
      return ctx.replyWithMarkdown(`❗️ ВАЖНО! Судья не найден в БД!`);

    const trackDB = await Track.findOne({
      fileUniqueId: reply_to_message.audio.file_unique_id,
    })
      .populate("round")
      .populate("user");

    if (!trackDB)
      return ctx.replyWithMarkdown(`❗️ ВАЖНО! Трек не найден в БД!`);

    const currentRoundDB = await Round.findOne({ status: "active" });
    if (trackDB.round.index !== currentRoundDB.index)
      return ctx.replyWithMarkdown(
        `❗️ Невозможно добавить комментарий к треку с прошлого раунда!`
      );

    const scoreIndex = trackDB.scores.findIndex(
      (objScore) => objScore.referee === from.id
    );

    if (scoreIndex === -1)
      return ctx.replyWithMarkdown(`❗️ Поставь сперва оценку этому треку!`, {
        reply_to_message_id: message_id,
      });

    const isUpdate = trackDB.scores[scoreIndex].comment ? true : false;

    await sendMessageToUser(
      ctx,
      trackDB.user.telegramId,
      refereeDB.rapName,
      text,
      isScore,
      isUpdate
    );

    trackDB.scores[scoreIndex].comment = text;
    await trackDB.save();

    next();
  },
  Composer.fork(async (ctx) => {
    const { reply_to_message, from, text } = ctx.message;
    const refereeDB = await Referee.findOne({ telegramId: from.id });
    if (!refereeDB)
      return ctx.replyWithMarkdown(`❗️ ВАЖНО! Судья не найден в БД!`);
    const trackDB = await Track.findOne({
      fileUniqueId: reply_to_message.audio.file_unique_id,
    }).populate("user");

    const doc = await spreadsheet();
    const firstSheet = doc.sheetsByIndex[ACTIVE_SHEET];

    const actualCell = refereeDB.sheetColumn + trackDB.user.currentSheetRow;

    await firstSheet.loadCells(actualCell);

    const currentCell = firstSheet.getCellByA1(actualCell);
    currentCell.note = text;

    await firstSheet.saveUpdatedCells();
    doc.resetLocalCache();
  })
);

refereeRoute.on(
  "callback_query",
  Composer.fork(async (ctx) => {
    const { message, data } = ctx.callbackQuery;
    const { type, aMId, score, win, lose } = JSON.parse(data);

    const { first_name, last_name } = ctx.from;
    const userName = [first_name, last_name].filter((v) => v).join(" ");

    const currentRoundDB = await Round.findOne({ status: "active" });
    const refereeDB = await Referee.findOne({ telegramId: ctx.from.id });
    if (!refereeDB) return ctx.answerCbQuery(`Ты не добавлен в список судей!`);

    const doc = await spreadsheet();
    const firstSheet = doc.sheetsByIndex[ACTIVE_SHEET];
    let trackDB,
      scoreIndex,
      trackUserPhrase,
      loserDB,
      actualRow,
      actualColumn,
      actualCell,
      currentCell,
      isScore = true,
      isUpdate = false;

    switch (type) {
      case typesQuery.ADD_SCORE:
        if (!currentRoundDB.index && ctx.from.id !== +ADMIN_ID)
          return ctx.answerCbQuery(`У тебя нет прав!`);

        trackDB = await Track.findOne({ adminMessageId: aMId }).populate(
          "user"
        );
        trackUserPhrase = `Репер *${trackDB.user.rapName}* получил оценки от ВСЕХ судей`;
        actualRow = trackDB.user.currentSheetRow;
        actualColumn = refereeDB.sheetColumn;
        actualCell = actualColumn + actualRow;

        await firstSheet.loadCells(actualCell);
        currentCell = firstSheet.getCellByA1(actualCell);

        scoreIndex = trackDB.scores.findIndex(
          (objScore) => objScore.referee === refereeDB.telegramId
        );

        if (scoreIndex !== -1) {
          isUpdate = true;

          trackDB.total =
            trackDB.total - trackDB.scores[scoreIndex].score + score;
          trackDB.scores[scoreIndex].score = score;
          await trackDB.save();

          await sendMessageToUser(
            ctx,
            trackDB.user.telegramId,
            refereeDB.rapName,
            score,
            isScore,
            isUpdate
          );

          currentCell.value = score;
          await firstSheet.saveUpdatedCells();
          doc.resetLocalCache();

          return ctx.answerCbQuery(score);
        }

        if (!currentRoundDB.index) {
          trackDB.status = "next";
        }

        trackDB.scores.push({
          referee: refereeDB.telegramId,
          score,
        });
        trackDB.total = trackDB.total + score;

        await trackDB.save();

        await sendMessageToUser(
          ctx,
          trackDB.user.telegramId,
          refereeDB.rapName,
          score,
          isScore,
          isUpdate
        );

        currentCell.value = score;

        await ctx.answerCbQuery(score);
        break;

      case typesQuery.WIN_PAIR:
        loserDB = await Track.findOne({ adminMessageId: lose }).populate(
          "user"
        );
        trackDB = await Track.findOne({ adminMessageId: win }).populate("user");
        trackUserPhrase = `Пара *${trackDB.user.rapName}* и *${loserDB.user.rapName}* получила оценки от ВСЕХ судей`;

        actualRow = trackDB.user.currentSheetRow;
        loserRow = trackDB.user.currentSheetRow;

        actualColumn = refereeDB.sheetColumn;
        actualCell = actualColumn + actualRow;
        loserCell = actualColumn + loserRow;

        const loadRange = [actualCell, loserCell].sort().join(":");

        await firstSheet.loadCells(loadRange);
        currentCell = firstSheet.getCellByA1(actualCell);
        currentLoserCell = firstSheet.getCellByA1(loserCell);

        scoreIndex = trackDB.scores.findIndex(
          (objScore) => objScore.referee === ctx.from.id
        );

        if (scoreIndex !== -1) {
          isUpdate = true;

          if (!trackDB.scores[scoreIndex].score) {
            trackDB.total = trackDB.total + 1;
            loserDB.total = loserDB.total - 1;
          }

          trackDB.scores[scoreIndex].score = 1;
          loserDB.scores[scoreIndex].score = 0;
          await trackDB.save();
          await loserDB.save();

          await sendMessageToUser(
            ctx,
            trackDB.user.telegramId,
            refereeDB.rapName,
            1,
            isScore,
            isUpdate
          );
          await sendMessageToUser(
            ctx,
            loserDB.user.telegramId,
            refereeDB.rapName,
            0,
            isScore,
            isUpdate
          );

          currentCell.value = 1;
          currentLoserCell.value = 0;
          await firstSheet.saveUpdatedCells();
          doc.resetLocalCache();

          return ctx.answerCbQuery(trackDB.user.rapName);
        }

        trackDB.scores.push({
          referee: ctx.from.id,
          score: 1,
        });
        loserDB.scores.push({
          referee: ctx.from.id,
          score: 0,
        });

        trackDB.total = trackDB.total + 1;

        await trackDB.save();
        await loserDB.save();

        await sendMessageToUser(
          ctx,
          trackDB.user.telegramId,
          refereeDB.rapName,
          1,
          isScore,
          isUpdate
        );
        await sendMessageToUser(
          ctx,
          loserDB.user.telegramId,
          refereeDB.rapName,
          0,
          isScore,
          isUpdate
        );

        currentCell.value = 1;
        currentLoserCell.value = 0;

        await ctx.answerCbQuery(trackDB.user.rapName);
        break;

      default:
        return ctx.answerCbQuery();
    }

    await firstSheet.saveUpdatedCells();
    doc.resetLocalCache();

    trackDB.refereeCount = trackDB.scores.length;
    await trackDB.save();

    if (loserDB) {
      loserDB.refereeCount = loserDB.scores.length;
      await loserDB.save();
    }

    if (trackDB.scores.length === currentRoundDB.countReferee) {
      return ctx.editMessageText(trackUserPhrase, Extra.markdown());
    } else {
      return ctx.editMessageText(
        `${message.text} ${escapeChar(userName)},`,
        Markup.inlineKeyboard(message.reply_markup.inline_keyboard, {
          columns: 5,
        }).extra({
          parse_mode: "Markdown",
        })
      );
    }
  })
);

module.exports = refereeRoute;
