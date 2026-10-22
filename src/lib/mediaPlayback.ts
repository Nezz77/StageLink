// Shared by audio previews and reel dialogs. Claim before play; late play promises must check owns().
export function createMediaFocus() {
  let owner: string | null = null, stop: (() => void) | null = null;
  return {
    claim(id: string, pause: () => void) { if (owner !== id) stop?.(); owner=id;stop=pause; },
    owns(id: string) { return owner===id; },
    release(id: string) { if(owner===id){owner=null;stop=null;} },
    pause() { stop?.(); owner=null;stop=null; },
  };
}
export const mediaFocus = createMediaFocus();
