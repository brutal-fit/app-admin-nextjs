import { describe, expect, it } from "vitest";
import {
  EXERCISE_SORT_MAX,
  exercisesHref,
  isExercisesView,
  nextExerciseSortOrder,
  saveExerciseSchema,
  setExerciseActiveSchema,
  suggestExerciseKey,
  toExercisePayload,
} from "@/features/exercises/schemas";

const ID = "11111111-1111-4111-8111-111111111111";

const valid = {
  id: null,
  key: "goblet_squat",
  name: "Goblet squat",
  muscleGroup: "legs",
  equipment: ["Dumbbell"],
  cues: ["Chest up", "Knees out"],
  kind: "reps" as const,
  videoUrl: "",
  figureKey: "squat" as const,
  sortOrder: 0,
  active: true,
};

describe("saveExerciseSchema", () => {
  it("accepts a valid exercise", () => {
    expect(saveExerciseSchema.safeParse(valid).success).toBe(true);
  });

  it("trims and lowercases the key and muscle group", () => {
    const data = saveExerciseSchema.parse({ ...valid, key: "  Goblet_Squat ", muscleGroup: " Legs " });
    expect(data.key).toBe("goblet_squat");
    expect(data.muscleGroup).toBe("legs");
  });

  it.each([
    ["a key with a dash", { key: "goblet-squat" }],
    ["a one character key", { key: "g" }],
    ["a key starting with an underscore", { key: "_squat" }],
    ["a 61 character key", { key: "a".repeat(61) }],
    ["a blank name", { name: " " }],
    ["an 81 character name", { name: "a".repeat(81) }],
    ["a blank muscle group", { muscleGroup: "" }],
    ["a 41 character muscle group", { muscleGroup: "a".repeat(41) }],
    ["1 cue", { cues: ["Chest up"] }],
    ["5 cues", { cues: ["a", "b", "c", "d", "e"] }],
    ["a blank cue", { cues: ["Chest up", " "] }],
    ["a 161 character cue", { cues: ["Chest up", "a".repeat(161)] }],
    ["11 equipment names", { equipment: Array.from({ length: 11 }, () => "Mat") }],
    ["a blank equipment name", { equipment: [" "] }],
    ["an unknown kind", { kind: "yoga" }],
    ["an unknown figure", { figureKey: "moonwalk" }],
    ["a negative sort order", { sortOrder: -1 }],
    ["a sort order over the maximum", { sortOrder: EXERCISE_SORT_MAX + 1 }],
    ["a fractional sort order", { sortOrder: 1.5 }],
    ["a non-guid id", { id: "abc" }],
  ])("rejects %s", (_, patch) => {
    expect(saveExerciseSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });

  it("accepts 2 and 4 cues and no equipment", () => {
    expect(saveExerciseSchema.safeParse({ ...valid, cues: ["a", "b", "c", "d"], equipment: [] }).success).toBe(true);
  });

  it("accepts an empty video link or https, rejects http and spaces", () => {
    expect(saveExerciseSchema.safeParse({ ...valid, videoUrl: "" }).success).toBe(true);
    expect(saveExerciseSchema.safeParse({ ...valid, videoUrl: "https://example.com/v.mp4" }).success).toBe(true);
    expect(saveExerciseSchema.safeParse({ ...valid, videoUrl: "http://example.com/v.mp4" }).success).toBe(false);
    expect(saveExerciseSchema.safeParse({ ...valid, videoUrl: "https://example.com/a b" }).success).toBe(false);
    expect(
      saveExerciseSchema.safeParse({ ...valid, videoUrl: `https://e.com/${"a".repeat(500)}` }).success,
    ).toBe(false);
  });

  it("accepts timed kind", () => {
    expect(saveExerciseSchema.safeParse({ ...valid, kind: "timed" }).success).toBe(true);
  });
});

describe("toExercisePayload", () => {
  it("uses the function's field names, sends a null video for none and omits id on create", () => {
    const payload = toExercisePayload(saveExerciseSchema.parse(valid));
    expect(payload).toEqual({
      key: "goblet_squat",
      name: "Goblet squat",
      muscle_group: "legs",
      equipment: ["Dumbbell"],
      cues: ["Chest up", "Knees out"],
      kind: "reps",
      video_url: null,
      figure_key: "squat",
      sort_order: 0,
      active: true,
    });
  });

  it("sends the id and the video link on edit", () => {
    const payload = toExercisePayload(
      saveExerciseSchema.parse({ ...valid, id: ID, videoUrl: "https://example.com/v.mp4" }),
    );
    expect(payload.id).toBe(ID);
    expect(payload.video_url).toBe("https://example.com/v.mp4");
  });
});

describe("setExerciseActiveSchema", () => {
  it("requires an exercise id and a boolean", () => {
    expect(setExerciseActiveSchema.safeParse({ id: ID, active: false }).success).toBe(true);
    expect(setExerciseActiveSchema.safeParse({ id: "x", active: false }).success).toBe(false);
    expect(setExerciseActiveSchema.safeParse({ id: ID, active: "no" }).success).toBe(false);
  });
});

describe("helpers", () => {
  it("suggests a key from a name", () => {
    expect(suggestExerciseKey("Push-up & Hold!")).toBe("push_up_and_hold");
    expect(suggestExerciseKey("  ")).toBe("");
    expect(suggestExerciseKey("a".repeat(100))).toHaveLength(60);
  });

  it("starts a new exercise after the last, capped", () => {
    expect(nextExerciseSortOrder([])).toBe(0);
    expect(nextExerciseSortOrder([0, 30, 10])).toBe(40);
    expect(nextExerciseSortOrder([EXERCISE_SORT_MAX - 3])).toBe(EXERCISE_SORT_MAX);
  });

  it("reads and builds the exercises view URL", () => {
    expect(exercisesHref()).toBe("/catalogue?view=exercises");
    expect(isExercisesView({ view: "exercises" })).toBe(true);
    expect(isExercisesView({ view: ["exercises", "x"] })).toBe(true);
    expect(isExercisesView({ view: "programmes" })).toBe(false);
    expect(isExercisesView({})).toBe(false);
  });
});
