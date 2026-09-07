/** Resolve caller-supplied data recipes through explicitly supplied constructors; never evaluate code. */
export function resolveOptionRecipe(value, {references = {}, calls = {}} = {}) {
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const resolve = node => {
    if (node === null || typeof node !== 'object') return node;
    if (Array.isArray(node)) {
      const out = [];
      for (const child of node) {
        if (child && typeof child === 'object' && !Array.isArray(child) && own(child, '$spread')) {
          if (Object.keys(child).length !== 1) throw Error('Invalid option spread');
          const items = resolve(child.$spread);
          if (!Array.isArray(items)) throw Error('Option spread requires an array');
          out.push(...items);
        } else out.push(resolve(child));
      }
      return out;
    }
    if (own(node, '$reference')) {
      if (Object.keys(node).length !== 1 || typeof node.$reference !== 'string' || !own(references, node.$reference)) throw Error('Unknown option reference');
      return references[node.$reference];
    }
    if (own(node, '$call')) {
      if (Object.keys(node).length !== 2 || !Array.isArray(node.args) || typeof node.$call !== 'string'
        || !own(calls, node.$call) || typeof calls[node.$call] !== 'function') throw Error('Unknown option constructor');
      return calls[node.$call](...node.args.map(resolve));
    }
    if (Object.keys(node).some(key => key.startsWith('$'))) throw Error('Unknown option recipe operation');
    return Object.fromEntries(Object.entries(node).map(([key, child]) => [key, resolve(child)]));
  };
  return resolve(value);
}
