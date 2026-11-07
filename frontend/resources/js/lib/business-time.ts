export const BUSINESS_TIME_ZONE = 'Asia/Jakarta';

type DateParts = {
    year: number;
    month: number;
    day: number;
    hour?: number;
    minute?: number;
    second?: number;
};

function formatParts(date: Date, withTime = false): DateParts {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: BUSINESS_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...(withTime
            ? {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hourCycle: 'h23' as const,
              }
            : {}),
    }).formatToParts(date);

    return parts.reduce<DateParts>(
        (result, part) => {
            if (
                part.type === 'year' ||
                part.type === 'month' ||
                part.type === 'day' ||
                part.type === 'hour' ||
                part.type === 'minute' ||
                part.type === 'second'
            ) {
                result[part.type] = Number(part.value);
            }
            return result;
        },
        { year: 0, month: 0, day: 0 },
    );
}

export function businessDateKey(date: Date) {
    const { year, month, day } = formatParts(date);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function timeZoneOffsetMs(date: Date) {
    const {
        year,
        month,
        day,
        hour = 0,
        minute = 0,
        second = 0,
    } = formatParts(date, true);
    return (
        Date.UTC(year, month - 1, day, hour, minute, second) - date.getTime()
    );
}

export function businessDayStart(year: number, month: number, day: number) {
    const utcMidnight = Date.UTC(year, month - 1, day);
    return new Date(utcMidnight - timeZoneOffsetMs(new Date(utcMidnight)));
}

export function businessDayStartFromKey(value: string) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const check = new Date(Date.UTC(year, month - 1, day));
    if (
        check.getUTCFullYear() !== year ||
        check.getUTCMonth() !== month - 1 ||
        check.getUTCDate() !== day
    )
        return null;

    return businessDayStart(year, month, day);
}

export function shiftBusinessDays(date: Date, days: number) {
    const { year, month, day } = formatParts(date);
    const shifted = new Date(Date.UTC(year, month - 1, day + days));
    return businessDayStart(
        shifted.getUTCFullYear(),
        shifted.getUTCMonth() + 1,
        shifted.getUTCDate(),
    );
}
