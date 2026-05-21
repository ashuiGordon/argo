const COLLABORATION_KEYWORDS = [
  "and then", "after that", "first", "second", "step",
  "compare", "together", "both", "each", "parallel",
  "coordinate", "review", "check", "verify after",
];

export function shouldOrchestrate(message: string): boolean {
  if (message.length < 200) {
    const lower = message.toLowerCase();
    const hasCollabKeyword = COLLABORATION_KEYWORDS.some((kw) => lower.includes(kw));
    if (!hasCollabKeyword) return false;
  }
  return true;
}
