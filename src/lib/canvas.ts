/**
 * Minimal typed view of an Obsidian `.canvas` file (JSON Canvas format).
 * Only the fields this plugin reads or writes are declared; any other
 * properties are preserved when the data is serialized back.
 */
export interface CanvasNode {
  id?: string;
  type?: string;
  file?: string;
  url?: string;
  text?: string;
  [key: string]: unknown;
}

export interface CanvasData {
  nodes: CanvasNode[];
  [key: string]: unknown;
}

/**
 * Parse canvas file content.
 * Throws if the content is not valid JSON; returns null if it is JSON
 * but has no `nodes` array.
 */
export function parseCanvasData(content: string): CanvasData | null {
  const data = JSON.parse(content) as unknown;
  if (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as { nodes?: unknown }).nodes)
  ) {
    return data as CanvasData;
  }
  return null;
}
