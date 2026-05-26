function debug(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.log(...args)
  }
}

function warn(...args: unknown[]): void {
  console.warn(...args)
}

function error(...args: unknown[]): void {
  console.error(...args)
}

export const logger = { debug, warn, error }