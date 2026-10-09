// web/js/core/port.js — a port is a named list of required methods; implement() checks an adapter at startup.
export function definePort(name, methods) {
  return Object.freeze({ name, methods: Object.freeze([...methods]) });
}
export function implement(port, impl) {
  const missing = port.methods.filter(m => typeof impl?.[m] !== "function");
  if (missing.length) throw new TypeError(`${port.name}: missing ${missing.join(", ")}`);
  return Object.freeze(impl);
}
