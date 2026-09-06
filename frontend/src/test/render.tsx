import { type ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { MeetingProvider } from "../context/MeetingContext";
import { ThemeProvider } from "../context/ThemeContext";

type Options = { route?: string };

export function renderWithProviders(ui: ReactElement, { route = "/" }: Options = {}) {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MeetingProvider>
          <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            {ui}
          </MemoryRouter>
        </MeetingProvider>
      </AuthProvider>
    </ThemeProvider>,
  );
}
