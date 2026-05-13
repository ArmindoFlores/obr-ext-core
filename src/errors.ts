export class APIError<C = unknown> extends Error {
  readonly context?: C | undefined;

  constructor(message: string, context?: C) {
    super(message);
    this.context = context;
  }
}
