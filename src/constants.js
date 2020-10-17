const typesQuery = {
  SEND_TRACK: "SEND_TRACK",
  UPDATE_INFO: "UPDATE_INFO",
  DELETE: "DELETE",
  ACCEPT: "ACCEPT",
  ADD_SCORE: "ADD_SCORE",
  WIN_PAIR: "WIN_PAIR",
};

const textBlockLimits = {
  RAP_NAME: 32,
};

const scores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const trackSizeLimit = 20000000;

const trackCaption = "@veshaniebatol";

const trackStatus = {
  stop: "Вылетел",
  next: "Прошел",
  checking: "Сдал трек",
};

const innerRoundStatus = {
  receiving: "Прием треков",
  scoring: "Оценивание треков",
  ending: "Выставлены все оценки",
};

module.exports = {
  typesQuery,
  textBlockLimits,
  trackSizeLimit,
  trackCaption,
  trackStatus,
  innerRoundStatus,
  scores,
};
