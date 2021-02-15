const { isJSONString } = require("./utils");

const checkJSONmw = async (ctx, next) => {
  if (!isJSONString(ctx.callbackQuery.data)) {
    await ctx.answerCbQuery();
    return ctx.replyWithMarkdown(`❗️ Это действие сейчас не актуально!`);
  } else {
    next();
  }
};

const getTrackList = (tracks) =>
  tracks.reduce((acc, track, i) => {
    acc += `*${i + 1}.* *${track.user.rapName}* *(+${track.popularRate}/${
      track.rateUsers.length
    })*\n${track.round.theme}\n${track.round.name}\n\n`;
    return acc;
  }, "");

module.exports = {
  checkJSONmw,
  getTrackList,
};
