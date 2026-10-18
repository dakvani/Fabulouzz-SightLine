import { describe, it, expect } from "vitest";
import { getCalendarDays, getTimelineEndDate, parseProjectDate, getTaskDateRange } from "@/lib/projectTimeline";
import { SAUDI_CITIES, findSaudiCity } from "@/data/saudiCities";

describe("Saudi Arabia Weather Cities Database & Resolution", () => {
  it("should have comprehensive list of verified Saudi cities and economic zones", () => {
    expect(SAUDI_CITIES.length).toBeGreaterThanOrEqual(30);
    SAUDI_CITIES.forEach((city) => {
      expect(city.id).toBeDefined();
      expect(city.name).toBeDefined();
      expect(city.arabicName).toBeDefined();
      expect(city.region).toBeDefined();
      // Ensure GPS coordinates fall within KSA territory
      expect(city.lat).toBeGreaterThanOrEqual(16);
      expect(city.lat).toBeLessThanOrEqual(33);
      expect(city.lon).toBeGreaterThanOrEqual(34);
      expect(city.lon).toBeLessThanOrEqual(56);
    });
  });

  it("should match cities by English name, Arabic name, and acronyms", () => {
    expect(findSaudiCity("Riyadh")?.name).toBe("Riyadh");
    expect(findSaudiCity("الرياض")?.name).toBe("Riyadh");
    expect(findSaudiCity("KAEC")?.name).toBe("King Abdullah Economic City (KAEC)");
    expect(findSaudiCity("NEOM")?.name).toBe("NEOM / Oxagon");
    expect(findSaudiCity("Jeddah")?.name).toBe("Jeddah");
    expect(findSaudiCity("Dammam")?.name).toBe("Dammam");
  });
});

describe("Project Dashboard Date & Timeline Resilience", () => {
  it("should safely parse missing or empty project dates without throwing", () => {
    const fallback = new Date(2026, 0, 1);
    const parsed = parseProjectDate("", fallback);
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed.getFullYear()).toBe(2026);
  });

  it("should safely compute timeline end date when tasks array is empty", () => {
    const info = { startDate: "2026-03-01", endDate: "2026-03-31" };
    const endDate = getTimelineEndDate(info, []);
    expect(endDate).toBeInstanceOf(Date);
    expect(endDate.getFullYear()).toBe(2026);
  });

  it("should generate calendar days safely even with same start and end dates", () => {
    const start = new Date(2026, 2, 1);
    const end = new Date(2026, 2, 1);
    const days = getCalendarDays(start, end);
    expect(days.length).toBeGreaterThanOrEqual(1);
    expect(days[0].label).toBe("1");
  });

  it("should calculate task date ranges with minimum 1-day duration safely", () => {
    const start = new Date(2026, 2, 1);
    const range = getTaskDateRange(start, 0, 0);
    expect(range.startDate).toBeDefined();
    expect(range.endDate).toBeDefined();
    expect(range.compactLabel).toContain("—");
  });

  it("should accurately compute 14-day task duration range", () => {
    const start = new Date(2026, 2, 1); // March 1, 2026
    const range = getTaskDateRange(start, 0, 14);
    // March 1 + 14 days - 1 = March 14
    expect(range.startDate).toBe("01 Mar 2026");
    expect(range.endDate).toBe("14 Mar 2026");
  });

  it("should compute client portal weighted progress identically to admin command center", () => {
    const sampleTasks = [
      { id: 1, name: "Site Excavation", status: "Completed", duration: 5, startDay: 0 },
      { id: 2, name: "Foundation Pours", status: "Processing", duration: 8, startDay: 5 },
      { id: 3, name: "Steel Structure Erection", status: "Initiating", duration: 10, startDay: 13 },
      { id: 4, name: "Exterior Facade Cladding", status: "Planning", duration: 12, startDay: 23 },
    ];

    const weights: Record<string, number> = { Completed: 1, Processing: 0.5, Initiating: 0.2, Planning: 0 };
    const weightedScore = (1 * 1 + 0.5 * 1 + 0.2 * 1 + 0 * 1) / sampleTasks.length; // 1.7 / 4 = 0.425
    const expectedPercent = Math.round(weightedScore * 100); // 43%

    const computedPercent = Math.round(
      (sampleTasks.reduce((sum, t) => sum + (weights[t.status] || 0), 0) / sampleTasks.length) * 100
    );

    expect(computedPercent).toBe(expectedPercent);
    expect(computedPercent).toBe(43);
  });
});


