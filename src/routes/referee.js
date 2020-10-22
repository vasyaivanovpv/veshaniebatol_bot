const { ADMIN_ID, CHANNEL } = require("../config");

const Composer = require("telegraf/composer");
const Markup = require("telegraf/markup");
const Extra = require("telegraf/extra");
const { Types } = require("mongoose");
const User = require("../models/User");
const Round = require("../models/Round");

const { checkJSONmw } = require("../helpers");
const { escapeChar } = require("../utils");
const { typesQuery, trackCaption } = require("../constants");
const Track = require("../models/Track");

const refereeRoute = new Composer();

refereeRoute.on("callback_query", async (ctx) => {
  const { message, data } = ctx.callbackQuery;
  const { type, aMId, score, win, lose } = JSON.parse(data);

  const { first_name, last_name } = ctx.from;
  const userName = [first_name, last_name].filter((v) => v).join(" ");

  const currentRoundDB = await Round.findOne({ status: "active" });

  let trackDB, scoreIndex, trackUserPhrase, loserDB;

  switch (type) {
    case typesQuery.ADD_SCORE:
      if (!currentRoundDB.index && ctx.from.id !== +ADMIN_ID)
        return ctx.answerCbQuery(`У тебя нет прав!`);

      trackDB = await Track.findOne({ adminMessageId: aMId }).populate("user");
      trackUserPhrase = `Репер *${trackDB.user.rapName}* получил оценки от ВСЕХ судей`;

      scoreIndex = trackDB.scores.findIndex(
        (objScore) => objScore.referee === ctx.from.id
      );

      // if (scoreIndex !== -1) {
      //   trackDB.total =
      //     trackDB.total - trackDB.scores[scoreIndex].score + score;
      //   trackDB.scores[scoreIndex].score = score;
      //   await trackDB.save();

      //   return ctx.answerCbQuery(score);
      // }

      if (!currentRoundDB.index) {
        trackDB.status = "next";
      }

      trackDB.scores.push({
        referee: ctx.from.id,
        score,
      });
      trackDB.total = trackDB.total + score;

      await trackDB.save();
      await ctx.answerCbQuery(score);
      break;

    case typesQuery.WIN_PAIR:
      loserDB = await Track.findOne({ adminMessageId: lose }).populate("user");
      trackDB = await Track.findOne({ adminMessageId: win }).populate("user");
      trackUserPhrase = `Пара *${trackDB.user.rapName}* и *${loserDB.user.rapName}* получила оценки от ВСЕХ судей`;

      scoreIndex = trackDB.scores.findIndex(
        (objScore) => objScore.referee === ctx.from.id
      );

      // if (scoreIndex !== -1) {
      //   if (!trackDB.scores[scoreIndex].score) {
      //     trackDB.total = trackDB.total + 1;
      //     loserDB.total = loserDB.total - 1;
      //   }

      //   trackDB.scores[scoreIndex].score = 1;
      //   loserDB.scores[scoreIndex].score = 0;
      //   await trackDB.save();
      //   await loserDB.save();

      //   return ctx.answerCbQuery(trackDB.user.rapName);
      // }

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

      await ctx.answerCbQuery(trackDB.user.rapName);
      break;

    default:
      return ctx.answerCbQuery();
  }

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
});

module.exports = refereeRoute;
