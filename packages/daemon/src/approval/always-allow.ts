import { getQueries } from "../db/init.js";

export function checkAlwaysAllow(userId: string, toolName: string, _path?: string): boolean {
  const queries = getQueries();
  return queries.checkAlwaysAllow(userId, toolName);
}
