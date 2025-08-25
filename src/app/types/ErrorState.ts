type ErrorState =
  | null // No error (initial state, or cleared)
  | string // Error message
  | Error;
