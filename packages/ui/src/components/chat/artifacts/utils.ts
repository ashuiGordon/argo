const EXT_MAP: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  py: "Python",
  rs: "Rust",
  go: "Go",
  md: "Markdown",
  json: "JSON",
  css: "CSS",
  html: "HTML",
  sql: "SQL",
  sh: "Shell",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  xml: "XML",
  rb: "Ruby",
  java: "Java",
  kt: "Kotlin",
  swift: "Swift",
  c: "C",
  cpp: "C++",
  h: "C",
  hpp: "C++",
};

export function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  return EXT_MAP[ext] || ext || "text";
}

export function getFileName(filePath: string): string {
  return filePath.split("/").pop() || filePath;
}

export function truncateMiddle(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const half = Math.floor((maxLen - 3) / 2);
  return text.slice(0, half) + "..." + text.slice(-half);
}
