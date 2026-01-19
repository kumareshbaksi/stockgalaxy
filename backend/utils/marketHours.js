const IST_TIME_ZONE = 'Asia/Kolkata';
const MARKET_OPEN_MINUTES = 9 * 60 + 15;
const MARKET_CLOSE_MINUTES = 15 * 60 + 30;
const WEEKEND_DAYS = new Set(['Sat', 'Sun']);

const getIndianTimeParts = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const lookup = {};
  parts.forEach((part) => {
    if (part.type !== 'literal') {
      lookup[part.type] = part.value;
    }
  });

  const hour = Number.parseInt(lookup.hour, 10);
  const minute = Number.parseInt(lookup.minute, 10);

  return {
    weekday: lookup.weekday,
    hour,
    minute,
  };
};

const isIndianMarketOpen = (date = new Date()) => {
  const { weekday, hour, minute } = getIndianTimeParts(date);

  if (!weekday || Number.isNaN(hour) || Number.isNaN(minute)) {
    return true;
  }

  if (WEEKEND_DAYS.has(weekday)) {
    return false;
  }

  const minutes = hour * 60 + minute;
  return minutes >= MARKET_OPEN_MINUTES && minutes <= MARKET_CLOSE_MINUTES;
};

module.exports = {
  isIndianMarketOpen,
};
