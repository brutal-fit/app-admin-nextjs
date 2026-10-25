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
export const DISCOUNT_PCT_MIN = 0;
export const DISCOUNT_PCT_MAX = 50;
export const FEE_MULTIPLIER_MIN = 0.5;
export const FEE_MULTIPLIER_MAX = 3;

/** The models admin_set_setting accepts for coach.model, cheapest first. */
export const COACH_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"] as const;
export type CoachModel = (typeof COACH_MODELS)[number];
export const COACH_MODEL_LABELS: Record<CoachModel, string> = {
  "claude-haiku-5-5": "Claude Haiku 5.5",
  "claude-sonnet-5-5": "Claude Sonnet 5.5",
  "claude-opus-5-5": "Claude Opus 5.5",
};

export const SETTING_KEYS = [
  "booking.cancellation_window_hours",
  "booking.session_durations",
  "booking.policy_copy",
  "trainer.max_rate_inr",
  "support.emergency_number",
  "coach.model",
  "push.enabled",
  "payments.enabled",
  "subscriptions.enabled",
  "subscriptions.discount_month_pct",
  "subscriptions.discount_quarter_pct",
  "coaching.enabled",
  "coaching.fee_multiplier",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

export function isSettingKey(value: string): value is SettingKey {
  return (SETTING_KEYS as readonly string[]).includes(value);
}

/**
 * How a setting is edited: one whole number, a list of them, the policy lines, text, one of
 * the coach models, an on/off switch, or a number with one decimal place.
 */
export type SettingInput =
  | "integer"
  | "integer_list"
  | "policy_copy"
  | "phone"
  | "coach_model"
  | "boolean"
  | "decimal";

/** The settings edited as a switch. The server reads a missing or non-boolean value as off. */
export const BOOLEAN_SETTING_KEYS = [
  "push.enabled",
  "payments.enabled",
  "subscriptions.enabled",
  "coaching.enabled",
] as const;
export type BooleanSettingKey = (typeof BOOLEAN_SETTING_KEYS)[number];

export function isBooleanSettingKey(key: SettingKey): key is BooleanSettingKey {
  return (BOOLEAN_SETTING_KEYS as readonly string[]).includes(key);
}

/** The settings edited as one whole number. */
export const INTEGER_SETTING_KEYS = [
  "booking.cancellation_window_hours",
  "trainer.max_rate_inr",
  "subscriptions.discount_month_pct",
  "subscriptions.discount_quarter_pct",
] as const;
export type IntegerSettingKey = (typeof INTEGER_SETTING_KEYS)[number];

export function isIntegerSettingKey(key: SettingKey): key is IntegerSettingKey {
  return (INTEGER_SETTING_KEYS as readonly string[]).includes(key);
}

/** The settings edited as a number with at most one decimal place. */
export const DECIMAL_SETTING_KEYS = ["coaching.fee_multiplier"] as const;
export type DecimalSettingKey = (typeof DECIMAL_SETTING_KEYS)[number];

export function isDecimalSettingKey(key: SettingKey): key is DecimalSettingKey {
  return (DECIMAL_SETTING_KEYS as readonly string[]).includes(key);
}

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

// admin_set_setting checks value * 10 is whole; the tolerance absorbs binary rounding (0.7 * 10).
const oneDecimal = (label: string, min: number, max: number) =>
  z
    .number({ error: `${label} is a number such as 1.5.` })
    .min(min, `${label} is at least ${min}.`)
    .max(max, `${label} is at most ${max}.`)
    .refine((value) => Math.abs(value * 10 - Math.round(value * 10)) < 1e-9, {
      error: `${label} goes in steps of 0.1.`,
    });

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
  "coach.model": z.enum(COACH_MODELS, { error: "Choose one of the three models." }),
  "push.enabled": z.boolean({ error: "Use true or false." }),
  "payments.enabled": z.boolean({ error: "Use true or false." }),
  "subscriptions.enabled": z.boolean({ error: "Use true or false." }),
  "subscriptions.discount_month_pct": wholeNumber("The 4-week discount", DISCOUNT_PCT_MIN, DISCOUNT_PCT_MAX),
  "subscriptions.discount_quarter_pct": wholeNumber("The 12-week discount", DISCOUNT_PCT_MIN, DISCOUNT_PCT_MAX),
  "coaching.enabled": z.boolean({ error: "Use true or false." }),
  "coaching.fee_multiplier": oneDecimal("The coaching fee multiplier", FEE_MULTIPLIER_MIN, FEE_MULTIPLIER_MAX),
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
  /** Guidance shown under the rule. */
  note?: string;
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
  {
    key: "coach.model",
    label: "Coach model",
    input: "coach_model",
    description: "Claude model for the AI coach.",
    rule: "One of Claude Haiku 5.5, Claude Sonnet 5.5 or Claude Opus 5.5.",
    note: "Haiku for testing and development; Sonnet for launch.",
  },
  {
    key: "push.enabled",
    label: "Push notifications",
    input: "boolean",
    description: "Send every in-app notification to phones as well.",
    rule: "On or off; a missing value counts as off.",
  },
  {
    key: "payments.enabled",
    label: "Payments",
    input: "boolean",
    description: "Clients pay when requesting; off keeps requests free.",
    rule: "On or off; a missing value counts as off.",
  },
  {
    key: "subscriptions.enabled",
    label: "Subscriptions",
    input: "boolean",
    description: "Clients can subscribe to a trainer for a week, a month or three months.",
    rule: "On or off; a missing value counts as off.",
  },
  {
    key: "subscriptions.discount_month_pct",
    label: "4-week subscription discount",
    input: "integer",
    description: "Discount in percent on a 4-week subscription (0 to 50).",
    rule: `A whole number of percent from ${DISCOUNT_PCT_MIN} to ${DISCOUNT_PCT_MAX}.`,
    unit: "percent",
  },
  {
    key: "subscriptions.discount_quarter_pct",
    label: "12-week subscription discount",
    input: "integer",
    description: "Discount in percent on a 12-week subscription (0 to 50).",
    rule: `A whole number of percent from ${DISCOUNT_PCT_MIN} to ${DISCOUNT_PCT_MAX}.`,
    unit: "percent",
  },
  {
    key: "coaching.enabled",
    label: "Coaching",
    input: "boolean",
    description: "Clients can pick a coach for a library programme and pay monthly.",
    rule: "On or off; a missing value counts as off.",
  },
  {
    key: "coaching.fee_multiplier",
    label: "Coaching fee multiplier",
    input: "decimal",
    description: "Monthly coaching fee as a multiple of the coach's online session price (0.5 to 3).",
    rule: `A number from ${FEE_MULTIPLIER_MIN} to ${FEE_MULTIPLIER_MAX} in steps of 0.1.`,
    unit: "x session price",
    note: "Applies to new coaching requests; renewals keep the fee set at request.",
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
  z.object({
    key: z.literal("coach.model"),
    value: SETTING_VALUE_SCHEMAS["coach.model"],
  }),
  z.object({
    key: z.literal("push.enabled"),
    value: SETTING_VALUE_SCHEMAS["push.enabled"],
  }),
  z.object({
    key: z.literal("payments.enabled"),
    value: SETTING_VALUE_SCHEMAS["payments.enabled"],
  }),
  z.object({
    key: z.literal("subscriptions.enabled"),
    value: SETTING_VALUE_SCHEMAS["subscriptions.enabled"],
  }),
  z.object({
    key: z.literal("subscriptions.discount_month_pct"),
    value: SETTING_VALUE_SCHEMAS["subscriptions.discount_month_pct"],
  }),
  z.object({
    key: z.literal("subscriptions.discount_quarter_pct"),
    value: SETTING_VALUE_SCHEMAS["subscriptions.discount_quarter_pct"],
  }),
  z.object({
    key: z.literal("coaching.enabled"),
    value: SETTING_VALUE_SCHEMAS["coaching.enabled"],
  }),
  z.object({
    key: z.literal("coaching.fee_multiplier"),
    value: SETTING_VALUE_SCHEMAS["coaching.fee_multiplier"],
  }),
]);

export type SetSettingInput = z.input<typeof setSettingSchema>;

/** A typed number field as a number; blank or not a number becomes NaN so Zod names it. */
export function parseIntegerText(value: string): number {
  const trimmed = value.trim();
  return trimmed === "" ? Number.NaN : Number(trimmed);
}

/** A typed decimal ("1.5") as a number; blank or not a number becomes NaN so Zod names it. */
export function parseDecimalText(value: string): number {
  return parseIntegerText(value);
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
