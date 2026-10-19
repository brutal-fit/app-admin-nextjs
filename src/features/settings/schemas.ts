import { z } from "zod";

/*
 * The platform settings admin_set_setting knows, with the same checks it runs. The server
 * checks again and its text wins; these only stop an obviously bad value before the call.
 */

export const CANCELLATION_WINDOW_MIN = 0;
export const CANCELLATION_WINDOW_MAX = 168;
export const SESSION_DURATION_MIN = 15;
export const SESSION_DURATION_MAX = 240;
export const SESSION_DURATIONS_MAX_ITEMS = 6;
export const POLICY_COPY_MAX = 1000;
export const MAX_RATE_MIN = 1;
export const MAX_RATE_MAX = 100000;
export const EMERGENCY_NUMBER_PATTERN = /^\+?[0-9][0-9 -]{1,19}$/;

export const SETTING_KEYS = [
  "booking.cancellation_window_hours",
  "booking.session_durations",
  "booking.policy_copy",
  "trainer.max_rate_inr",
  "support.emergency_number",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

export function isSettingKey(value: string): value is SettingKey {
  return (SETTING_KEYS as readonly string[]).includes(value);
}

/** How a setting is edited: one whole number, a list of them, the policy lines, or text. */
export type SettingInput = "integer" | "integer_list" | "policy_copy" | "phone";

export const POLICY_COPY_PARTS = ["home", "online", "cancellation"] as const;
export type PolicyCopyPart = (typeof POLICY_COPY_PARTS)[number];
export const POLICY_COPY_LABELS: Record<PolicyCopyPart, string> = {
  home: "Home sessions",
  online: "Online sessions",
  cancellation: "Cancellation",
};

const wholeNumber = (label: string, min: number, max: number) =>
  z
    .number({ error: `${label} is a whole number.` })
    .int(`${label} is a whole number.`)
    .min(min, `${label} is at least ${min}.`)
    .max(max, `${label} is at most ${max}.`);

const policyLine = (part: PolicyCopyPart) =>
  z
    .string({ error: `Write the ${POLICY_COPY_LABELS[part].toLowerCase()} line.` })
    .trim()
    .min(1, `Write the ${POLICY_COPY_LABELS[part].toLowerCase()} line.`)
    .max(POLICY_COPY_MAX, `Keep each line to ${POLICY_COPY_MAX} characters or fewer.`);

export const SETTING_VALUE_SCHEMAS = {
  "booking.cancellation_window_hours": wholeNumber(
    "The cancellation window",
    CANCELLATION_WINDOW_MIN,
    CANCELLATION_WINDOW_MAX,
  ),
  "booking.session_durations": z
    .array(wholeNumber("Each session length", SESSION_DURATION_MIN, SESSION_DURATION_MAX))
    .min(1, "Give at least one session length.")
    .max(SESSION_DURATIONS_MAX_ITEMS, `Give at most ${SESSION_DURATIONS_MAX_ITEMS} session lengths.`)
    .refine((values) => new Set(values).size === values.length, {
      error: "Give each session length once.",
    }),
  "booking.policy_copy": z
    .object({
      home: policyLine("home"),
      online: policyLine("online"),
      cancellation: policyLine("cancellation"),
    })
    .strict(),
  "trainer.max_rate_inr": wholeNumber("The highest rate", MAX_RATE_MIN, MAX_RATE_MAX),
  "support.emergency_number": z
    .string({ error: "Give the emergency number." })
    .trim()
    .regex(
      EMERGENCY_NUMBER_PATTERN,
      "Use 2 to 20 digits, spaces or dashes, with an optional + at the start.",
    ),
} as const satisfies Record<SettingKey, z.ZodType>;

export type SettingValue<K extends SettingKey> = z.output<(typeof SETTING_VALUE_SCHEMAS)[K]>;

export type SettingDefinition = {
  key: SettingKey;
  label: string;
  input: SettingInput;
  /** Shown when the row has no description yet (it has never been set). */
  description: string;
  /** The rule in words, under the field. */
  rule: string;
  unit?: string;
};

export const SETTING_DEFINITIONS: readonly SettingDefinition[] = [
  {
    key: "booking.cancellation_window_hours",
    label: "Cancellation window",
    input: "integer",
    description: "Hours before a session after which a cancellation counts as late.",
    rule: `A whole number of hours from ${CANCELLATION_WINDOW_MIN} to ${CANCELLATION_WINDOW_MAX}.`,
    unit: "hours",
  },
  {
    key: "booking.session_durations",
    label: "Session lengths",
    input: "integer_list",
    description: "Session lengths in minutes a trainer can offer.",
    rule: `1 to ${SESSION_DURATIONS_MAX_ITEMS} different lengths, each ${SESSION_DURATION_MIN} to ${SESSION_DURATION_MAX} minutes, separated by commas.`,
    unit: "minutes",
  },
  {
    key: "booking.policy_copy",
    label: "Booking policy copy",
    input: "policy_copy",
    description: "Booking policy lines shown in the app: home, online and cancellation.",
    rule: `Each line 1 to ${POLICY_COPY_MAX} characters.`,
  },
  {
    key: "trainer.max_rate_inr",
    label: "Highest trainer rate",
    input: "integer",
    description: "Highest per-session rate a trainer may ask for, in rupees.",
    rule: `A whole number of rupees from ${MAX_RATE_MIN} to ${MAX_RATE_MAX.toLocaleString("en-IN")}.`,
    unit: "INR",
  },
  {
    key: "support.emergency_number",
    label: "Emergency number",
    input: "phone",
    description: "Emergency number shown on safety screens.",
    rule: "2 to 20 digits, spaces or dashes, with an optional + at the start.",
  },
];

export const setSettingSchema = z.discriminatedUnion("key", [
  z.object({
    key: z.literal("booking.cancellation_window_hours"),
    value: SETTING_VALUE_SCHEMAS["booking.cancellation_window_hours"],
  }),
  z.object({
    key: z.literal("booking.session_durations"),
    value: SETTING_VALUE_SCHEMAS["booking.session_durations"],
  }),
  z.object({
    key: z.literal("booking.policy_copy"),
    value: SETTING_VALUE_SCHEMAS["booking.policy_copy"],
  }),
  z.object({
    key: z.literal("trainer.max_rate_inr"),
    value: SETTING_VALUE_SCHEMAS["trainer.max_rate_inr"],
  }),
  z.object({
    key: z.literal("support.emergency_number"),
    value: SETTING_VALUE_SCHEMAS["support.emergency_number"],
  }),
]);

export type SetSettingInput = z.input<typeof setSettingSchema>;

/** A typed number field as a number; blank or not a number becomes NaN so Zod names it. */
export function parseIntegerText(value: string): number {
  const trimmed = value.trim();
  return trimmed === "" ? Number.NaN : Number(trimmed);
}

/** "45, 60, 90" as numbers; blanks between commas are dropped. */
export function parseIntegerListText(value: string): number[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .map((part) => Number(part));
}

/**
 * The stored value as the form shows it, or null when the row is missing or holds a shape
 * the form does not know (then the form starts empty and says so).
 */
export function storedSettingValue<K extends SettingKey>(
  key: K,
  value: unknown,
): SettingValue<K> | null {
  const parsed = SETTING_VALUE_SCHEMAS[key].safeParse(value);
  return parsed.success ? (parsed.data as SettingValue<K>) : null;
}
