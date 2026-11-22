export type EmailAction = { kind: 'verify' | 'reset' | 'emailchange'; token: string | null };
export function emailActionFromHash(hash: string): EmailAction | null {
  const matched = /^#(verify|reset|emailchange)=(.*)$/.exec(hash);
  if (!matched) return null;
  let token = matched[2];
  try { token = decodeURIComponent(token); } catch { token = ''; }
  return { kind: matched[1] as EmailAction['kind'], token: /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null };
}
