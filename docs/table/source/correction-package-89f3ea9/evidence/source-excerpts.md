# Table — source excerpts for independent review

Commit: `89f3ea9b5e057c5e57928e7978dda3d23ad4d750`

Line numbers below are actual source-file line numbers, not file-search citation markers. These excerpts are read from the supplied Git bundle.

## `src/server/commands/plan.ts`

SHA-256: `e031becdd6832423e2031fdffd0a1157d9986b7ee03bfca10751dabbaca9a513`

### Lines 195–284
```text
195:   reviewedHash: string;
196:   expectedAcceptedChoiceRevision: number;
197: }
198: 
199: export function adoptWeekProposalCommand(actor: Actor, operationId: string, p: AdoptPayload) {
200:   return runCommand(actor, "AdoptWeekProposal", operationId, p, async (c) => {
201:     const pr = await c.query("SELECT * FROM proposals WHERE id=$1 AND household_id=$2", [p.proposalId, actor.householdId]);
202:     if (!pr.rowCount) throw new Reject("not_found", "Proposal not found");
203:     const proposal = pr.rows[0];
204:     if (proposal.content_hash !== p.reviewedHash) throw new Reject("proposal_changed", "This is not the proposal you reviewed. Nothing was adopted.");
205:     if (proposal.status !== "open") throw new Reject("proposal_closed", `This proposal is ${proposal.status}. Nothing was adopted.`);
206:     const week = await lockedWeekForUpdate(c, actor.householdId, proposal.week_id);
207:     if (week.acceptedChoiceRevision !== p.expectedAcceptedChoiceRevision || week.acceptedChoiceRevision !== proposal.base_accepted_choice_revision) {
208:       const changes = await c.query(
209:         `SELECT ce.summary, ce.accepted_choice_revision, m.display_name FROM change_events ce LEFT JOIN members m ON m.id=ce.actor_member_id
210:          WHERE ce.household_id=$1 AND ce.summary->>'weekId' = $2 AND ce.accepted_choice_revision > $3 ORDER BY ce.seq`,
211:         [actor.householdId, week.id, Math.min(p.expectedAcceptedChoiceRevision, proposal.base_accepted_choice_revision)],
212:       );
213:       throw new Reject("stale_week", "The accepted week changed after this proposal was made. Adoption stopped; review the current week.", {
214:         currentAcceptedChoiceRevision: week.acceptedChoiceRevision,
215:         reviewedAcceptedChoiceRevision: p.expectedAcceptedChoiceRevision,
216:         newerChanges: changes.rows.map((r) => ({ by: r.display_name, text: r.summary.text, revision: r.accepted_choice_revision })),
217:       });
218:     }
219:     const content: ProposalContent = proposal.content;
220:     const state = await loadPlanState(c, week);
221:     const members = await loadMembers(c, actor.householdId);
222:     const rvIds = content.events.map((e) => e.recipeVersionId);
223:     const recipes = await loadRecipeVersions(c, actor.householdId, rvIds);
224:     const exclusions = await loadExclusions(c, actor.householdId);
225:     const ingredients = await loadIngredients(c, actor.householdId);
226:     const problems: string[] = [];
227:     for (const ev of content.events.filter((e) => !e.key.startsWith("keep:"))) {
228:       const rv = recipes.get(ev.recipeVersionId);
229:       if (!rv) {
230:         problems.push("A proposed recipe version no longer exists");
231:         continue;
232:       }
233:       const chk = checkRecipe(rv, members.map((m) => m.id), exclusions, ingredients);
234:       if (chk.status !== "ok") problems.push(`${rv.title}: ${chk.reasons.join("; ")}`);
235:     }
236:     if (problems.length) throw new Reject("constraint_violation", "This proposal no longer passes your hard requirements. Nothing was adopted.", { problems });
237: 
238:     // Locked nights are kept exactly; everything else follows the reviewed proposal.
239:     const keptEventIds = new Set(content.events.filter((e) => e.key.startsWith("keep:")).map((e) => e.key.slice(5)));
240:     for (const ev of state.events) {
241:       if (ev.status === "scheduled" && !keptEventIds.has(ev.id)) {
242:         await c.query("UPDATE cooking_events SET status='retired', revision=revision+1 WHERE id=$1", [ev.id]);
243:       }
244:     }
245:     const keyToId = new Map<string, string>();
246:     for (const ev of content.events) {
247:       if (ev.key.startsWith("keep:")) {
248:         keyToId.set(ev.key, ev.key.slice(5));
249:         continue;
250:       }
251:       const id = randomUUID();
252:       keyToId.set(ev.key, id);
253:       await c.query(
254:         "INSERT INTO cooking_events(id, week_id, household_id, recipe_version_id, status, cook_night) VALUES ($1,$2,$3,$4,'scheduled',$5)",
255:         [id, week.id, actor.householdId, ev.recipeVersionId, ev.cookNight],
256:       );
257:       for (const al of ev.allocations) {
258:         await c.query(
259:           "INSERT INTO allocations(cooking_event_id, household_id, member_id, kind, night, component_portions) VALUES ($1,$2,$3,$4,$5,$6)",
260:           [id, actor.householdId, al.memberId, al.kind, al.night, al.componentPortions],
261:         );
262:       }
263:     }
264:     for (const n of content.nights) {
265:       if (n.kept) continue;
266:       const eventId = n.eventKey ? keyToId.get(n.eventKey)! : null;
267:       await c.query(
268:         `INSERT INTO assignments(week_id, household_id, night, kind, cooking_event_id, locked, reason, updated_by)
269:          VALUES ($1,$2,$3,$4,$5,false,$6,$7)
270:          ON CONFLICT (week_id, night) DO UPDATE SET kind=EXCLUDED.kind, cooking_event_id=EXCLUDED.cooking_event_id, locked=false,
271:            reason=EXCLUDED.reason, revision=assignments.revision+1, updated_by=EXCLUDED.updated_by, updated_at=now()`,
272:         [week.id, actor.householdId, n.night, n.kind, eventId, n.reasons.join(" · "), actor.memberId],
273:       );
274:     }
275:     const rev = await bumpWeek(c, week.id);
276:     await c.query("UPDATE weeks SET adopted_proposal_id=$2, adopted_by=$3, adopted_at=$4 WHERE id=$1", [week.id, proposal.id, actor.memberId, nowInstant()]);
277:     await c.query("UPDATE proposals SET status='adopted' WHERE id=$1", [proposal.id]);
278:     await c.query("UPDATE proposals SET status='superseded' WHERE week_id=$1 AND status='open'", [week.id]);
279:     return {
280:       status: "accepted",
281:       result: { weekId: week.id, acceptedChoiceRevision: rev },
282:       change: { weekId: week.id, summary: { type: "adopt", text: `${actor.displayName} adopted the week` } },
283:       recomputeWeeks: [week.id],
284:     };
```

### Lines 295–326
```text
295: 
296: export async function previewConsequence(c: Db, householdId: string, weekId: string, state: PlanState, res: OperationResult, recipes: Map<string, RecipeVersion>) {
297:   const settings = await loadSettings(c, householdId);
298:   const now = await projectionInput(c, householdId, weekId);
299:   const current = computeProjection(now.input);
300:   const nextRecipes = new Map(recipes);
301:   const after = await projectionInput(c, householdId, weekId, { state: res.state, recipes: nextRecipes });
302:   const next = computeProjection(after.input);
303:   const delta: { name: string; before: string | null; after: string | null; change: string }[] = [];
304:   const keys = new Set([...current.lines.map((l) => l.key), ...next.lines.map((l) => l.key)]);
305:   for (const k of [...keys].sort()) {
306:     const a = current.lines.find((l) => l.key === k);
307:     const b = next.lines.find((l) => l.key === k);
308:     const fa = a?.meal ? `${a.meal.quantity} ${a.meal.unit}` : null;
309:     const fb = b?.meal ? `${b.meal.quantity} ${b.meal.unit}` : null;
310:     if (fa === fb) continue;
311:     const name = (b ?? a)!.name;
312:     const change = !fa ? "now needed for dinner" : !fb ? "no longer needed for dinner" : "dinner amount changes";
313:     delta.push({ name, before: fa, after: fb, change });
314:   }
315:   const additional =
316:     current.pickupSpending.complete && next.pickupSpending.complete
317:       ? { known: true, minor: next.pickupSpending.knownMinor - current.pickupSpending.knownMinor }
318:       : { known: false, minor: null as number | null, unknownCount: next.pickupSpending.unknownCount };
319:   const budgetBlock =
320:     settings.budgetFirm && next.budget.status === "over" && (next.budget.scope === "pickup" ? next.pickupSpending.knownMinor > current.pickupSpending.knownMinor : next.dinnerIngredientCost.knownMinor > current.dinnerIngredientCost.knownMinor)
321:       ? `This would put the ${next.budget.scope === "pickup" ? "pickup estimate" : "dinner ingredient cost"} over your firm budget.`
322:       : null;
323:   return { groceryDelta: delta, additionalBasketCost: additional, baseline: "current accepted week", budgetBlock, nextBudget: next.budget };
324: }
325: 
326: export function createPreviewCommand(actor: Actor, operationId: string, p: PreviewPayload) {
```

### Lines 365–397
```text
365:   );
366:   return r.rows.map((x) => ({ night: x.night, by: x.display_name, now: x.kind === "cook" ? x.title : x.kind === "leftover" ? `Leftovers of ${x.title}` : x.kind, at: x.updated_at }));
367: }
368: 
369: export function applyPlanChangeCommand(actor: Actor, operationId: string, p: { previewId: string; reviewedHash: string }) {
370:   return runCommand(actor, "ApplyPlanChange", operationId, p, async (c) => {
371:     const pr = await c.query("SELECT * FROM previews WHERE id=$1 AND household_id=$2 AND created_by=$3", [p.previewId, actor.householdId, actor.memberId]);
372:     if (!pr.rowCount) throw new Reject("not_found", "Preview not found");
373:     const preview = pr.rows[0];
374:     if (preview.status !== "open") throw new Reject("preview_closed", `This preview is ${preview.status}.`);
375:     if (preview.content_hash !== p.reviewedHash) throw new Reject("preview_changed", "This is not the preview you reviewed. Nothing changed.");
376:     const week = await lockedWeekForUpdate(c, actor.householdId, preview.week_id);
377:     const state = await loadPlanState(c, week);
378:     const stale = closureStale({ assignments: preview.base.assignments, events: preview.base.events }, state);
379:     if (stale.stale) {
380:       throw new Reject("stale_preview", "A newer decision changed this night or what it depends on. Review it again; nothing was changed.", {
381:         changed: await staleDetails(c, state, stale.changed),
382:       });
383:     }
384:     const op: PlanOperation = preview.operation;
385:     const ctx = await context(c, actor.householdId, state, "recipeVersionId" in op ? [op.recipeVersionId] : []);
386:     const res = computeOperation(state, op, ctx);
387:     if (res.contentHash !== preview.content_hash) {
388:       throw new Reject("stale_preview", "Applying this now would produce something different from what you reviewed. Review it again.");
389:     }
390:     if (res.blockers.length) throw new Reject(res.blockers[0].code, res.blockers.map((b) => b.message).join(" "), { blockers: res.blockers });
391:     const cons = await previewConsequence(c, actor.householdId, week.id, state, res, ctx.recipes);
392:     if (cons.budgetBlock) {
393:       throw new Reject("constraint_violation", `${cons.budgetBlock} Combined with the current week, this is not applied; firm limits are never relaxed silently.`);
394:     }
395:     await persistOperation(c, actor, state, res);
396:     const rev = await bumpWeek(c, week.id);
397:     await c.query("UPDATE previews SET status='applied', resolved_at=now() WHERE id=$1", [preview.id]);
```

### Lines 418–450
```text
418:       status: "accepted",
419:       result: { acceptedChoiceRevision: rev },
420:       change: { weekId: row.week_id, summary: { type: "lock", text: `${actor.displayName} ${p.locked ? "locked" : "unlocked"} ${dayName(row.night)}` } },
421:       recomputeWeeks: [row.week_id],
422:     };
423:   });
424: }
425: 
426: export function setPlateCommand(
427:   actor: Actor,
428:   operationId: string,
429:   p: { eventId: string; expectedEventRevision: number; memberId: string; night: string; kind: "dinner" | "lunch"; componentPortions: Record<string, string> | null },
430: ) {
431:   return runCommand(actor, "SetPlate", operationId, p, async (c) => {
432:     const e = await c.query("SELECT week_id FROM cooking_events WHERE id=$1 AND household_id=$2", [p.eventId, actor.householdId]);
433:     if (!e.rowCount) throw new Reject("not_found", "Cooking event not found");
434:     const m = await c.query("SELECT 1 FROM members WHERE id=$1 AND household_id=$2", [p.memberId, actor.householdId]);
435:     if (!m.rowCount) throw new Reject("not_found", "Member not found");
436:     const week = await lockedWeekForUpdate(c, actor.householdId, e.rows[0].week_id);
437:     const state = await loadPlanState(c, week);
438:     const ev = state.events.find((x) => x.id === p.eventId);
439:     if (!ev || ev.revision !== p.expectedEventRevision) throw new Reject("stale_target", "This dinner changed since you looked. Review it again.");
440:     const ctx = await context(c, actor.householdId, state);
441:     const res = computeOperation(state, { type: "plate", eventId: p.eventId, memberId: p.memberId, night: p.night, kind: p.kind, componentPortions: p.componentPortions }, ctx);
442:     if (res.blockers.length) throw new Reject(res.blockers[0].code, res.blockers.map((b) => b.message).join(" "));
443:     await persistOperation(c, actor, state, res);
444:     const rev = await bumpWeek(c, week.id);
445:     return {
446:       status: "accepted",
447:       result: { acceptedChoiceRevision: rev },
448:       change: { weekId: week.id, summary: { type: "plate", text: `${actor.displayName}: ${res.consequences[0]}` } },
449:       recomputeWeeks: [week.id],
450:     };
```

## `src/domain/planning/proposal.ts`

SHA-256: `aeb7e12ac1e8c46f539092b1bb07a6d31b4a73545cd4277868b016c356a05bc3`

### Lines 151–214
```text
151:     cooksNeeded = chosen.length;
152:   }
153:   // Leftover-friendly cooks first so leftovers can follow them; then by title for stable order.
154:   const queue = chosen.slice();
155: 
156:   const out: ProposalNight[] = [];
157:   const events: ProposalEvent[] = [];
158:   let k = 0;
159:   let leftoversLeft = openNights.length - cooksNeeded;
160:   let lastCook: { event: ProposalEvent; rv: RecipeVersion; leftovers: number } | null = null;
161:   for (const night of nights) {
162:     const kept = keptByNight.get(night);
163:     if (kept) {
164:       const ke = kept.eventId ? events.find((e) => e.key === `keep:${kept.eventId}`) : undefined;
165:       if (kept.kind === "cook" && kept.eventId && kept.recipeVersionId && !ke) {
166:         events.push({ key: `keep:${kept.eventId}`, recipeVersionId: kept.recipeVersionId, cookNight: kept.cookNight ?? night, allocations: kept.allocations });
167:       }
168:       out.push({
169:         night,
170:         kind: kept.kind,
171:         eventKey: kept.eventId ? `keep:${kept.eventId}` : null,
172:         recipeVersionId: kept.recipeVersionId,
173:         locked: true,
174:         kept: true,
175:         reasons: ["Locked — kept as accepted"],
176:       });
177:       lastCook = null;
178:       continue;
179:     }
180:     // One leftover night per cooking by default; a second only when no cook remains.
181:     const canLeftover = lastCook && lastCook.rv.leftoverFriendly && lastCook.leftovers < (queue.length === 0 ? 2 : 1) && leftoversLeft > 0;
182:     if (canLeftover) {
183:       lastCook!.leftovers += 1;
184:       leftoversLeft -= 1;
185:       for (const m of memberIds) {
186:         lastCook!.event.allocations.push({ memberId: m, kind: "dinner", night, componentPortions: defaultPlate(lastCook!.rv) });
187:       }
188:       out.push({
189:         night,
190:         kind: "leftover",
191:         eventKey: lastCook!.event.key,
192:         recipeVersionId: lastCook!.rv.id,
193:         locked: false,
194:         kept: false,
195:         reasons: [`Leftovers of ${dayName(lastCook!.event.cookNight)}'s ${lastCook!.rv.title} (one cooking covers both nights)`],
196:       });
197:       continue;
198:     }
199:     const rv = queue.shift();
200:     if (!rv) {
201:       unresolved.push(`${dayName(night)} has no dinner: no eligible recipe or leftover source remains.`);
202:       out.push({ night, kind: "open", eventKey: null, recipeVersionId: null, locked: false, kept: false, reasons: ["Needs a decision"] });
203:       lastCook = null;
204:       continue;
205:     }
206:     const ev: ProposalEvent = {
207:       key: `p:${k++}`,
208:       recipeVersionId: rv.id,
209:       cookNight: night,
210:       allocations: memberIds.map((m) => ({ memberId: m, kind: "dinner" as const, night, componentPortions: defaultPlate(rv) })),
211:     };
212:     events.push(ev);
213:     out.push({ night, kind: "cook", eventKey: ev.key, recipeVersionId: rv.id, locked: false, kept: false, reasons: reasonsFor(rv, ctx) });
214:     lastCook = { event: ev, rv, leftovers: 0 };
```

## `src/domain/planning/operations.ts`

SHA-256: `541856a6557c106f7895573e1b6151a0f1cdd871cbc14e69e490c063b7be9559`

### Lines 188–251
```text
188:       const dest = asgAt(op.toNight);
189:       if (!target || !dest || target.kind !== "cook" || !target.cookingEventId) {
190:         blockers.push({ code: "not_found", message: "Only a cooking night can be moved, to a night in this week" });
191:         break;
192:       }
193:       touch(target);
194:       touch(dest);
195:       const e = ev(target.cookingEventId)!;
196:       touchE(e);
197:       if (target.locked) blockers.push({ code: "locked", message: `${dayName(target.night)} is locked.` });
198:       if (dest.locked) blockers.push({ code: "locked", message: `${dayName(dest.night)} is locked and will not be displaced.` });
199:       if (dest.kind === "cook" || dest.kind === "leftover") {
200:         blockers.push({ code: "destination_occupied", message: `${dayName(dest.night)} already has a dinner. Change it first; Table never stacks two dinners on one night.` });
201:       }
202:       const deps = dependents(e.id);
203:       deps.forEach(touch);
204:       for (const al of s.allocations) {
205:         if (al.cookingEventId === e.id && al.night === target.night && al.kind === "dinner") al.night = op.toNight;
206:       }
207:       for (const d of deps) {
208:         if (d.night <= op.toNight) {
209:           if (d.locked) blockers.push({ code: "locked_dependent", message: `${dayName(d.night)} is locked and would come before the cooking.` });
210:           dropAllocations(e.id, d.night);
211:           openNight(d, "leftovers cannot come before the cooking");
212:         }
213:       }
214:       e.cookNight = op.toNight;
215:       e.revision += 1;
216:       dest.kind = "cook";
217:       dest.cookingEventId = e.id;
218:       dest.reason = "Moved deliberately";
219:       target.kind = "open";
220:       target.cookingEventId = null;
221:       target.reason = null;
222:       consequences.unshift(`${title(e.recipeVersionId)} moves from ${dayName(target.night)} to ${dayName(dest.night)}. No second copy of its ingredients is bought. ${dayName(target.night)} becomes open.`);
223:       break;
224:     }
225:     case "place": {
226:       const e = ev(op.eventId);
227:       const dest = asgAt(op.toNight);
228:       if (!e || e.status !== "deferred" || !dest) {
229:         blockers.push({ code: "not_found", message: "Deferred dinner or night not found" });
230:         break;
231:       }
232:       touchE(e);
233:       touch(dest);
234:       if (dest.locked) blockers.push({ code: "locked", message: `${dayName(dest.night)} is locked.` });
235:       if (dest.kind === "cook" || dest.kind === "leftover") blockers.push({ code: "destination_occupied", message: `${dayName(dest.night)} already has a dinner.` });
236:       const rv = ctx.recipes.get(e.recipeVersionId)!;
237:       e.status = "scheduled";
238:       e.cookNight = op.toNight;
239:       e.revision += 1;
240:       s.allocations.push(...dinnerPlates(e.id, op.toNight, rv));
241:       dest.kind = "cook";
242:       dest.cookingEventId = e.id;
243:       dest.reason = "Deferred dinner placed deliberately";
244:       consequences.push(`${rv.title} is scheduled on ${dayName(op.toNight)}.`);
245:       break;
246:     }
247:     case "set_kind": {
248:       const target = asg(op.assignmentId);
249:       if (!target) {
250:         blockers.push({ code: "not_found", message: "Night not found" });
251:         break;
```

## `src/server/commands/groceries.ts`

SHA-256: `20470a2dadfab5d117fd128e87ab1000ef8c501703c32e6d7d0f9bb62d9ea50a`

### Lines 30–97
```text
30:  *  usual taps merge with contributors kept; an explicit extra stays extra. */
31: export function captureHouseholdNeedCommand(actor: Actor, operationId: string, p: CapturePayload) {
32:   return runCommand(actor, "CaptureHouseholdNeed", operationId, p, async (c) => {
33:     const text = String(p.text ?? "").trim().slice(0, 200);
34:     if (!text) throw new Reject("invalid", "Say what you need");
35:     if (!["week", "groceries", "cook", "household"].includes(p.from)) throw new Reject("invalid", "Unknown capture point");
36:     const cycleId = await cycleFor(c, actor.householdId, p.weekId);
37:     let key = p.ingredientKey ?? null;
38:     if (key) {
39:       const ok = await c.query("SELECT 1 FROM ingredients WHERE household_id=$1 AND key=$2", [actor.householdId, key]);
40:       if (!ok.rowCount) throw new Reject("not_found", "Unknown ingredient");
41:     } else {
42:       const m = await c.query("SELECT key FROM ingredients WHERE household_id=$1 AND (lower(name)=lower($2) OR key=lower($2)) LIMIT 1", [actor.householdId, text]);
43:       key = m.rows[0]?.key ?? null; // unfamiliar entries stay text until review
44:     }
45:     let kind = p.kind ?? "usual";
46:     let packages = p.packages ?? null;
47:     if (packages !== null && (!Number.isInteger(packages) || packages < 1 || packages > 50)) throw new Reject("invalid", "Packages must be 1-50");
48: 
49:     // After a confirmed order, look for the item in that order before creating a duplicate.
50:     const order = await c.query(
51:       `SELECT ol.name, ol.packages FROM orders o JOIN order_lines ol ON ol.order_id=o.id WHERE o.cycle_id=$1 AND ol.ingredient_key=$2`,
52:       [cycleId, key],
53:     );
54:     if (key && order.rowCount && kind === "usual") {
55:       if (!p.addAnother) {
56:         throw new Reject("already_in_order", `${order.rows[0].name} is already in your confirmed order (${order.rows[0].packages}). Add another?`, {
57:           inOrder: order.rows.map((r) => ({ name: r.name, packages: r.packages })),
58:         });
59:       }
60:       kind = "extra";
61:       packages = packages ?? 1;
62:     }
63: 
64:     let requestId: string;
65:     let merged = false;
66:     if (kind === "usual" && key) {
67:       const existing = await c.query("SELECT id FROM household_requests WHERE cycle_id=$1 AND ingredient_key=$2 AND kind='usual' AND state='active' LIMIT 1", [cycleId, key]);
68:       if (existing.rowCount) {
69:         requestId = existing.rows[0].id;
70:         merged = true;
71:       } else {
72:         const ins = await c.query(
73:           "INSERT INTO household_requests(household_id, cycle_id, ingredient_key, text, kind, packages, captured_from) VALUES ($1,$2,$3,$4,'usual',$5,$6) RETURNING id",
74:           [actor.householdId, cycleId, key, text, packages, p.from],
75:         );
76:         requestId = ins.rows[0].id;
77:       }
78:     } else {
79:       const ins = await c.query(
80:         "INSERT INTO household_requests(household_id, cycle_id, ingredient_key, text, kind, packages, captured_from) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
81:         [actor.householdId, cycleId, key, text, kind, kind === "extra" ? packages ?? 1 : packages, p.from],
82:       );
83:       requestId = ins.rows[0].id;
84:     }
85:     await c.query(
86:       `INSERT INTO request_contributors(request_id, member_id) VALUES ($1,$2)
87:        ON CONFLICT (request_id, member_id) DO UPDATE SET taps = request_contributors.taps + 1`,
88:       [requestId, actor.memberId],
89:     );
90:     return {
91:       status: "accepted",
92:       result: { requestId, merged, matchedIngredient: key, kind },
93:       change: { weekId: p.weekId, summary: { type: "request", text: `${actor.displayName} added ${text}${kind === "extra" ? " (extra)" : ""}` } },
94:       recomputeWeeks: [p.weekId],
95:     };
96:   });
97: }
```

### Lines 129–153
```text
129: export function recordAvailabilityCommand(
130:   actor: Actor,
131:   operationId: string,
132:   p: { weekId: string; ingredientKey: string; state: "enough" | "some" | "need"; quantity?: string | null; unit?: string | null },
133: ) {
134:   return runCommand(actor, "RecordAvailability", operationId, p, async (c) => {
135:     if (!["enough", "some", "need"].includes(p.state)) throw new Reject("invalid", "Unknown availability");
136:     if (p.quantity != null && !/^\d+(\.\d+)?$/.test(String(p.quantity))) throw new Reject("invalid", "Quantity must be a number");
137:     const cycleId = await cycleFor(c, actor.householdId, p.weekId);
138:     const line = (await currentLines(c, cycleId)).find((l) => l.key === p.ingredientKey);
139:     if (!line) throw new Reject("not_found", "That item is not on this week's list");
140:     await c.query(
141:       `INSERT INTO availability_observations(household_id, cycle_id, ingredient_key, state, quantity, unit, reviewed_demand, reviewed_unit, member_id)
142:        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
143:       [
144:         actor.householdId, cycleId, p.ingredientKey, p.state, p.quantity ?? null, p.unit ? normalizeUnit(p.unit) : null,
145:         line.meal?.quantity ?? null, line.meal?.unit ?? null, actor.memberId,
146:       ],
147:     );
148:     const label = { enough: "Have enough", some: "Have some", need: "Need" }[p.state];
149:     return {
150:       status: "accepted", result: {},
151:       change: { weekId: p.weekId, summary: { type: "availability", text: `${actor.displayName}: ${line.name} — ${label}` } },
152:       recomputeWeeks: [p.weekId],
153:     };
```

### Lines 179–214
```text
179:       ]);
180:     }
181:     await c.query(
182:       `INSERT INTO product_mappings(household_id, ingredient_key, product_id, decided_by) VALUES ($1,$2,$3,$4)
183:        ON CONFLICT (household_id, ingredient_key) DO UPDATE SET product_id=EXCLUDED.product_id, decided_by=EXCLUDED.decided_by, decided_at=now(), suitable=true`,
184:       [actor.householdId, p.ingredientKey, productId, actor.memberId],
185:     );
186:     return {
187:       status: "accepted", result: { productId, unitKnown: unit ? KNOWN_UNITS.includes(unit) : null },
188:       change: { weekId: p.weekId, summary: { type: "product", text: `${actor.displayName} chose ${name}` } },
189:       recomputeWeeks: [p.weekId],
190:     };
191:   });
192: }
193: 
194: export function chooseProductCommand(actor: Actor, operationId: string, p: { weekId: string; ingredientKey: string; productId: string }) {
195:   return runCommand(actor, "ChooseProduct", operationId, p, async (c) => {
196:     const pr = await c.query("SELECT name FROM products WHERE id=$1 AND household_id=$2 AND ingredient_key=$3", [p.productId, actor.householdId, p.ingredientKey]);
197:     if (!pr.rowCount) throw new Reject("not_found", "Product not found for that ingredient");
198:     await c.query(
199:       `INSERT INTO product_mappings(household_id, ingredient_key, product_id, decided_by) VALUES ($1,$2,$3,$4)
200:        ON CONFLICT (household_id, ingredient_key) DO UPDATE SET product_id=EXCLUDED.product_id, decided_by=EXCLUDED.decided_by, decided_at=now(), suitable=true`,
201:       [actor.householdId, p.ingredientKey, p.productId, actor.memberId],
202:     );
203:     return { status: "accepted", result: {}, change: { weekId: p.weekId, summary: { type: "product", text: `${actor.displayName} chose ${pr.rows[0].name}` } }, recomputeWeeks: [p.weekId] };
204:   });
205: }
206: 
207: export function recordPriceCommand(actor: Actor, operationId: string, p: { weekId: string; productId: string; amountMinor: number }) {
208:   return runCommand(actor, "RecordPrice", operationId, p, async (c) => {
209:     if (!Number.isInteger(p.amountMinor) || p.amountMinor < 0) throw new Reject("invalid", "Price must be whole cents");
210:     const pr = await c.query("SELECT name FROM products WHERE id=$1 AND household_id=$2", [p.productId, actor.householdId]);
211:     if (!pr.rowCount) throw new Reject("not_found", "Product not found");
212:     await c.query("INSERT INTO price_observations(household_id, product_id, amount_minor, source) VALUES ($1,$2,$3,'manual')", [actor.householdId, p.productId, p.amountMinor]);
213:     return { status: "accepted", result: {}, change: { weekId: p.weekId, summary: { type: "price", text: `${actor.displayName} entered a price for ${pr.rows[0].name}` } }, recomputeWeeks: [p.weekId] };
214:   });
```

### Lines 247–302
```text
247: export function confirmOrderCommand(
248:   actor: Actor,
249:   operationId: string,
250:   p: { weekId: string; contentsKnown: boolean; lines?: { ingredientKey: string | null; name: string; packages: number }[]; pickupAt?: string | null; note?: string },
251: ) {
252:   return runCommand(actor, "ConfirmOrder", operationId, p, async (c) => {
253:     const cycleId = await cycleFor(c, actor.householdId, p.weekId);
254:     const existing = await c.query("SELECT 1 FROM orders WHERE cycle_id=$1", [cycleId]);
255:     if (existing.rowCount) throw new Reject("already_confirmed", "An order is already confirmed for this week. Record corrections as receipt observations.");
256:     const lines = p.contentsKnown ? p.lines ?? [] : [];
257:     if (p.contentsKnown && lines.length === 0) throw new Reject("invalid", "List the confirmed contents, or confirm with contents unknown");
258:     for (const l of lines) if (!Number.isInteger(l.packages) || l.packages < 1 || !String(l.name ?? "").trim()) throw new Reject("invalid", "Each line needs a name and whole packages");
259:     const pickup = p.pickupAt ? new Date(p.pickupAt) : null;
260:     if (pickup && Number.isNaN(pickup.getTime())) throw new Reject("invalid", "Pickup time is not a valid time");
261:     const o = await c.query(
262:       "INSERT INTO orders(household_id, cycle_id, confirmed_by, source, contents_known, pickup_at, note) VALUES ($1,$2,$3,'member',$4,$5,$6) RETURNING id",
263:       [actor.householdId, cycleId, actor.memberId, p.contentsKnown, pickup, p.note ?? null],
264:     );
265:     for (const l of lines) {
266:       const prod = l.ingredientKey
267:         ? await c.query("SELECT product_id FROM product_mappings WHERE household_id=$1 AND ingredient_key=$2", [actor.householdId, l.ingredientKey])
268:         : { rows: [] as { product_id: string }[] };
269:       await c.query("INSERT INTO order_lines(order_id, household_id, ingredient_key, product_id, name, packages) VALUES ($1,$2,$3,$4,$5,$6)", [
270:         o.rows[0].id, actor.householdId, l.ingredientKey, prod.rows[0]?.product_id ?? null, l.name.trim(), l.packages,
271:       ]);
272:     }
273:     return {
274:       status: "accepted", result: { orderId: o.rows[0].id },
275:       change: { weekId: p.weekId, summary: { type: "order", text: `${actor.displayName} confirmed the order${p.contentsKnown ? "" : " (contents not listed)"}` } },
276:       recomputeWeeks: [p.weekId],
277:     };
278:   });
279: }
280: 
281: export function recordReceiptCommand(actor: Actor, operationId: string, p: { orderLineId: string; state: "received" | "missing" | "substituted"; packages: number; substituteText?: string }) {
282:   return runCommand(actor, "RecordReceipt", operationId, p, async (c) => {
283:     if (!["received", "missing", "substituted"].includes(p.state)) throw new Reject("invalid", "Unknown receipt state");
284:     const l = await c.query(
285:       `SELECT ol.*, g.week_id FROM order_lines ol JOIN orders o ON o.id=ol.order_id JOIN grocery_cycles g ON g.id=o.cycle_id WHERE ol.id=$1 AND ol.household_id=$2`,
286:       [p.orderLineId, actor.householdId],
287:     );
288:     if (!l.rowCount) throw new Reject("not_found", "Order line not found");
289:     const prior = await c.query("SELECT COALESCE(sum(packages),0)::int AS n FROM receipt_observations WHERE order_line_id=$1", [p.orderLineId]);
290:     if (!Number.isInteger(p.packages) || p.packages < 1 || prior.rows[0].n + p.packages > l.rows[0].packages) {
291:       throw new Reject("invalid", "More packages than the order line holds");
292:     }
293:     await c.query("INSERT INTO receipt_observations(household_id, order_line_id, state, packages, substitute_text, member_id) VALUES ($1,$2,$3,$4,$5,$6)", [
294:       actor.householdId, p.orderLineId, p.state, p.packages, p.substituteText ?? null, actor.memberId,
295:     ]);
296:     return {
297:       status: "accepted", result: {},
298:       change: { weekId: l.rows[0].week_id, summary: { type: "receipt", text: `${actor.displayName}: ${l.rows[0].name} ${p.state}` } },
299:       recomputeWeeks: [l.rows[0].week_id],
300:     };
301:   });
302: }
```

## `src/domain/groceries/projection.ts`

SHA-256: `137f577ea30974ee198b6b0045cccf426108c8e39700bb90517d7089e92f6bf5`

### Lines 258–320
```text
258:       leftAfterMeal = { quantity: left.toDecimalPlaces(2).toString(), unit: mealUnit! };
259:     }
260: 
261:     // 4. History: confirmed order (expected supply), receipts, transfers.
262:     const orderLines = input.order?.lines.filter((ol) => ol.ingredientKey === ingredientKey && ingredientKey) ?? [];
263:     const ordered = orderLines.reduce((a, ol) => a + ol.packages, 0);
264:     const receipts = input.order?.receipts.filter((r) => orderLines.some((ol) => ol.id === r.orderLineId)) ?? [];
265:     const received = receipts.filter((r) => r.state === "received").reduce((a, r) => a + r.packages, 0);
266:     const missing = receipts.filter((r) => r.state === "missing").reduce((a, r) => a + r.packages, 0);
267:     let sent = 0;
268:     let uncertain = 0;
269:     if (!orderActive) {
270:       for (const b of input.batches) {
271:         const n = b.lines.filter((l) => l.ingredientKey === ingredientKey).reduce((a, l) => a + l.packages, 0);
272:         if (b.status === "authorized" || b.status === "dispatch_started" || b.status === "acknowledged") sent += n;
273:         if (b.status === "uncertain") uncertain += n;
274:       }
275:     }
276:     if (uncertain > 0) unresolved.push("A transfer outcome is uncertain — check the retailer cart; Table does not resend automatically");
277:     const coveredByOrder = ordered - missing;
278:     // Expected supply only supports dinners on or after pickup. Unknown pickup is unresolved
279:     // availability, never proof that goods arrive in time.
280:     if (coveredByOrder > 0 && m && input.order) {
281:       const today = input.today ?? "";
282:       const upcoming = [...new Set(m.sources.map((x) => x.cookNight))].filter((n) => n >= today).sort();
283:       const pickup = input.order.pickupDate;
284:       const early = pickup === null ? upcoming : upcoming.filter((n) => n < pickup);
285:       if (early.length) {
286:         const days = early.map(dayName).join(", ");
287:         unresolved.push(
288:           pickup === null
289:             ? `Pickup time not recorded — cannot confirm the ordered ${ing?.name ?? key} arrives before ${days}'s dinner`
290:             : `Ordered ${ing?.name ?? key} is picked up ${dayName(pickup)}; ${days}'s dinner needs it earlier`,
291:         );
292:       }
293:     }
294:     const toSend = packagesNeeded === null ? null : Math.max(0, packagesNeeded - coveredByOrder - sent - uncertain);
295: 
296:     const fingerprint = hashOf({
297:       key,
298:       meal: mealQty ? [mealQty.toDecimalPlaces(6).toString(), mealUnit] : null,
299:       mealUnitConflict,
300:       requests: reqs.map((r) => [r.id, r.kind, r.packages]).sort(),
301:       availability: avail ? avail.id : null,
302:       product: product ? [product.id, product.packageQty, product.packageUnit] : null,
303:       packagesNeeded,
304:       coveredByOrder,
305:       unresolved: unresolved.filter((u) => !u.startsWith("A transfer outcome")),
306:     });
307:     const ap = input.approvals.find((a) => a.ingredientKey === key);
308:     const approval = ap
309:       ? { id: ap.id, packages: ap.packages, valid: ap.lineFingerprint === fingerprint && ap.packages === toSend && ap.productId === product?.id }
310:       : null;
311: 
312:     let status: LineStatus;
313:     if (missing > 0 && toSend && toSend > 0) status = "missing";
314:     else if (toSend === 0 && received > 0 && received >= ordered - missing && ordered > 0) status = "received";
315:     else if (toSend === 0 && coveredByOrder > 0) status = "ordered";
316:     else if (toSend === 0 && uncertain > 0) status = "uncertain";
317:     else if (toSend === 0 && sent > 0) status = "in_cart_transfer";
318:     else if (toSend === 0) status = "nothing_needed";
319:     else if (orderActive && toSend !== null && toSend > 0 && approval?.valid) status = "approved";
320:     else if (orderActive) status = "not_sent_yet";
```

### Lines 362–393
```text
362:   const reviewFingerprint = hashOf(
363:     sendable.map((l) => [l.key, l.fingerprint, l.toSend, l.product?.id ?? null, l.price ? [l.price.id, l.price.amountMinor] : null, l.approval?.valid ? l.approval.id : null]),
364:   );
365:   const payload = sendable
366:     .filter((l) => l.product && l.toSend && l.toSend > 0)
367:     .map((l) => ({ productRef: l.product!.ref, ingredientKey: l.ingredientKey!, packages: l.toSend! }))
368:     .sort((a, b) => a.productRef.localeCompare(b.productRef));
369:   const payloadHash = hashOf(payload);
370: 
371:   const currency = input.budget.currency;
372:   const dinnerIngredientCost = costFrom(lines.filter((l) => l.meal || l.mealUnitConflict).map((l) => l.usageCostMinor), currency);
373:   const pickupSpending = costFrom(lines.filter((l) => l.packagesNeeded !== 0).map((l) => l.pickupCostMinor), currency);
374: 
375:   let budgetStatus: ProjectionResult["budget"]["status"] = "unset";
376:   if (input.budget.scope && input.budget.limitMinor !== null) {
377:     const view = input.budget.scope === "pickup" ? pickupSpending : dinnerIngredientCost;
378:     if (view.knownMinor > input.budget.limitMinor) budgetStatus = "over";
379:     else if (!view.complete) budgetStatus = "unknown";
380:     else budgetStatus = "within";
381:   }
382: 
383:   const readyBlockers: string[] = [];
384:   for (const l of sendable) {
385:     if (l.unresolved.length) readyBlockers.push(`${l.name}: ${l.unresolved[0]}`);
386:     else if (!l.price) readyBlockers.push(`${l.name}: price unknown`);
387:     else if (!l.approval?.valid) readyBlockers.push(`${l.name}: purchase not approved for ${l.toSend} package(s)`);
388:   }
389:   for (const l of lines) if (l.uncertain > 0 && !sendable.includes(l)) readyBlockers.push(`${l.name}: transfer outcome uncertain`);
390:   if (input.budget.firm && budgetStatus === "over") readyBlockers.push("Over your firm budget");
391:   if (input.budget.firm && budgetStatus === "unknown") readyBlockers.push("Firm budget cannot be confirmed while prices are unknown");
392:   if (payload.length === 0) readyBlockers.push("Nothing left to send");
393:   return {
```

## `src/server/groceries/recompute.ts`

SHA-256: `13398d41e3757a0c3229c2670a68954acd917825c95fbc1049a0b46c8c668452`

### Lines 51–110
```text
51:       )
52:     : { rows: [] as Record<string, unknown>[] };
53:   const avail = cycleId
54:     ? await c.query(
55:         `SELECT DISTINCT ON (a.ingredient_key) a.*, m.display_name FROM availability_observations a JOIN members m ON m.id=a.member_id
56:          WHERE a.cycle_id=$1 ORDER BY a.ingredient_key, a.observed_at DESC, a.id DESC`,
57:         [cycleId],
58:       )
59:     : { rows: [] as Record<string, unknown>[] };
60:   const prods = await c.query(
61:     `SELECT pm.ingredient_key, p.*, pr.id AS price_id, pr.amount_minor, pr.currency, pr.price_kind, pr.source AS price_source, pr.observed_at AS price_observed_at
62:      FROM product_mappings pm JOIN products p ON p.id=pm.product_id
63:      LEFT JOIN LATERAL (SELECT * FROM price_observations po WHERE po.product_id=p.id ORDER BY po.observed_at DESC, po.id DESC LIMIT 1) pr ON true
64:      WHERE pm.household_id=$1 AND pm.suitable`,
65:     [householdId],
66:   );
67:   const products: ProjectionInput["products"] = new Map(
68:     prods.rows.map((p) => [
69:       p.ingredient_key,
70:       {
71:         product: {
72:           id: p.id, ref: p.product_ref, name: p.name, ingredientKey: p.ingredient_key, packageQty: p.package_qty, packageUnit: p.package_unit,
73:           variableWeight: p.variable_weight, fixture: p.fixture, retailer: p.retailer,
74:         },
75:         price: p.price_id
76:           ? { id: p.price_id, amountMinor: p.amount_minor, currency: p.currency, kind: p.price_kind, source: p.price_source, observedAt: p.price_observed_at.toISOString() }
77:           : null,
78:       },
79:     ]),
80:   );
81: 
82:   let batches: BatchInput[] = [];
83:   let order: ProjectionInput["order"] = null;
84:   let approvals: ProjectionInput["approvals"] = [];
85:   if (cycleId) {
86:     const statuses = await batchStatuses(c, cycleId);
87:     const bl = await c.query(
88:       "SELECT l.* FROM handoff_batch_lines l JOIN handoff_batches b ON b.id=l.batch_id WHERE b.cycle_id=$1",
89:       [cycleId],
90:     );
91:     batches = [...statuses.entries()].map(([id, status]) => ({
92:       id, status, lines: bl.rows.filter((l) => l.batch_id === id).map((l) => ({ ingredientKey: l.ingredient_key, packages: l.packages })),
93:     }));
94:     const o = await c.query("SELECT * FROM orders WHERE cycle_id=$1 ORDER BY confirmed_at DESC, id LIMIT 1", [cycleId]);
95:     if (o.rowCount) {
96:       const ol = await c.query("SELECT * FROM order_lines WHERE order_id=$1 ORDER BY name", [o.rows[0].id]);
97:       const rec = await c.query("SELECT r.* FROM receipt_observations r JOIN order_lines l ON l.id=r.order_line_id WHERE l.order_id=$1", [o.rows[0].id]);
98:       order = {
99:         id: o.rows[0].id, contentsKnown: o.rows[0].contents_known, pickupAt: o.rows[0].pickup_at?.toISOString() ?? null,
100:         pickupDate: o.rows[0].pickup_at ? localDate(o.rows[0].pickup_at, household.timezone) : null,
101:         lines: ol.rows.map((l) => ({ id: l.id, ingredientKey: l.ingredient_key, name: l.name, packages: l.packages })),
102:         receipts: rec.rows.map((r) => ({ orderLineId: r.order_line_id, state: r.state, packages: r.packages })),
103:       };
104:     }
105:     const ap = await c.query("SELECT * FROM purchase_approvals WHERE cycle_id=$1 AND state='active'", [cycleId]);
106:     approvals = ap.rows.map((a) => ({ id: a.id, ingredientKey: a.ingredient_key, productId: a.product_id, packages: a.packages, lineFingerprint: a.line_fingerprint }));
107:   }
108: 
109:   const events = state.events.map((event) => ({
110:     event, recipe: recipes.get(event.recipeVersionId)!, allocations: state.allocations.filter((a) => a.cookingEventId === event.id),
```

### Lines 159–178
```text
159:     ],
160:   );
161:   const rev = cyc.rows[0].projection_revision;
162:   await c.query("DELETE FROM requirement_lines WHERE cycle_id=$1", [cycleId]);
163:   for (const l of result.lines) {
164:     await c.query(
165:       "INSERT INTO requirement_lines(cycle_id, household_id, ingredient_key, projection_revision, line, line_fingerprint) VALUES ($1,$2,$3,$4,$5,$6)",
166:       [cycleId, householdId, l.key, rev, l, l.fingerprint],
167:     );
168:   }
169:   // Preserve approvals for unchanged lines; mark changed ones stale (kept for history).
170:   for (const ap of input.approvals) {
171:     const line = result.lines.find((l) => l.key === ap.ingredientKey);
172:     const unchanged = line && line.fingerprint === ap.lineFingerprint && (line.toSend === ap.packages || line.toSend === 0);
173:     if (!unchanged) {
174:       await c.query("UPDATE purchase_approvals SET state='stale', state_changed_at=now() WHERE id=$1", [ap.id]);
175:     }
176:   }
177:   return result;
178: }
```

## `src/server/commands/purchasing.ts`

SHA-256: `a1409adb8387c19eacff12b434258ba060840c64b75046cea69e7f5852e63a64`

### Lines 33–55
```text
33:     const cycleId = await ensureCycle(c, actor.householdId, p.weekId);
34:     const w = await c.query("SELECT 1 FROM weeks WHERE id=$1 AND household_id=$2", [p.weekId, actor.householdId]);
35:     if (!w.rowCount) throw new Reject("not_found", "Week not found");
36:     const cyc = await c.query("SELECT projection_summary FROM grocery_cycles WHERE id=$1", [cycleId]);
37:     const summary = cyc.rows[0].projection_summary;
38:     if (summary.reviewFingerprint !== p.reviewFingerprint || summary.payloadHash !== p.payloadHash) {
39:       throw new Reject("stale_review", "Groceries changed since this review. Nothing was sent; review the current list.", {
40:         currentReviewFingerprint: summary.reviewFingerprint,
41:       });
42:     }
43:     if (!summary.ready) throw new Reject("not_ready", `Groceries are not ready: ${summary.readyBlockers.join("; ")}`, { blockers: summary.readyBlockers });
44:     const lines = await currentLines(c, cycleId);
45:     const payload: { productRef: string; ingredientKey: string; packages: number }[] = summary.payload;
46:     if (hashOf(payload) !== p.payloadHash) throw new Reject("stale_review", "Payload does not match the reviewed list.");
47:     const batch = await c.query(
48:       `INSERT INTO handoff_batches(household_id, cycle_id, adapter, review_fingerprint, payload, payload_hash, authorized_by, operation_id)
49:        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
50:       [actor.householdId, cycleId, adapter.mode, p.reviewFingerprint, JSON.stringify(payload), p.payloadHash, actor.memberId, operationId],
51:     );
52:     const batchId = batch.rows[0].id;
53:     for (const item of payload) {
54:       const l = lines.find((x) => x.key === item.ingredientKey)!;
55:       const ap = await c.query("SELECT id FROM purchase_approvals WHERE cycle_id=$1 AND ingredient_key=$2 AND state='active'", [cycleId, item.ingredientKey]);
```

### Lines 92–133
```text
92:   // T2: re-validate under the coordination lock.
93:   const decision = await inTransaction(async (c) => {
94:     await c.query("SELECT 1 FROM households WHERE id=$1 FOR UPDATE", [householdId]);
95:     const status = await currentStatus(c, batchId);
96:     if (status !== "authorized") return { go: false as const, status };
97:     const b = await c.query("SELECT * FROM handoff_batches WHERE id=$1", [batchId]);
98:     const bl = await c.query("SELECT * FROM handoff_batch_lines WHERE batch_id=$1", [batchId]);
99:     const cycleId = b.rows[0].cycle_id;
100:     const lines = await currentLines(c, cycleId);
101:     const superseded = bl.rows.filter((x) => lines.find((l) => l.key === x.ingredient_key)?.fingerprint !== x.line_fingerprint);
102:     if (superseded.length) {
103:       await c.query("INSERT INTO handoff_status_events(batch_id, status, evidence) VALUES ($1,'canceled_before_dispatch',$2)", [
104:         batchId, { reason: "requirements changed before dispatch", lines: superseded.map((x) => x.ingredient_key) },
105:       ]);
106:       // Unchanged lines keep their approval: re-issue it for the same fingerprint.
107:       for (const x of bl.rows.filter((y) => !superseded.includes(y))) {
108:         const ap = await c.query("SELECT * FROM purchase_approvals WHERE id=$1", [x.approval_id]);
109:         const a = ap.rows[0];
110:         await c.query(
111:           "INSERT INTO purchase_approvals(household_id, cycle_id, ingredient_key, product_id, packages, line_fingerprint, approved_by) VALUES ($1,$2,$3,$4,$5,$6,$7)",
112:           [a.household_id, a.cycle_id, a.ingredient_key, a.product_id, a.packages, a.line_fingerprint, a.approved_by],
113:         );
114:       }
115:       await recomputeProjection(c, householdId, weekId);
116:       await emit(c, householdId, weekId, "A queued transfer was canceled before sending because the list changed. Review again.");
117:       return { go: false as const, status: "canceled_before_dispatch" };
118:     }
119:     await c.query("INSERT INTO handoff_status_events(batch_id, status, evidence) VALUES ($1,'dispatch_started',$2)", [batchId, { dispatchId: `${batchId}:1` }]);
120:     await emit(c, householdId, weekId, "Sending to the retailer…");
121:     return { go: true as const, payload: b.rows[0].payload as { productRef: string; packages: number }[] };
122:   });
123:   if (!decision.go) {
124:     log({ at: "dispatch", batchId, status: decision.status });
125:     return { status: decision.status };
126:   }
127:   // Network I/O outside any transaction.
128:   let outcome;
129:   try {
130:     outcome = await retailer().addToCart({
131:       householdId, batchId, dispatchId: `${batchId}:1`,
132:       items: decision.payload.map((i) => ({ productRef: i.productRef, quantity: i.packages })),
133:     });
```

## `src/server/queries/snapshot.ts`

SHA-256: `5fd4f2c6efd925134819ac11fac6599ff784bd2073b9d53adcf7c97cdef6f1d3`

### Lines 177–185
```text
177:     // Groceries: the stored projection must belong to exactly this accepted revision.
178:     const cyc = await c.query("SELECT * FROM grocery_cycles WHERE week_id=$1", [week.id]);
179:     const cycle = cyc.rows[0];
180:     if (!cycle || cycle.projection_accepted_revision !== week.acceptedChoiceRevision) {
181:       throw new IncoherentSnapshot(`projection revision ${cycle?.projection_accepted_revision} does not match accepted revision ${week.acceptedChoiceRevision}`);
182:     }
183:     const lines: RequirementLine[] = (await c.query("SELECT line FROM requirement_lines WHERE cycle_id=$1 ORDER BY ingredient_key", [cycle.id])).rows.map((r) => r.line);
184:     const batches = (
185:       await c.query(
```

## `src/ui/AlsoNeed.tsx`

SHA-256: `94d0bcc28fd405ff9302eb96d2956232cb595f0d9f08c88d9149c725b503f1dd`

### Lines 1–52
```text
1: "use client";
2: import { useState } from "react";
3: import { useStore } from "./store";
4: 
5: /** One fast shared capture. Staple tap = usual amount; "Extra" keeps its own quantity. */
6: export function AlsoNeed({ from, ingredientKey, label }: { from: "week" | "groceries" | "cook"; ingredientKey?: string; label?: string }) {
7:   const { snapshot, command } = useStore();
8:   const [text, setText] = useState("");
9:   const [msg, setMsg] = useState<string | null>(null);
10:   const [pendingAnother, setPendingAnother] = useState<{ text: string; key?: string } | null>(null);
11:   const weekId = snapshot?.week?.id;
12:   if (!weekId || !snapshot.week.adopted) return <p className="faint small">Adopt a week to start its grocery list.</p>;
13:   async function capture(t: string, kind: "usual" | "extra", key?: string, addAnother = false) {
14:     if (!t.trim()) return;
15:     const r = await command("CaptureHouseholdNeed", { weekId, text: t, ingredientKey: key ?? null, kind, from, addAnother });
16:     if (r.status === "accepted") {
17:       setText("");
18:       setPendingAnother(null);
19:       setMsg(r.result.merged ? `Already on the list — added you as a requester.` : r.result.matchedIngredient ? `Added.` : `Added as text; match it to an item when you review groceries.`);
20:     } else if (r.code === "already_in_order") {
21:       setPendingAnother({ text: t, key });
22:       setMsg(r.message);
23:     } else setMsg(r.message);
24:   }
25:   if (ingredientKey) {
26:     return (
27:       <span className="row">
28:         <button className="btn line small" onClick={() => capture(label ?? ingredientKey, "usual", ingredientKey)}>Also need {label}</button>
29:         {msg && <span className="faint small" role="status">{msg}</span>}
30:         {pendingAnother && <button className="btn line small" onClick={() => capture(pendingAnother.text, "usual", pendingAnother.key, true)}>Add another</button>}
31:       </span>
32:     );
33:   }
34:   return (
35:     <form
36:       className="alsoneed"
37:       data-testid={`alsoneed-${from}`}
38:       onSubmit={(e) => {
39:         e.preventDefault();
40:         void capture(text, "usual");
41:       }}
42:     >
43:       <label className="sr-only" htmlFor={`an-${from}`}>Also need</label>
44:       <input id={`an-${from}`} placeholder="Also need… (e.g. Greek yogurt)" value={text} onChange={(e) => setText(e.target.value)} list="ingredient-names" />
45:       <datalist id="ingredient-names">{snapshot.ingredients.map((i: any) => <option key={i.key} value={i.name} />)}</datalist>
46:       <button className="btn primary small" type="submit">Add</button>
47:       <button className="btn line small" type="button" onClick={() => capture(text, "extra")} title="An explicit extra package on top of anything else">Extra</button>
48:       {msg && <p className="faint small full-row" role="status">{msg}</p>}
49:       {pendingAnother && <button type="button" className="btn line small" onClick={() => capture(pendingAnother.text, "usual", pendingAnother.key, true)}>Add another</button>}
50:     </form>
51:   );
52: }
```

## `src/ui/Week.tsx`

SHA-256: `9c53fe2d2ec6b558cc91599f7734707fc237b070e7e75da77cee8fe32ec0ed09`

### Lines 88–99
```text
88:             ))}
89:           </ol>
90:           {proposal.content.unresolved.length > 0 && <p className="warnbox">{proposal.content.unresolved.join(" ")}</p>}
91:           {proposal.explanation.excluded?.length > 0 && (
92:             <details className="small"><summary>Not proposed ({proposal.explanation.excluded.length})</summary><ul>{proposal.explanation.excluded.map((x: any) => <li key={x.title}>{x.title}: {x.reason}</li>)}</ul></details>
93:           )}
94:           <div className="row">
95:             <button className="btn line small" onClick={() => generate("fewer_sessions")} disabled={busy}>Fewer sessions</button>
96:             <button className="btn line small" onClick={() => generate("different_dinners")} disabled={busy}>Different dinners</button>
97:           </div>
98:           <button className="btn primary full" onClick={adopt} disabled={busy || !writesAllowed || proposal.stale} data-testid="adopt">Use this week</button>
99:         </div>
```

## `src/ui/Groceries.tsx`

SHA-256: `ac286efc91a07e82a63f4543ffb96570f75e27df091dbf797539b3aa6dc2aa85`

### Lines 155–171
```text
155:         {l.toSend !== null && l.toSend > 0 && <div data-testid={`tosend-${l.key}`}>To send: {l.toSend} package(s){snapshot.groceries.order ? " — Not sent yet" : ""}</div>}
156:         {l.leftAfterMeal && <div>About {qty(l.leftAfterMeal.quantity, l.leftAfterMeal.unit)} left after dinners. <button className="link small" onClick={() => run("CaptureHouseholdNeed", { weekId, text: l.name, ingredientKey: l.ingredientKey, kind: "extra", packages: 1, from: "groceries" })}>Keep an extra</button></div>}
157:         {l.unresolved.map((u: string) => <div key={u} className="warn">{u}</div>)}
158:         {l.availability && <div className="faint">{l.availability.memberName}: {{ enough: "Have enough", some: `Have some${l.availability.quantity ? ` (${l.availability.quantity} ${l.availability.unit})` : ""}`, need: "Need" }[l.availability.state as string]}</div>}
159:       </div>
160:       {l.ingredientKey && l.meal && (
161:         <div className="row small" aria-label={`Availability for ${l.name}`}>
162:           <button className="btn line small" onClick={() => run("RecordAvailability", { weekId, ingredientKey: l.key, state: "enough" })}>Have enough</button>
163:           <input className="tiny" placeholder="amt" value={some} onChange={(e) => setSome(e.target.value)} aria-label="Amount on hand" />
164:           <button className="btn line small" onClick={() => run("RecordAvailability", { weekId, ingredientKey: l.key, state: "some", quantity: some || null, unit: some ? l.meal.unit : null })}>Have some</button>
165:           <button className="btn line small" onClick={() => run("RecordAvailability", { weekId, ingredientKey: l.key, state: "need" })}>Need</button>
166:         </div>
167:       )}
168:       {!l.ingredientKey && (
169:         <div className="row small">
170:           <select aria-label="Match to ingredient" onChange={(e) => e.target.value && run("MapRequest", { requestId: l.requests[0].id, ingredientKey: e.target.value })} defaultValue="">
171:             <option value="">Match to an item…</option>
```

## `src/ui/format.ts`

SHA-256: `b67689f9cf99c36364cfead2fe3199a4f598ee88cb675bc9e6b198afa13c4adf`

### Lines 1–12
```text
1: export function money(minor: number | null | undefined, currency = "USD"): string {
2:   if (minor === null || minor === undefined) return "unknown";
3:   return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
4: }
5: 
6: export function costView(v: { knownMinor: number; unknownCount: number; complete: boolean; currency: string } | null | undefined): string {
7:   if (!v) return "unknown";
8:   if (v.complete) return money(v.knownMinor, v.currency);
9:   if (v.knownMinor === 0) return `unknown — ${v.unknownCount} unpriced`;
10:   return `${money(v.knownMinor, v.currency)} known + ${v.unknownCount} unpriced`;
11: }
12: 
```

## `src/app/globals.css`

SHA-256: `4947eeb491c37b050037245bc0ccc049f8f47cc7be58630367dbb321b9023ad1`

### Lines 17–24
```text
17: 
18: .app { width: min(560px, 100%); margin: 0 auto; min-height: 100dvh; background: var(--bg); position: relative; }
19: .login { padding: 32px 16px; display: grid; gap: 14px; }
20: .top { position: sticky; top: 0; z-index: 20; padding: 12px 16px 8px; background: rgba(18, 17, 15, 0.97); border-bottom: 1px solid var(--line); }
21: .brand { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
22: .brand-title { font-family: Georgia, "Iowan Old Style", "Times New Roman", serif; font-weight: 600; font-size: 1.75rem; margin: 0; letter-spacing: -0.02em; }
23: .h2 { font-family: Georgia, "Iowan Old Style", serif; font-weight: 600; font-size: 1.35rem; margin: 6px 0; }
24: .pill { border: 1px solid var(--line); background: var(--card); color: var(--muted); border-radius: 999px; padding: 6px 10px; font-size: 0.75rem; }
```

## `scripts/verify-all.sh`

SHA-256: `4e337eab6a0eb0f7b21872155d84b9382e9ac3bc0503233fd47e3277b625b570`

### Lines 1–26
```text
1: #!/usr/bin/env bash
2: # Runs every check and records exact results as evidence. Exit code is non-zero if anything fails.
3: set -uo pipefail
4: cd "$(dirname "$0")/.."
5: OUT="docs/table/evidence/$(date -u +%F)-full-run.md"
6: mkdir -p docs/table/evidence
7: scripts/db.sh start >/dev/null
8: for db in table_test table_e2e; do DATABASE_URL=postgres://table@127.0.0.1:54329/$db npx tsx scripts/migrate.ts >/dev/null; done
9: rc=0
10: run() { local name="$1"; shift; echo "## $name" >>"$OUT"; echo '```' >>"$OUT"; echo "\$ $*" >>"$OUT"; "$@" >/tmp/verify-$$.log 2>&1; local s=$?; grep -E "$FILTER" /tmp/verify-$$.log >>"$OUT"; echo "exit $s" >>"$OUT"; echo '```' >>"$OUT"; [ $s -eq 0 ] || rc=1; }
11: {
12:   echo "# Full verification run"
13:   echo "- Date (UTC): $(date -u +%FT%TZ)"
14:   echo "- Code: $(git rev-parse HEAD) $( [ -n "$(git status --porcelain)" ] && echo '(+ uncommitted changes)')"
15:   echo "- Runtime: node $(node -v); $(/usr/lib/postgresql/16/bin/postgres --version); Next $(node -p 'require("next/package.json").version'); Playwright $(node -p 'require("@playwright/test/package.json").version') (Chromium headless); vitest $(node -p 'require("vitest/package.json").version')"
16:   echo "- Not covered by this run: Safari/WebKit, physical mobile devices, live Kroger, production hosting."
17:   echo
18: } >"$OUT"
19: FILTER="error|Error" run "Typecheck" npx tsc --noEmit -p .
20: FILTER="Test Files|Tests |✓|×|FAIL" run "Unit + integration (vitest, real PostgreSQL)" npx vitest run --reporter=verbose
21: FILTER="Compiled|rror" run "Production build" npx next build
22: FILTER="✓|✘|-  |passed|failed|skipped|flaky" run "Browser suite (Playwright, two authenticated contexts, production server)" npx playwright test
23: FILTER="mutation|MUTATION" run "Mutation checks" tests/mutation/run.sh
24: echo "Overall: $([ $rc -eq 0 ] && echo PASS || echo FAIL)" >>"$OUT"
25: echo "$OUT"
26: exit $rc
```

## `tests/mutation/run.sh`

SHA-256: `9cd7b07b7258b6623c81b784b77a0c187889537d9db6477f452e0a06237027cc`

### Lines 1–38
```text
1: #!/usr/bin/env bash
2: # Mutation checks: inject a forbidden behavior into the server, run the contract tests that
3: # must catch it, and require them to FAIL. Every source file is restored on exit.
4: set -uo pipefail
5: cd "$(dirname "$0")/../.."
6: BK=$(mktemp -d)
7: FILES=(src/server/commands/plan.ts src/server/commands/purchasing.ts src/domain/groceries/projection.ts)
8: for f in "${FILES[@]}"; do mkdir -p "$BK/$(dirname "$f")"; cp "$f" "$BK/$f"; done
9: restore() { for f in "${FILES[@]}"; do cp "$BK/$f" "$f"; done; }
10: trap restore EXIT
11: status=0
12: mutate() {
13:   local name="$1" file="$2" suite="$3" pattern="$4"; shift 4
14:   restore
15:   python3 - "$file" "$@" <<'PY'
16: import sys
17: p, *pairs = sys.argv[1:]
18: s = open(p).read()
19: for a, b in zip(pairs[::2], pairs[1::2]):
20:     assert a in s, f"mutation anchor not found: {a!r}"
21:     s = s.replace(a, b, 1)
22: open(p, "w").write(s)
23: PY
24:   if npx vitest run "$suite" -t "$pattern" >"$BK/$name.log" 2>&1; then
25:     echo "MUTATION SURVIVED: $name ($suite -t '$pattern' still passes)"; status=1
26:   else
27:     echo "mutation killed: $name — $(grep -E '^ +Tests ' "$BK/$name.log" | tr -s ' ')"
28:   fi
29: }
30: PLAN=tests/integration/plan.contract.test.ts
31: GROC=tests/integration/groceries.contract.test.ts
32: 
33: # 1. Blanket whole-week conflict rule (defeats independent-night edits).
34: mutate blanket_week_conflict src/server/commands/plan.ts $PLAN "T10" \
35:   "    const stale = closureStale({ assignments: preview.base.assignments, events: preview.base.events }, state);" \
36:   "    const stale = week.acceptedChoiceRevision !== preview.base.acceptedChoiceRevision ? { stale: true, changed: [] } : closureStale({ assignments: preview.base.assignments, events: preview.base.events }, state);"
37: # 2. Last-write-wins: skip the per-target stale check and the reviewed-content hash check.
38: mutate last_write_wins src/server/commands/plan.ts $PLAN "T08|T11|T22" \
```

## `tests/e2e/x-checks.spec.ts`

SHA-256: `a8156f1ccfc64efb504f473c14d70da7dbf6e04d9c2675b72e5d02a4f46176ba`

### Lines 75–110
```text
75: test("X11: narrow mobile layout, keyboard operation, text scaling, distinct identities", async ({ browser }) => {
76:   await seed();
77:   for (const width of [320, 390]) {
78:     const jon = await member(browser, "jon", { viewport: { width, height: 800 } });
79:     for (const path of ["/", "/groceries", "/explore", "/recipes", "/household"]) {
80:       await jon.page.goto(path);
81:       await expect(jon.page.getByTestId("currency")).toHaveAttribute("data-currency", "current");
82:       const overflow = await jon.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
83:       expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0);
84:     }
85:     await jon.page.goto("/");
86:     await jon.page.addStyleTag({ content: "html { font-size: 150% !important; }" });
87:     const overflow = await jon.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
88:     expect(overflow, `150% text at ${width}px`).toBeLessThanOrEqual(0);
89:     await jon.context.close();
90:   }
91:   // Keyboard: reach Friday's Change control and open the sheet without a pointer.
92:   const alex = await member(browser, "alex");
93:   const change = alex.page.getByTestId(`change-${NIGHT.fri}`);
94:   await change.focus();
95:   await alex.page.keyboard.press("Enter");
96:   await expect(alex.page.getByTestId(`sheet-${NIGHT.fri}`)).toBeVisible();
97:   await alex.page.keyboard.press("Tab");
98:   const focused = await alex.page.evaluate(() => document.activeElement?.getAttribute("role") ?? document.activeElement?.tagName);
99:   expect(focused).toBeTruthy();
100:   // Two distinct authenticated identities (separate cookies), not two tabs of one login.
101:   const jon = await member(browser, "jon");
102:   const c1 = (await jon.context.cookies()).map((c) => c.value).join();
103:   const c2 = (await alex.context.cookies()).map((c) => c.value).join();
104:   expect(c1).not.toBe(c2);
105:   await expect(jon.page.getByTestId("me")).toHaveText(USERS.jon.name);
106:   await expect(alex.page.getByTestId("me")).toHaveText(USERS.alex.name);
107:   await jon.context.close();
108:   await alex.context.close();
109: });
110: 
```
