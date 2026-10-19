import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ApplicationDetail } from "@/features/applications/components/application-detail";
import type { TrainerApplicationRow } from "@/types/database";

afterEach(cleanup);

const application: TrainerApplicationRow = {
  trainer_id: "t1",
  status: "submitted",
  full_name: "Ravi Kumar",
  phone: "+910000000000",
  summary: "Strength coach",
  area: "Gachibowli",
  city: "Hyderabad",
  travel_radius_km: 8,
  languages: ["English", "Telugu"],
  modes: ["home"],
  specialties: ["Strength"],
  experience: "3_5",
  qualifications: "",
  session_notes: "",
  expected_home_rate_inr: 1500,
  expected_online_rate_inr: null,
  accuracy_confirmed: true,
  reviewer_note: null,
  submitted_at: "2026-10-10T06:30:00Z",
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-10T06:30:00Z",
};

describe("ApplicationDetail", () => {
  it("groups the answers and labels expected rates as the trainer's", () => {
    render(
      <ApplicationDetail
        application={application}
        username="ravi"
        availability={[{ id: "a", trainer_id: "t1", weekday: 1, start_minute: 360, end_minute: 540 }]}
        documents={<p>docs body</p>}
      />,
    );
    for (const title of ["Profile", "Experience", "Services and expected rates", "Availability", "Documents"]) {
      expect(screen.getByRole("heading", { name: title })).toBeTruthy();
    }
    expect(screen.getByText("@ravi")).toBeTruthy();
    expect(screen.getByText("Home, expected by the trainer")).toBeTruthy();
    expect(screen.getByText("INR 1,500")).toBeTruthy();
    expect(screen.queryByText("Online, expected by the trainer")).toBeNull();
    expect(screen.getByText("3 to 5 years")).toBeTruthy();
    expect(screen.getByText("06:00-09:00")).toBeTruthy();
    expect(screen.getByText("docs body")).toBeTruthy();
  });

  it("explains a hidden username and empty availability", () => {
    render(
      <ApplicationDetail
        application={application}
        username={undefined}
        availability={[]}
        documents={null}
      />,
    );
    expect(screen.getByText("Hidden (needs View users)")).toBeTruthy();
    expect(screen.getByText("No weekly hours saved.")).toBeTruthy();
  });
});
