const typesQuery = {
  SEND_TRACK: "SEND_TRACK",
  UPDATE_INFO: "UPDATE_INFO",
  DELETE: "DELETE",
  ACCEPT: "ACCEPT",
  ADD_SCORE: "ADD_SCORE",
  WIN_PAIR: "WIN_PAIR",
  LIKE: "LIKE",
  MAIN_MENU: "MAIN_MENU",
  POPULAR_RATE: "PPLR_RT",
  TOP_TRACKS: "TP_TRCKS",
  GET_TRACK: "GT_TRCK",
  PERSONAL_TOP: "PRSNL_TP",
  SELECT_ROUND: "SLCT_RND",
  ROUND_LIST: "RND_LST",
  ARTIST_RATING: "RTST_RTNG",
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

const userStatus = {
  active: "🎤",
  finished: "☠️",
  empty: "🌝",
};

const actionBtnValues = [
  { text: "💩", value: 0 },
  { text: "💖", value: 1 },
];

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
  userStatus,
  actionBtnValues,
};
