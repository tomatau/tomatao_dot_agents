export function stripTrailingSlash(path: string): string {
  return path.replace(/\/+$/, '')
}
