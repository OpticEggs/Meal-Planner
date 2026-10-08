#!/usr/bin/env node
/* Independent source-level probes for Table 89f3ea9.
 * These are NOT replacements for Vitest/PostgreSQL/Playwright acceptance tests.
 * They execute the bundle's actual TypeScript functions through transpileModule.
 * SQL command boundaries are recording doubles. Decimal operations are deliberately
 * unavailable: the projection probes use request-only inputs and must invoke none.
 * No repository source is modified and no external service is contacted.
 * Usage: node source-probes.cjs /absolute/path/to/table [typescript-module-path]
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(process.argv[2] || path.join(__dirname, 'repo'));
const candidates = [process.argv[3], path.join(root, 'node_modules/typescript'), 'typescript', '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'].filter(Boolean);
let ts;
for (const candidate of candidates) { try { ts = require(candidate); break; } catch {} }
if (!ts) throw new Error('TypeScript is needed only for transpileModule. Pass its module path as argument 3.');
let decimalCalls = 0;
const noDecimal = () => { decimalCalls++; throw new Error('This probe must not perform decimal arithmetic. Run the full suite for arithmetic.'); };
class UnavailableDecimal { constructor() { noDecimal(); } }
class Reject extends Error { constructor(code, message, details) { super(message); this.code = code; this.details = details; } }
function loader(extra = {}) {
  const cache = new Map();
  const stubs = {
    [path.join(root, 'src/domain/units.ts')]: { D: UnavailableDecimal, convert: noDecimal, normalizeUnit: noDecimal, packagesFor: noDecimal, KNOWN_UNITS: [] },
    ...extra,
  };
  function load(file) {
    file = path.resolve(file);
    if (Object.hasOwn(stubs, file)) return stubs[file];
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} }; cache.set(file, mod);
    const src = fs.readFileSync(file, 'utf8');
    const js = ts.transpileModule(src, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
    function req(id) {
      if (id.startsWith('node:')) return require(id);
      if (id.startsWith('@/')) return load(path.join(root, 'src', id.slice(2)) + '.ts');
      if (id.startsWith('.')) return load(path.resolve(path.dirname(file), id) + '.ts');
      throw new Error('External dependency unavailable in isolated probe: ' + id);
    }
    vm.runInThisContext('(function(require,module,exports,__filename,__dirname){\n' + js + '\n})', { filename: file })(req, mod, mod.exports, file, path.dirname(file));
    return mod.exports;
  }
  return rel => load(path.join(root, rel));
}
const L = loader();
const { generateProposal } = L('src/domain/planning/proposal.ts');
const { computeOperation } = L('src/domain/planning/operations.ts');
const { computeProjection } = L('src/domain/groceries/projection.ts');
const { checkRecipe } = L('src/domain/planning/constraints.ts');
const { nightsOf } = L('src/domain/dates.ts');
const { hashOf } = L('src/domain/hash.ts');
const weekStart = '2026-10-12';
const days = nightsOf(weekStart);
const members = [{ id: 'jon', displayName: 'Jon' }, { id: 'alex', displayName: 'Alex' }];
const actor = { memberId: 'jon', householdId: 'h', displayName: 'Jon' };
const recipes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'].map((title, i) => ({ id: 'rv' + i, recipeId: 'r' + i, title, components: [{ key: 'main', name: 'Main' }], ingredients: [{ ingredientKey: 'fish', componentKey: 'main', quantity: '1', unit: 'each' }], leftoverFriendly: true, effortLevel: 'easy', effortMinutes: 15 }));
const ingredients = new Map([['fish', { key: 'fish', name: 'Fish', tags: ['fish'], allergenInfoKnown: true }]]);
const context = { weekStart, members, recipes, preferences: new Map(), interests: new Set(), recentRecipeIds: new Set(), cookedRecipeIds: new Set(), exclusions: [], ingredients, kept: [] };
const inputs = { cookingSessions: 4, variety: null, maxNewRecipes: null, maxEffort: null, avoidRecipeIds: [] };
const emptyState = () => ({ weekId: 'w', weekStart, assignments: [], events: [], allocations: [] });
async function exerciseAdoption(content, state = emptyState()) {
  const sql = [];
  const proposal = { id: 'proposal', week_id: 'w', status: 'open', content, content_hash: hashOf(content), base_accepted_choice_revision: 0 };
  const week = { id: 'w', weekStart, acceptedChoiceRevision: 0 };
  const db = { async query(q, params = []) {
    sql.push({ sql: q.replace(/\s+/g, ' ').trim(), params });
    if (q.startsWith('SELECT * FROM proposals')) return { rowCount: 1, rows: [proposal] };
    if (q.startsWith('SELECT id FROM weeks')) return { rowCount: 1, rows: [{ id: 'w' }] };
    if (q.includes('RETURNING accepted_choice_revision')) return { rowCount: 1, rows: [{ accepted_choice_revision: 1 }] };
    return { rowCount: 1, rows: [] };
  } };
  const P = loader({
    [path.join(root, 'src/server/commands/framework.ts')]: { Reject, runCommand: async (_a, _n, _id, _p, handler) => handler(db) },
    [path.join(root, 'src/server/queries/load.ts')]: { loadPlanState: async () => state, loadMembers: async () => members, loadRecipeVersions: async () => new Map(recipes.map(r => [r.id, r])), loadExclusions: async () => [], loadIngredients: async () => ingredients, weekById: async () => week },
    [path.join(root, 'src/server/env.ts')]: { nowInstant: () => new Date('2026-10-12T12:00:00Z') },
    [path.join(root, 'src/server/groceries/recompute.ts')]: {},
  })('src/server/commands/plan.ts');
  const result = await P.adoptWeekProposalCommand(actor, 'review-adopt', { proposalId: 'proposal', reviewedHash: proposal.content_hash, expectedAcceptedChoiceRevision: 0 });
  return { result, sql };
}
function requestInput() {
  return {
    events: [], ingredients: new Map([['milk', { key: 'milk', name: 'Milk' }]]),
    requests: [{ id: 'req-milk', ingredientKey: 'milk', text: 'Milk', kind: 'usual', packages: 1, contributors: [{ memberId: 'jon', name: 'Jon', taps: 1 }] }],
    availability: [], products: new Map([['milk', { product: { id: 'p-milk', ref: 'milk-1', name: 'Milk', ingredientKey: 'milk', packageQty: '1', packageUnit: 'each', variableWeight: false, fixture: true, retailer: 'simulated' }, price: { id: 'price', amountMinor: 400, currency: 'USD', kind: 'manual', source: 'probe', observedAt: '2026-10-12T00:00:00Z' } }]]),
    batches: [], order: null, approvals: [], budget: { scope: null, limitMinor: null, firm: false, currency: 'USD' }, today: weekStart,
  };
}
const observations = [];
function record(id, description, data) { observations.push({ id, description, actual: data }); }
(async () => {
  // 1. The actual generator can produce no meals. The actual adoption handler accepts it.
  const empty = generateProposal({ ...context, recipes: [] }, inputs);
  assert.equal(empty.content.nights.filter(n => n.kind === 'open').length, 7);
  const adoptedEmpty = await exerciseAdoption(empty.content);
  assert.equal(adoptedEmpty.result.status, 'accepted');
  record('P01', 'An empty seven-open-night proposal reaches accepted adoption handler outcome.', { openNights: 7, handlerStatus: adoptedEmpty.result.status, assignmentWriteCount: adoptedEmpty.sql.filter(x => x.sql.startsWith('INSERT INTO assignments')).length, note: 'Recording SQL double; not a committed PostgreSQL test.' });

  // 2. A protected leftover does not protect its originating cooking event in full proposals.
  const originalEvent = { id: 'wed-cook', recipeVersionId: recipes[0].id, status: 'scheduled', cookNight: days[2], revision: 1 };
  const allocs = [days[2], days[3]].flatMap(night => members.map(m => ({ cookingEventId: originalEvent.id, memberId: m.id, kind: 'dinner', night, componentPortions: { main: '1' } })));
  const kept = [{ night: days[3], kind: 'leftover', recipeVersionId: recipes[0].id, eventId: originalEvent.id, cookNight: days[2], allocations: allocs }];
  const generated = generateProposal({ ...context, kept }, inputs);
  const keptThursday = generated.content.nights.find(n => n.night === days[3]);
  assert.equal(keptThursday.eventKey, 'keep:wed-cook');
  assert(!generated.content.events.some(e => e.key === 'keep:wed-cook'));
  const adoptedLocked = await exerciseAdoption(generated.content, { ...emptyState(), events: [originalEvent], allocations: allocs });
  const retiresSource = adoptedLocked.sql.some(x => x.sql.startsWith("UPDATE cooking_events SET status='retired'") && x.params[0] === originalEvent.id);
  assert(retiresSource);
  record('P02', 'Whole-week proposal retains locked Thursday label but omits and retires Wednesday source.', { thursdayEventKey: keptThursday.eventKey, sourceIncluded: false, sourceRetirementRequested: retiresSource, handlerStatus: adoptedLocked.result.status });

  // 3. Placing a deferred dinner never checks current exclusions in computeOperation.
  const deferred = { ...originalEvent, id: 'deferred', status: 'deferred', cookNight: null };
  const state = { ...emptyState(), events: [deferred], assignments: days.map((night, i) => ({ id: 'a' + i, night, kind: 'open', cookingEventId: null, locked: false, revision: 1, reason: null })) };
  const exclusions = [{ memberId: null, term: 'fish' }];
  const op = computeOperation(state, { type: 'place', eventId: 'deferred', toNight: days[4] }, { members, recipes: new Map(recipes.map(r => [r.id, r])), exclusions, ingredients });
  const expectedCheck = checkRecipe(recipes[0], members.map(m => m.id), exclusions, ingredients);
  assert.equal(expectedCheck.status, 'violated'); assert.equal(op.blockers.length, 0);
  record('P03', 'Deferred placement creates a scheduled dinner that fails the same module\'s exclusion validator.', { recipeConstraint: expectedCheck.status, operationBlockers: op.blockers, newDinnerKind: op.state.assignments[4].kind });

  // 4. An acknowledged post-order batch is disregarded and the same request becomes sendable again.
  const before = requestInput();
  const batch = { id: 'new-milk-batch', status: 'acknowledged', lines: [{ ingredientKey: 'milk', packages: 1 }] };
  const withoutOrder = computeProjection({ ...before, batches: [batch] });
  const withOrder = computeProjection({ ...before, batches: [batch], order: { id: 'prior-order', contentsKnown: true, pickupAt: '2026-10-12T12:00:00Z', pickupDate: weekStart, lines: [{ id: 'rice-order-line', ingredientKey: 'rice', name: 'Rice', packages: 1 }], receipts: [] } });
  assert.equal(withoutOrder.lines.find(l => l.key === 'milk').toSend, 0);
  const milk = withOrder.lines.find(l => l.key === 'milk'); assert.equal(milk.toSend, 1); assert.equal(milk.sent, 0);
  record('P04', 'The same acknowledged batch counts before order confirmation but is ignored once any order exists.', { beforeConfirmation: { sent: 1, toSend: 0 }, afterConfirmation: { sent: milk.sent, toSend: milk.toSend, status: milk.status } });

  // 5. Unknown order contents remove the uncertain-transfer hold from the active projection.
  const u = requestInput();
  u.batches = [{ ...batch, status: 'uncertain' }];
  u.order = { id: 'unknown-order', contentsKnown: false, pickupAt: null, pickupDate: null, lines: [], receipts: [] };
  const up = computeProjection(u); const ul = up.lines.find(l => l.key === 'milk');
  assert.equal(ul.uncertain, 0); assert.equal(ul.toSend, 1);
  u.approvals = [{ id: 'fresh-approval', ingredientKey: 'milk', productId: 'p-milk', packages: 1, lineFingerprint: ul.fingerprint }];
  const approvedUnknown = computeProjection(u);
  assert.equal(approvedUnknown.ready, true);
  record('P05', 'Confirming contents unknown allows an unresolved uncertain request to become ready for a fresh send.', { uncertainShown: ul.uncertain, toSend: ul.toSend, readyAfterFreshApproval: approvedUnknown.ready, blockers: approvedUnknown.readyBlockers });

  // 6. A substituted order line is counted as available original-ingredient supply.
  const sub = requestInput();
  sub.order = { id: 'order-sub', contentsKnown: true, pickupAt: null, pickupDate: null, lines: [{ id: 'milk-line', ingredientKey: 'milk', name: 'Milk', packages: 1 }], receipts: [{ orderLineId: 'milk-line', state: 'substituted', packages: 1 }] };
  const sr = computeProjection(sub).lines.find(l => l.key === 'milk');
  assert.equal(sr.toSend, 0); assert.equal(sr.received, 0); assert.equal(sr.unresolved.length, 0);
  record('P06', 'Substitution with no validated replacement identity suppresses original demand.', { toSend: sr.toSend, received: sr.received, status: sr.status, unresolved: sr.unresolved });

  // 7. Have enough records a new server quantity, not a bound viewed quantity.
  const sql = [];
  const db = { async query(q, params = []) {
    sql.push({ sql: q.replace(/\s+/g, ' ').trim(), params });
    if (q.startsWith('SELECT line FROM requirement_lines')) return { rows: [{ line: { key: 'chicken', name: 'Chicken', meal: { quantity: '3000', unit: 'g' } } }], rowCount: 1 };
    return { rows: [], rowCount: 1 };
  } };
  const G = loader({
    [path.join(root, 'src/server/commands/framework.ts')]: { Reject, runCommand: async (_a, _n, _id, _p, handler) => handler(db) },
    [path.join(root, 'src/server/groceries/recompute.ts')]: { ensureCycle: async () => 'cycle' },
    [path.join(root, 'src/server/queries/load.ts')]: { weekById: async () => ({ id: 'w' }) },
  })('src/server/commands/groceries.ts');
  const result = await G.recordAvailabilityCommand(actor, 'have-enough-old-view', { weekId: 'w', ingredientKey: 'chicken', state: 'enough' });
  const ins = sql.find(x => x.sql.startsWith('INSERT INTO availability_observations'));
  assert.equal(ins.params[6], '3000'); assert.equal(result.status, 'accepted');
  record('P07', 'Have enough submitted from an old 1000 g screen records 3000 g after concurrent demand increase.', { displayedToReviewer: '1000 g (scenario precondition)', currentServerDemand: '3000 g', amountRecordedAsReviewed: ins.params[6] + ' ' + ins.params[7], handlerStatus: result.status });

  // 8. Moving a cooking event does not move or invalidate a reserved earlier lunch.
  const wed = { ...originalEvent };
  const moveState = { ...emptyState(), events: [wed], assignments: days.map((night, i) => ({ id: 'm' + i, night, kind: i === 2 ? 'cook' : 'open', cookingEventId: i === 2 ? wed.id : null, locked: false, revision: 1, reason: null })), allocations: [...members.map(m => ({ cookingEventId: wed.id, memberId: m.id, kind: 'dinner', night: days[2], componentPortions: { main: '1' } })), { cookingEventId: wed.id, memberId: 'jon', kind: 'lunch', night: days[3], componentPortions: { main: '1' } }] };
  const moved = computeOperation(moveState, { type: 'move', assignmentId: 'm2', toNight: days[4] }, { members, recipes: new Map(recipes.map(r => [r.id, r])), exclusions: [], ingredients });
  assert.equal(moved.blockers.length, 0);
  const lunch = moved.state.allocations.find(a => a.kind === 'lunch');
  assert(lunch.night < moved.state.events[0].cookNight);
  record('P08', 'Moving Wednesday cooking to Friday leaves a reserved Thursday lunch before its source.', { cookNight: moved.state.events[0].cookNight, lunchNight: lunch.night, blockers: moved.blockers, consequences: moved.consequences });

  // 9. Source-level display check: screenshot's $0 known issue is fixed in the final bundle.
  const F = L('src/ui/format.ts');
  const priceLabel = F.costView({ knownMinor: 0, unknownCount: 12, complete: false, currency: 'USD' });
  assert.equal(priceLabel, 'unknown — 12 unpriced');
  record('P09', 'Final formatter does not display zero as the estimate when everything is unpriced.', { priceLabel });
  assert.equal(decimalCalls, 0);
  console.log(JSON.stringify({ sourceRoot: root, method: 'Actual TypeScript source; recording SQL doubles; no database, no UI runtime, no decimal arithmetic; reproduction checks assert the observed defects, not contract compliance.', decimalOperations: decimalCalls, observations }, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
