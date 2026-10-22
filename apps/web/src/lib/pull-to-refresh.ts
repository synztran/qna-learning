export const REFRESH_THRESHOLD = 72;

export function pullDistance(startX: number, startY: number, x: number, y: number): number {
  const vertical = y - startY;
  if (vertical <= 0 || Math.abs(x - startX) > vertical) return 0;
  return Math.min(100, vertical * 0.5);
}

export function blocksPullRefresh(target: EventTarget | null, root: HTMLElement): boolean {
  if (!(target instanceof Element)) return true;
  if (target.closest('dialog, [role="dialog"], input, select, textarea, button, a, [contenteditable="true"]')) return true;
  for (let node: Element | null = target; node && node !== root; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY;
    if (/auto|scroll/.test(overflow) && node.scrollHeight > node.clientHeight) return true;
  }
  return false;
}
