import { type ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

type Options = { route?: string };

export function renderWithProviders(ui: ReactElement, { route = "/" }: Options = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}
