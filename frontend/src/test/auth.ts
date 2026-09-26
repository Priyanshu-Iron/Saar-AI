import { vi } from "vitest";
import * as api from "../api";
import type { AccountStatus } from "../api";

type SignIn = { email?: string; status?: AccountStatus; isAdmin?: boolean };

/** Seed a stored session and make /auth/me agree with it. */
export function signInAs({ email = "user@example.com", status = "approved", isAdmin = false }: SignIn = {}) {
  window.localStorage.setItem("saarai_api_key", "k");
  window.localStorage.setItem("saarai_auth_user", JSON.stringify({ email, status, isAdmin }));
  return vi.spyOn(api.authApi, "me").mockResolvedValue({ email, status, is_admin: isAdmin });
}
