/*
 * Illustrative time and cost examples: the ONE source for every number the public site uses to
 * show what repetitive work costs (homepage problems, service pages, llms.txt).
 * PURE: no framework imports (tests/value-examples.test.mjs imports it directly).
 *
 * Why (plain-English messaging PR, 2026-10-13): visitors could not say what Drylake does or why
 * it would be worth paying for. Numbers make the value concrete, but Drylake has no measured
 * client outcomes yet, so every figure here is an ILLUSTRATIVE CALCULATION (class B in the
 * brief), never a result:
 *   - each example states its inputs, and the headline figure is derived from them (tested:
 *     the test recomputes every figure from the inputs, so copy and maths cannot drift);
 *   - copy says "for example" / "if" and never promises a saving;
 *   - staff-time value is labelled as the value of time, not guaranteed cash savings;
 *   - automation "may reduce" work; nothing promises it disappears.
 * Adding a verified result later needs a new, separate type with its evidence, not an edit here.
 */

export type ValueExample = {
  id: string;
  /* The sentence shown on the page. Must contain `figure` verbatim (tested). */
  text: string;
  /* The derived number as written in `text`, e.g. "10 hours a month". */
  figure: string;
  /* Plain-English assumptions shown next to the example. */
  assumptions: string;
  /* Inputs the figure is recomputed from in tests. */
  inputs:
    | { kind: "minutes-per-day-to-hours-per-month"; minutesPerDay: number; workingDaysPerMonth: number }
    | { kind: "minutes-per-day-to-hours-per-year"; minutesPerDay: number; workingDaysPerYear: number }
    | { kind: "tasks-per-day-to-hours-per-week"; tasksPerDay: number; minutesPerTask: number; workingDaysPerWeek: number }
    | { kind: "hours-per-week-to-dollars-per-year"; hoursPerWeek: number; weeksPerYear: number; dollarsPerHour: number };
};

/* Shown once near any group of examples; short on purpose (the brief: no wall of disclaimers). */
export const VALUE_EXAMPLE_NOTE =
  "Examples only, not results. Actual savings depend on your current process.";

export const VALUE_EXAMPLES = {
  staffCost: {
    id: "staff-cost",
    text: "If repetitive admin takes 5 hours a week and staff time costs $40 an hour, that is about $10,400 a year in staff time.",
    figure: "$10,400 a year",
    assumptions: "5 hours a week, 52 weeks, $40 an hour. This is the value of staff time, not guaranteed cash savings.",
    inputs: { kind: "hours-per-week-to-dollars-per-year", hoursPerWeek: 5, weeksPerYear: 52, dollarsPerHour: 40 },
  },
  copying: {
    id: "copying",
    text: "If your team spends 30 minutes a day copying information between systems, that is around 10 hours a month that could potentially be reduced.",
    figure: "10 hours a month",
    assumptions: "30 minutes each working day, 20 working days a month.",
    inputs: { kind: "minutes-per-day-to-hours-per-month", minutesPerDay: 30, workingDaysPerMonth: 20 },
  },
  searching: {
    id: "searching",
    text: "If your team spends 30 minutes a day finding and updating job details in spreadsheets and emails, that is around 10 hours a month.",
    figure: "10 hours a month",
    assumptions: "30 minutes each working day, 20 working days a month.",
    inputs: { kind: "minutes-per-day-to-hours-per-month", minutesPerDay: 30, workingDaysPerMonth: 20 },
  },
  reminders: {
    id: "reminders",
    text: "If sending reminders takes 15 minutes each working day, that is around 5 hours a month on a task that may be suitable for automation.",
    figure: "5 hours a month",
    assumptions: "15 minutes each working day, 20 working days a month.",
    inputs: { kind: "minutes-per-day-to-hours-per-month", minutesPerDay: 15, workingDaysPerMonth: 20 },
  },
  doubleEntry: {
    id: "double-entry",
    text: "If entering details once instead of three times saves 20 minutes a day, that is around 80 hours of staff time a year.",
    figure: "80 hours of staff time a year",
    assumptions: "20 minutes each working day, 240 working days a year.",
    inputs: { kind: "minutes-per-day-to-hours-per-year", minutesPerDay: 20, workingDaysPerYear: 240 },
  },
  enquiries: {
    id: "enquiries",
    text: "If your team handles 20 routine enquiries a day and spends 3 minutes on each, that is around 5 hours a week.",
    figure: "5 hours a week",
    assumptions: "20 enquiries a day, 3 minutes each, 5 working days. Automation may reduce some of this work, not all of it.",
    inputs: { kind: "tasks-per-day-to-hours-per-week", tasksPerDay: 20, minutesPerTask: 3, workingDaysPerWeek: 5 },
  },
  sorting: {
    id: "sorting",
    text: "If someone spends an hour a day reading and sorting incoming emails and documents, that is around 20 hours a month.",
    figure: "20 hours a month",
    assumptions: "60 minutes each working day, 20 working days a month. AI can prepare and sort some of it; a person still checks what matters.",
    inputs: { kind: "minutes-per-day-to-hours-per-month", minutesPerDay: 60, workingDaysPerMonth: 20 },
  },
} as const satisfies Record<string, ValueExample>;

export type ValueExampleKey = keyof typeof VALUE_EXAMPLES;

/* Recomputes an example's figure from its inputs (used by tests; kept here so the rule lives with the data). */
export function computeFigure(inputs: ValueExample["inputs"]): number {
  switch (inputs.kind) {
    case "minutes-per-day-to-hours-per-month":
      return (inputs.minutesPerDay * inputs.workingDaysPerMonth) / 60;
    case "minutes-per-day-to-hours-per-year":
      return (inputs.minutesPerDay * inputs.workingDaysPerYear) / 60;
    case "tasks-per-day-to-hours-per-week":
      return (inputs.tasksPerDay * inputs.minutesPerTask * inputs.workingDaysPerWeek) / 60;
    case "hours-per-week-to-dollars-per-year":
      return inputs.hoursPerWeek * inputs.weeksPerYear * inputs.dollarsPerHour;
  }
}
