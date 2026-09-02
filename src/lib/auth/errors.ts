export type AdminErrorCode =
  | "configuration"
  | "unauthenticated"
  | "forbidden"
  | "disabled"
  | "mfa_required"
  | "conflict"
  | "validation"
  | "service";

export class AdminAccessError extends Error {
  constructor(
    public readonly code: AdminErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AdminAccessError";
  }
}

export type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const INITIAL_ACTION_STATE: ActionState = { status: "idle", message: "" };

export function safeActionError(error: unknown): ActionState {
  if (error instanceof AdminAccessError) {
    return { status: "error", message: error.message };
  }
  if (error instanceof Error && error.name === "SupabaseConfigurationError") {
    return {
      status: "error",
      message: "The administration service is unavailable because its credentials are missing.",
    };
  }
  console.error("Admin action failed", error);
  return { status: "error", message: "We could not complete that request. Nothing was changed." };
}
