import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LandingPage from "@/components/LandingPage";
import { ThemeProvider } from "next-themes";

describe("LandingPage Component & Production Readiness", () => {
  it("renders LandingPage cleanly without any runtime reference errors", () => {
    const { container } = render(
      <ThemeProvider attribute="class" defaultTheme="dark">
        <LandingPage onAuthSuccess={() => { }} />
      </ThemeProvider>
    );

    // Verify critical elements are present
    expect(container).toBeDefined();
    expect(screen.getAllByText(/Command Center/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Project Management, Reimagined/i)).toBeInTheDocument();
    expect(screen.getAllByText(/One Command Center/i).length).toBeGreaterThan(0);
  });

  it("renders all feature cards and pricing tiers", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark">
        <LandingPage onAuthSuccess={() => { }} />
      </ThemeProvider>
    );

    expect(screen.getByText("Real-Time Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Interactive Gantt Charts")).toBeInTheDocument();
    expect(screen.getByText("Kanban Board")).toBeInTheDocument();
    expect(screen.getByText("Smart Task Management")).toBeInTheDocument();

    // Verify pricing tiers
    expect(screen.getByText("Starter")).toBeInTheDocument();
    expect(screen.getByText("Most Popular")).toBeInTheDocument();
    expect(screen.getByText("Full Fleet Power")).toBeInTheDocument();
  });

  it("opens login modal without any role selector (pure email + password authentication)", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark">
        <LandingPage onAuthSuccess={() => { }} />
      </ThemeProvider>
    );

    // Click Sign In button in header
    const signInButtons = screen.getAllByRole("button", { name: /Sign In/i });
    expect(signInButtons.length).toBeGreaterThan(0);
    fireEvent.click(signInButtons[0]);

    // Modal should be visible with Email & Password inputs
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();

    // Must NOT contain simulated role selector dropdown
    expect(screen.queryByText("PM / Engineer")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("switches to direct password recovery mode without requiring secure email links", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark">
        <LandingPage onAuthSuccess={() => { }} />
      </ThemeProvider>
    );

    // Open modal
    const signInButtons = screen.getAllByRole("button", { name: /Sign In/i });
    fireEvent.click(signInButtons[0]);

    // Click "Forgot password?"
    const forgotBtn = screen.getByText(/Forgot password\?/i);
    fireEvent.click(forgotBtn);

    // Direct recovery fields should be visible
    expect(screen.getByText("Password Recovery")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter new password/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Confirm new password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Recover Password & Sign In/i })).toBeInTheDocument();
  });
});
