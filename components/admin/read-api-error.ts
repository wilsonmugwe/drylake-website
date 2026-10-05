/*
 * Read a safe error message from an admin API response. Routes answer
 * `{ success: false, error: "..." }`; anything else (HTML error page, empty body) falls
 * back to the caller's message rather than dumping raw text into the UI.
 */
export async function readApiError(response: Response, fallback: string): Promise<string> {
  if (response.status === 401) {
    return "Your session has expired. Sign in again and retry.";
  }

  try {
    const body = (await response.json()) as { error?: unknown };

    if (typeof body.error === "string" && body.error.trim()) {
      return body.error;
    }
  } catch {
    // Non-JSON body: use the fallback.
  }

  return fallback;
}
