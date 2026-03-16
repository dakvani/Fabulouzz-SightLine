import type { ProjectInfo, ProjectTask } from "@/data/projectData";

export interface TimelineDay {
  date: Date;
  label: string;
  dayOfWeek: string;
  isWeekend: boolean;
  monthLabel?: string;
}

const DAY_MS = 1000 * 60 * 60 * 24;
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fullDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const compactDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
});

export const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const parseProjectDate = (value?: string, fallback = new Date()) => {
  if (!value) return startOfDay(fallback);

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return startOfDay(fallback);

  return new Date(year, month - 1, day);
};

export const formatTimelineDate = (date: Date, compact = false) =>
  (compact ? compactDateFormatter : fullDateFormatter).format(date);

export const getStartDayFromDate = (projectStart: Date, selectedDate: Date) =>
  Math.max(0, Math.floor((startOfDay(selectedDate).getTime() - projectStart.getTime()) / DAY_MS));

export const getTaskDateRange = (projectStart: Date, startDay: number, duration: number) => {
  const safeDuration = Math.max(duration, 1);
  const start = new Date(projectStart);
  start.setDate(start.getDate() + startDay);

  const end = new Date(start);
  end.setDate(end.getDate() + safeDuration - 1);

  return {
    start,
    end,
    startDate: formatTimelineDate(start),
    endDate: formatTimelineDate(end),
    compactLabel: `${formatTimelineDate(start, true)} — ${formatTimelineDate(end, true)}`,
    fullLabel: `${formatTimelineDate(start)} → ${formatTimelineDate(end)}`,
  };
};

export const getTimelineEndDate = (
  projectInfo: Pick<ProjectInfo, "startDate" | "endDate">,
  tasks: Pick<ProjectTask, "startDay" | "duration">[]
) => {
  const projectStart = parseProjectDate(projectInfo.startDate);
  const projectEnd = parseProjectDate(projectInfo.endDate, projectStart);

  return tasks.reduce((latestDate, task) => {
    const { end } = getTaskDateRange(projectStart, task.startDay, task.duration);
    return end > latestDate ? end : latestDate;
  }, projectEnd);
};

export const getCalendarDays = (projectStart: Date, projectEnd: Date): TimelineDay[] => {
  const normalizedStart = startOfDay(projectStart);
  const normalizedEnd = startOfDay(projectEnd);
  const totalDays = Math.max(1, Math.floor((normalizedEnd.getTime() - normalizedStart.getTime()) / DAY_MS) + 1);

  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(normalizedStart);
    date.setDate(normalizedStart.getDate() + index);

    return {
      date,
      label: String(date.getDate()),
      dayOfWeek: dayNames[date.getDay()],
      isWeekend: date.getDay() === 5 || date.getDay() === 6,
      monthLabel: index === 0 || date.getDate() === 1 ? date.toLocaleDateString("en-GB", { month: "short" }) : undefined,
    };
  });
};
