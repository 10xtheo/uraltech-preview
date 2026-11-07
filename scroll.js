const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let frame = 0;
let destination = 0;
let lastTime = 0;
let lastPosition = 0;

function stop() {
  cancelAnimationFrame(frame);
  frame = 0;
}

function animate(time) {
  const current = window.scrollY;
  if (Math.abs(current - lastPosition) > 2) return stop();
  const remaining = destination - current;
  const elapsed = Math.min(time - lastTime, 40);
  lastTime = time;
  const step = Math.sign(remaining) * Math.max(1, Math.abs(remaining) * (1 - Math.exp(-elapsed / 92)));
  const finished = Math.abs(remaining) <= 2;
  window.scrollTo({ top: finished ? destination : current + step, behavior: 'instant' });
  lastPosition = window.scrollY;
  frame = finished ? 0 : requestAnimationFrame(animate);
}

function hasNestedScroll(target) {
  for (let element = target; element instanceof Element && element !== document.body; element = element.parentElement) {
    if (element.scrollHeight > element.clientHeight && /auto|scroll/.test(getComputedStyle(element).overflowY)) return true;
  }
  return false;
}

window.addEventListener('wheel', (event) => {
  if (reducedMotion.matches || event.defaultPrevented || !event.cancelable || event.ctrlKey || event.shiftKey ||
      Math.abs(event.deltaX) >= Math.abs(event.deltaY) ||
      (event.deltaMode === 0 && (!Number.isInteger(event.deltaY) || Math.abs(event.deltaY) < 40)) ||
      event.target.closest?.('input, textarea, select, [contenteditable]') || hasNestedScroll(event.target)) {
    if (!event.defaultPrevented) stop();
    return;
  }
  const current = window.scrollY;
  if (frame && Math.abs(current - lastPosition) > 2) stop();
  const viewport = document.documentElement.clientHeight;
  const max = document.scrollingElement.scrollHeight - viewport;
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport : 1;
  destination = Math.max(0, Math.min(max, (frame ? destination : current) + event.deltaY * unit));
  if (!frame && destination === current) return;
  event.preventDefault();
  if (!frame) {
    lastPosition = current;
    lastTime = performance.now();
    frame = requestAnimationFrame(animate);
  }
}, { passive: false });

window.addEventListener('keydown', stop);
window.addEventListener('pointerdown', stop);
window.addEventListener('pagehide', stop);
reducedMotion.addEventListener('change', stop);
