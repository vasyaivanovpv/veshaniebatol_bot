const Scene = require("telegraf/scenes/base");
const Markup = require("telegraf/markup");
const rateLimit = require("telegraf-ratelimit");
const { CHANNEL, ADMIN_PVB } = require("../../config");
const { typesQuery, trackSizeLimit, trackCaption } = require("../../constants");

const User = require("../../models/User");
const Round = require("../../models/Round");
const Track = require("../../models/Track");

const limitConfig = {
  window: 5 * 1000,
  limit: 1,
  keyGenerator: function (ctx) {
    return ctx.chat.id;
  },
  onLimitExceeded: async (ctx) =>
    await ctx.reply("Не спеши, слишком много действий за короткое время!"),
};

const sendTrack = new Scene("send_track");

sendTrack.use(rateLimit(limitConfig));

sendTrack.command("cancel", async (ctx) => {
  return ctx.scene.enter("main_menu");
});

sendTrack.enter(async (ctx) => {
  const roundDB = await Round.findOne({ status: "active" });

  await ctx.replyWithMarkdown(
    `🏠 *Сдать трек* \n\nОтправь свой трек на ${roundDB.name} *в формате mp3* и размером *не более 20мб*. Загрузка может занять некоторое время, поэтому дождись ответа о том что трек принят на рассмотрение. \n\n_Вернуться в главное меню /cancel._`
  );
});

const { downloadFIle, removeFile } = require("../../utils");

sendTrack.on("audio", async (ctx) => {
  const { audio } = ctx.message;

  if (audio.file_size > trackSizeLimit)
    return ctx.replyWithMarkdown(
      `❗️ Слишком большой размер файла! Принимаю трек *не более 20мб*.`
    );

  const userDB = await User.findOne({
    telegramId: ctx.from.id,
  });
  const roundDB = await Round.findOne({ status: "active" });
  const fileDest = `src/temp/${userDB.rapName}.mp3`;

  const fileLink = await ctx.telegram.getFileLink(audio.file_id);
  const uploadText = await ctx.replyWithMarkdown(`❗️ Загружаю...`);

  await downloadFIle(fileLink, fileDest);

  const trackTitle = roundDB.index
    ? `${roundDB.theme} (${roundDB.name})`
    : roundDB.name;

  const trackMessage = await ctx.replyWithAudio(
    { source: fileDest },
    {
      duration: audio.duration,
      performer: userDB.rapName,
      title: trackTitle,
      caption: trackCaption,
    }
  );

  await ctx.telegram.editMessageText(
    ctx.chat.id,
    uploadText.message_id,
    null,
    `❗️ Твой трек принят на рассмотрение!`
  );

  await removeFile(fileDest);

  const adminMessage = await ctx.telegram.sendAudio(
    ADMIN_PVB,
    trackMessage.audio.file_id,
    {
      parse_mode: "Markdown",
      caption: trackCaption,
    }
  );

  const trackDB = await new Track({
    uploadedAt: new Date(),
    user: userDB._id,
    round: roundDB._id,
    pair: roundDB.isPaired ? userDB.currentPair : 0,
    trackId: trackMessage.audio.file_id,
    adminMessageId: adminMessage.message_id,
  });
  await trackDB.save();

  await ctx.telegram.sendMessage(
    ADMIN_PVB,
    `Трек от *${userDB.rapName}* \n\nЕсть возможность отклонить трек, если он совсем не подходит на раунд!`,
    Markup.inlineKeyboard([
      [
        Markup.callbackButton(
          "Удалить",
          JSON.stringify({
            type: typesQuery.DELETE,
            aMId: adminMessage.message_id,
          })
        ),
        Markup.callbackButton(
          "Принять",
          JSON.stringify({
            type: typesQuery.ACCEPT,
            aMId: adminMessage.message_id,
          })
        ),
      ],
    ]).extra({ parse_mode: "Markdown" })
  );

  return ctx.scene.enter("main_menu");
});

sendTrack.use(async (ctx) => {
  await ctx.replyWithMarkdown(`❗️ Отправь трек в mp3!`);
});

module.exports = sendTrack;
