const typesQuery = {
  SEND_TRACK: "SEND_TRACK",
  UPDATE_INFO: "UPDATE_INFO",
  DELETE: "DELETE",
  ACCEPT: "ACCEPT",
  ADD_SCORE: "ADD_SCORE",
  WIN_PAIR: "WIN_PAIR",
  LIKE: "LIKE",
  MAIN_MENU: "MAIN_MENU",
  POPULAR_RATE: "POPULAR_RATE",
  TOP_TRACKS: "TOP_TRACKS",
  GET_TRACK: "GET_TRACK",
  PERSONAL_TOP: "PERSONAL_TOP",
  SELECT_ROUND: "SELECT_ROUND",
  ROUND_LIST: "ROUND_LIST",
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
  accept: "Трек принят",
};

const innerRoundStatus = {
  receiving: "Прием треков",
  scoring: "Оценивание треков",
  ending: "Выставлены все оценки",
};

const textCellColors = {
  navyBlue: { red: 0.16862746, green: 0.34509805, blue: 0.47843137 },
  blue: { red: 0.6117647, green: 0.7607843, blue: 0.8980392 },
};

const sheetValues = {
  firstScoreRow: 5,
  rapNameColumn: "B",
};

module.exports = {
  typesQuery,
  textBlockLimits,
  trackSizeLimit,
  trackCaption,
  trackStatus,
  innerRoundStatus,
  sheetValues,
  textCellColors,
  scores,
};
