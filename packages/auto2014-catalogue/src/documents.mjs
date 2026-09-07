/** Offline document transforms using explicitly reviewed source bindings. */
export function createDocumentTools({moduleId, bindings: input}) {
  if (typeof moduleId !== 'string' || !moduleId || !input || typeof input !== 'object') throw Error('Missing document bindings');
  const bindings = JSON.parse(JSON.stringify(input));
  if (!Array.isArray(bindings.replacements) || !Array.isArray(bindings.packAliases)) throw Error('Invalid document rewrite tables');
  if (bindings.packAliases.some(pair => !Array.isArray(pair) || pair.length !== 2 || pair.some(value => typeof value !== 'string' || !value))) throw Error('Invalid pack alias');
  if (!bindings.metadata || typeof bindings.metadata !== 'object' || Array.isArray(bindings.metadata)) throw Error('Invalid document metadata');
  if (typeof bindings.sourceNamespace !== 'string' || !/^[A-Za-z0-9_-]+$/.test(bindings.sourceNamespace)) throw Error('Invalid source namespace');
  const expand = value => value.replaceAll('{{moduleId}}', moduleId);
  const replacements = bindings.replacements.map(operation => {
    if (!operation || typeof operation.to !== 'string') throw Error('Invalid replacement');
    if (operation.kind === 'literal' && typeof operation.from === 'string' && operation.from) return {...operation, from: expand(operation.from), to: expand(operation.to)};
    if (operation.kind === 'regex' && typeof operation.pattern === 'string' && typeof operation.flags === 'string') return {...operation, expression: new RegExp(operation.pattern, operation.flags), to: expand(operation.to)};
    throw Error('Invalid rewrite operation');
  });
  const pattern = 'Compendium\\.' + bindings.sourceNamespace + '\\.[A-Za-z0-9_-]+\\.(?:Item\\.)?[A-Za-z0-9]+';
  const directUuidPattern = new RegExp('^' + pattern + '$');
  const embeddedUuidPattern = new RegExp(pattern, 'g');
  const clone = value => JSON.parse(JSON.stringify(value));
  function rewriteString(value) {
    if (typeof value !== 'string') return value;
    let next = value;
    for (const operation of replacements) next = operation.kind === 'literal'
      ? next.replaceAll(operation.from, operation.to)
      : next.replace(operation.expression, operation.to);
    return next;
  }

  function rewriteDeep(value) {
    if (typeof value === "string") return rewriteString(value);
    if (Array.isArray(value)) return value.map(rewriteDeep);
    if (!value || typeof value !== "object") return value;
    for (const [key, child] of Object.entries(value)) value[key] = rewriteDeep(child);
    return value;
  }

  function uuidFor(packName, docId) {
    return `Compendium.${moduleId}.${packName}.Item.${docId}`;
  }

  function packNameForUuid(uuid) {
    if (typeof uuid !== 'string') return null;
    for (const [fragment, pack] of bindings.packAliases) if (uuid.includes(fragment)) return pack;
    return null;
  }

  function rewriteUuid(uuid) {
    const packName = packNameForUuid(uuid);
    const id = uuid?.split(".").pop();
    if (!packName || !id) return rewriteString(uuid);
    return uuidFor(packName, id);
  }

  function pruneObject(value) {
    if (!value || typeof value !== "object") return;
    delete value.folder;
    value.ownership = { default: 2 };
    value._stats = {
      ...(value._stats ?? {}),
      ...bindings.metadata,
    };
  }

  function cleanEffects(doc, effectsById, packName = "classfeatures") {
    const sourceEffects = Array.isArray(doc.effects) ? doc.effects : [];
    const hydrated = [];
    for (const effect of sourceEffects) {
      if (typeof effect === "string" && effectsById.has(effect)) {
        const effectDoc = clone(effectsById.get(effect));
        delete effectDoc.type;
        delete effectDoc.system;
        effectDoc.origin = uuidFor(packName, doc._id);
        pruneObject(effectDoc);
        hydrated.push(rewriteDeep(effectDoc));
      } else if (effect && typeof effect === "object") {
        const effectDoc = clone(effect);
        effectDoc.origin = uuidFor(packName, doc._id);
        hydrated.push(rewriteDeep(effectDoc));
      }
    }
    doc.effects = hydrated;

    const activityMap = doc.system?.activities ?? {};
    for (const activity of Object.values(activityMap)) {
      if (!activity || typeof activity !== "object") continue;
      if (Array.isArray(activity.effects)) {
        activity.effects = activity.effects
          .map(effect => (typeof effect === "string" ? { _id: effect } : effect))
          .filter(effect => effect && typeof effect === "object");
      }
      if (Array.isArray(activity.appliedEffects)) {
        activity.appliedEffects = activity.appliedEffects.filter(id => doc.effects.some(e => e._id === id));
      }
    }
  }

  function collectCompendiumUuids(value, out = new Set()) {
    if (typeof value === "string") {
      const direct = value.match(directUuidPattern);
      if (direct) out.add(value);
      for (const match of value.matchAll(embeddedUuidPattern)) {
        out.add(match[0]);
      }
      return out;
    }
    if (Array.isArray(value)) {
      for (const child of value) collectCompendiumUuids(child, out);
      return out;
    }
    if (value && typeof value === "object") {
      for (const child of Object.values(value)) collectCompendiumUuids(child, out);
    }
    return out;
  }

  function collectReferencedIdsByPack(doc, packName) {
    const ids = new Set();
    for (const uuid of collectCompendiumUuids(doc.system?.advancement ?? [])) {
      if (packNameForUuid(uuid) === packName) ids.add(uuid.split(".").pop());
    }
    return ids;
  }

  return Object.freeze({rewriteString, rewriteDeep, uuidFor, packNameForUuid, rewriteUuid, pruneObject, cleanEffects, collectCompendiumUuids, collectReferencedIdsByPack});
}
