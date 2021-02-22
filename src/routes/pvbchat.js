const Composer = require("telegraf/composer");

const Track = require("../models/Track");
const User = require("../models/User");

const { calculateRate } = require("../utils");
const { typesQuery, userStatus } = require("../constants");

const pvbChat = new Composer();

pvbChat.hears(/^rating$/, async (ctx) => {
  if (!ctx.message.reply_to_message) return;
  if (ctx.message.reply_to_message.from.is_bot) return;

  const userDB = await User.findOne({
    telegramId: ctx.message.reply_to_message.from.id,
  });

  if (!userDB)
    return ctx.replyWithMarkdown("❗️ Этот юзер не участвует в батле!", {
      reply_to_message_id: ctx.message.message_id,
    });

  if (userDB.totalRate)
    return ctx.replyWithMarkdown(
      `Это *${userDB.rapName}* со статусом: ${
        userStatus[userDB.status]
      } и с количестом баллов: *${userDB.totalRate}*`
    );
});

pvbChat.on("callback_query", async (ctx) => {
  const { data } = ctx.callbackQuery;
  const { type, id, v } = JSON.parse(data);

  let trackDB;

  switch (type) {
    case typesQuery.LIKE:
      trackDB = await Track.findById(id);
      if (!trackDB) return ctx.answerCbQuery("Нет такого трека!");
      if (trackDB.rateUsers.includes(ctx.from.id))
        return ctx.answerCbQuery("Уже проголосовал!");
      trackDB.popularRate = trackDB.popularRate + v;
      trackDB.rateUsers.push(ctx.from.id);
      await trackDB.save();

      const popularRateCoef = calculateRate(
        trackDB.popularRate,
        trackDB.rateUsers.length
      );

      await Track.updateOne({ _id: id }, { popularRateCoef: popularRateCoef });
      await ctx.answerCbQuery(`Готово! Спасибо тебе!`);

    default:
      return ctx.answerCbQuery();
  }
});

module.exports = pvbChat;
