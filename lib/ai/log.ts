export function aiLog(event: string, meta: Record<string, unknown> = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), event, ...meta });
  console.log(line);
}
