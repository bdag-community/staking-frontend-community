type DurationUnit = {
  seconds: number;
  singular: string;
  plural: string;
};

const UNITS: DurationUnit[] = [
  { seconds: 7 * 24 * 60 * 60, singular: "week", plural: "weeks" },
  { seconds: 24 * 60 * 60, singular: "day", plural: "days" },
  { seconds: 60 * 60, singular: "hour", plural: "hours" },
  { seconds: 60, singular: "minute", plural: "minutes" },
  { seconds: 1, singular: "second", plural: "seconds" },
];

const getDurationParts = (seconds: number) => {
  const safeSeconds = Math.max(1, Math.floor(seconds || 0));

  for (const unit of UNITS) {
    const value = safeSeconds / unit.seconds;
    const shouldUseUnit =
      Number.isInteger(value) && (unit.singular !== "week" || value > 1);

    if (shouldUseUnit) {
      return {
        value,
        unit: value === 1 ? unit.singular : unit.plural,
      };
    }
  }

  return {
    value: safeSeconds,
    unit: safeSeconds === 1 ? "second" : "seconds",
  };
};

const capitalizeFirst = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

export const formatDurationPlain = (seconds: number) => {
  const { value, unit } = getDurationParts(seconds);
  return `${value} ${unit}`;
};

export const formatDurationHyphenated = (
  seconds: number,
  options?: { capitalize?: boolean },
) => {
  const { value, unit } = getDurationParts(seconds);
  const singularUnit = unit.endsWith("s") ? unit.slice(0, -1) : unit;
  const formatted = `${value}-${singularUnit}`;
  return options?.capitalize ? capitalizeFirst(formatted) : formatted;
};
