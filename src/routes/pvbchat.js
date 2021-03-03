const Composer = require("telegraf/composer");
const Markup = require("telegraf/markup");

const Track = require("../models/Track");
const User = require("../models/User");

const { calculateRate } = require("../utils");
const { getTrackList, getArtistList } = require("../helpers");
const { typesQuery, userStatus, actionBtnValues } = require("../constants");

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
      } и с количеством баллов: *${userDB.totalRate}*`
    );

  return ctx.replyWithMarkdown(
    `Это *${userDB.rapName}* со статусом: ${userStatus[userDB.status]}`
  );
});

pvbChat.hears(/^track$/, async (ctx) => {
  if (!ctx.message.reply_to_message) return;
  if (ctx.message.reply_to_message.from.is_bot) return;
  if (ctx.message.reply_to_message.from.id === ctx.from.id) return;

  const userDB = await User.findOne({
    telegramId: ctx.message.reply_to_message.from.id,
  });

  if (!userDB)
    return ctx.replyWithMarkdown("❗️ Этот юзер не участвует в батле!", {
      reply_to_message_id: ctx.message.message_id,
    });

  const trackDB = await Track.findOne({ user: userDB._id }, "_id trackId", {
    sort: {
      uploadedAt: -1,
    },
  });

  if (!trackDB)
    return ctx.replyWithMarkdown("❗️ Этот юзер не участвует в батле!", {
      reply_to_message_id: ctx.message.message_id,
    });

  return ctx.replyWithAudio(
    trackDB.trackId,
    Markup.inlineKeyboard(
      actionBtnValues.map((btn) =>
        Markup.callbackButton(
          btn.text,
          JSON.stringify({
            type: typesQuery.LIKE,
            id: trackDB._id,
            v: btn.value,
          })
        )
      )
    ).extra({
      parse_mode: "Markdown",
    })
  );
});

pvbChat.hears(/^topTracks$/, async (ctx) => {
  const topTrackDB = await Track.find({}, "popularRate rateUsers", {
    sort: { popularRateCoef: -1 },
    limit: 3,
  })
    .populate("user", "rapName")
    .populate("round", "theme name");

  const topTrackList = getTrackList(topTrackDB);

  await ctx.replyWithMarkdown(
    `🌈 *ТОП-3* \n_Народное голосование_ \n\n${topTrackList}`
  );
});

pvbChat.hears(/^topArtists$/, async (ctx) => {
  const artistsDB = await User.find(
    { status: ["active", "finished"] },
    "rapName status totalRate",
    {
      sort: {
        totalRate: -1,
      },
      limit: 20,
    }
  );

  const topTrackList = getArtistList(artistsDB);

  await ctx.replyWithMarkdown(
    `👥 *Рейтинг исполнителей* \n_Судейские баллы. Рейтинг обновляется каждый раунд после окончания судейства._ \n\n${topTrackList}`
  );
});

pvbChat.on("callback_query", async (ctx) => {
  const { data } = ctx.callbackQuery;
  const { type, id, v } = JSON.parse(data);

  let trackDB;

  switch (type) {
    case typesQuery.LIKE:
      trackDB = await Track.findById(id).populate("user", "telegramId");
      if (!trackDB) return ctx.answerCbQuery("Нет такого трека!");
      if (trackDB.user.telegramId === ctx.from.id)
        return ctx.answerCbQuery("Свой трек нельзя оценить!", true);
      if (trackDB.rateUsers.includes(ctx.from.id))
        return ctx.answerCbQuery("Уже проголосовал!", true);
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
