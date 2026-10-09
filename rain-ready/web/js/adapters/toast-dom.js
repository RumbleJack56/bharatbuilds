// web/js/adapters/toast-dom.js — ToastPort over the #toast element.
export function createDomToast(el) {
  let timer;
  return { show(msg) { el.textContent = msg; el.hidden = false; clearTimeout(timer); timer = setTimeout(() => { el.hidden = true; }, 4000); } };
}
