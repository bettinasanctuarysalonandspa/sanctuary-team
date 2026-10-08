import { createOpenAI } from '@ai-sdk/openai';
import { stepCountIs, streamText, tool, type ModelMessage } from 'ai';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { inclusiveCategoryTotals, money, toCents } from './consultation-math';

type Db = SupabaseClient<Database>;

export async function loadCatalog(db: Db) {
  const [stylists, services, levelPrices, products, hair, aliases] = await Promise.all([
    db.from('calc_stylists').select('id,name,level').eq('active', true).order('name'),
    db.from('calc_services').select('id,name,kind,flat_price,unit').eq('active', true).order('name'),
    db.from('calc_service_level_prices').select('service_id,level,price'),
    db.from('calc_products').select('id,brand,line,name,size,retail_price,status,notes').eq('active', true).order('brand').order('line').order('name'),
    db.from('calc_extension_hair').select('id,name,length_in,price_per_section').eq('active', true).order('length_in'),
    db.from('calc_aliases').select('phrase,meaning'),
  ]);
  for (const r of [stylists, services, levelPrices, products, hair, aliases]) if (r.error) throw new Error('Approved pricing could not be loaded.');
  return { stylists: stylists.data ?? [], services: services.data ?? [], levelPrices: levelPrices.data ?? [], products: products.data ?? [], hair: hair.data ?? [], aliases: aliases.data ?? [] };
}
type Catalog = Awaited<ReturnType<typeof loadCatalog>>;

const productLabel = (p: Catalog['products'][number]) => [p.brand, p.line, p.name, p.size && `(${p.size})`].filter(Boolean).join(' ');

function instructions(c: Catalog) {
  return `You are the Sanctuary Salon & Spa Consultation Calculator, a friendly, brief assistant for Sanctuary stylists in Cornelius, NC.

WORKFLOW
- Chat conversationally, one question at a time. Ask which stylist, the client's goals and how the client wants to feel. Clarify maintenance, hair/color history and sensitivities only when missing. Never diagnose medical or scalp conditions.
- Identify the exact service names below and the stylist's level; ask rather than guess. Use the aliases.
- Ask for the stylist's own product recommendations first. Stylist recommends 3+ -> add no suggestions; 2 -> at most 1; 1 -> at most 2; 0 -> at most 3. Label "Stylist prescribed" vs "Assistant suggested". Suggestions must be distinct.
- Butterfly Weft: hair and installation labor are separate. Quote hair by 1/3 sections. 1 section = half row, 2 = full row. Planning guide only: medium density ~5 sections, thick ~6-7, fine/small head ~4-5; the stylist decides. If a length is not listed below, say "I cannot confirm this" and ask for the current hair price.
- SalonScale is a separate stylist-provided estimate. Never guess it; show it as its own line and explain it may change based on color actually used. SalonScale does not apply to extension installation.
- When you have enough to quote, ALWAYS call calculate_quote. Never do arithmetic yourself and never state a price that did not come from the tool. Show services (including installation labor), retail products, and extension hair as THREE separate category line items using ONLY the charge-inclusive category totals returned by the tool, plus the estimated total and SalonScale separately. List the selected item names and quantities underneath their category, without separate base prices. Never combine extension hair with retail products. Do NOT show separate tax or amenity/service-charge lines. Briefly label these totals "Includes applicable charges and tax." Services include the 3% amenity charge only; retail products and extension hair include the 3% amenity charge and 8.25% sales tax. Never tax services or the amenity charge. These are checkout estimates, not changes to listed catalog prices.
- If an item is unavailable or needs review, say the price is not confirmed and do not invent one.
- After a quote, remind: take BEFORE, INSPIRATION and AFTER photos and document the consultation in Phorest.
- Never invent prices, services, products, policies, clinical claims or level overrides. Use markdown lightly.

STYLISTS (name = level)
${c.stylists.map(s => `${s.name} = ${s.level}`).join('\n')}

ALIASES
${c.aliases.map(a => `${a.phrase} -> ${a.meaning}`).join('\n')}

SERVICES (id: name)
${c.services.map(s => `${s.id}: ${s.name}${s.kind === 'level' ? ' [price by stylist level]' : ''}${s.unit ? ` [${s.unit}]` : ''}`).join('\n')}

PRODUCTS (id: name — notes)
${c.products.map(p => `${p.id}: ${productLabel(p)}${p.status !== 'approved' || p.retail_price == null ? ' [price not confirmed]' : ''}${p.notes ? ` — ${p.notes}` : ''}`).join('\n')}

EXTENSION HAIR LENGTHS AVAILABLE
${c.hair.map(h => `${h.name} ${h.length_in}"`).join('\n')}`;
}

const quoteInput = z.object({
  stylist_name: z.string().nullable().describe('Stylist name exactly as listed, or null if unknown'),
  services: z.array(z.object({ service_id: z.number().int(), quantity: z.number().int().min(1) })),
  products: z.array(z.object({ product_id: z.number().int(), quantity: z.number().int().min(1), source: z.enum(['stylist', 'assistant']) })),
  extension_hair: z.array(z.object({ length_in: z.number().int(), sections: z.number().int().min(1) })),
  salonscale_estimate: z.number().nullable().describe('Stylist-provided SalonScale estimate in dollars, or null'),
});

export function calculateQuote(c: Catalog, q: z.infer<typeof quoteInput>) {
  const problems: string[] = [];
  const stylistName = q.stylist_name?.trim().toLowerCase();
  const stylist = stylistName ? c.stylists.find(s => s.name.toLowerCase() === stylistName) : undefined;
  if (q.stylist_name && !stylist) problems.push(`Stylist "${q.stylist_name}" is not in the approved list.`);
  const lines: { group: string; label: string; quantity: number; unit: string; amount: string }[] = [];
  let S = 0, R = 0, H = 0;
  for (const item of q.services) {
    const svc = c.services.find(s => s.id === item.service_id);
    if (!svc) { problems.push(`Service id ${item.service_id} is not approved.`); continue; }
    let unit: number | null = null;
    if (svc.kind === 'flat') unit = svc.flat_price == null ? null : toCents(svc.flat_price);
    else if (!stylist) { problems.push(`${svc.name} is priced by level — which stylist?`); continue; }
    else { const lp = c.levelPrices.find(p => p.service_id === svc.id && p.level === stylist.level); unit = lp ? toCents(lp.price) : null; }
    if (unit == null) { problems.push(`${svc.name}: price not confirmed.`); continue; }
    S += unit * item.quantity;
    lines.push({ group: 'Service', label: svc.kind === 'level' && stylist ? `${svc.name} (${stylist.level})` : svc.name, quantity: item.quantity, unit: money(unit), amount: money(unit * item.quantity) });
  }
  for (const item of q.products) {
    const p = c.products.find(x => x.id === item.product_id);
    if (!p) { problems.push(`Product id ${item.product_id} is not approved.`); continue; }
    if (p.status !== 'approved' || p.retail_price == null) { problems.push(`${productLabel(p)}: price not confirmed — needs owner review.`); continue; }
    const unit = toCents(p.retail_price);
    R += unit * item.quantity;
    lines.push({ group: item.source === 'stylist' ? 'Product (stylist prescribed)' : 'Product (assistant suggested)', label: productLabel(p), quantity: item.quantity, unit: money(unit), amount: money(unit * item.quantity) });
  }
  for (const item of q.extension_hair) {
    const h = c.hair.find(x => x.length_in === item.length_in);
    if (!h) { problems.push(`${item.length_in}" extension hair: I cannot confirm this price. Ask for the current hair price.`); continue; }
    const unit = toCents(h.price_per_section);
    H += unit * item.sections;
    lines.push({ group: 'Extension hair', label: `${h.name} ${h.length_in}" (per 1/3 section)`, quantity: item.sections, unit: money(unit), amount: money(unit * item.sections) });
  }
  const t = inclusiveCategoryTotals(S, R, H);
  return {
    stylist: stylist ? `${stylist.name} (${stylist.level})` : null,
    lines: lines.map(({ group, label, quantity }) => ({ group, label, quantity })),
    services_including_charges: money(t.services),
    retail_products_including_charges_and_tax: money(t.retail),
    extension_hair_including_charges_and_tax: money(t.extensionHair),
    estimated_total: money(t.total),
    salonscale_separate: q.salonscale_estimate == null ? 'Not provided by stylist' : `${money(toCents(q.salonscale_estimate))} (stylist estimate, may change based on color used; not included above)`,
    problems,
  };
}

export async function runConsultation(db: Db, history: ModelMessage[]) {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) throw new Error('The assistant is not configured.');
  const catalog = await loadCatalog(db);
  const provider = createOpenAI({
    baseURL: 'https://ai.gateway.lovable.dev/v1',
    apiKey,
    headers: { 'Lovable-API-Key': apiKey, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
  });
  const result = streamText({
    model: provider.responses('openai/gpt-6-astra'),
    system: instructions(catalog),
    messages: history,
    stopWhen: stepCountIs(4),
    tools: {
      calculate_quote: tool({
        description: 'Price an itemized consultation quote from approved Sanctuary data. Returns exact totals.',
        inputSchema: quoteInput,
        execute: async input => calculateQuote(catalog, input),
      }),
    },
    providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: 'low', reasoningSummary: 'auto', include: ['reasoning.encrypted_content'] } },
  });
  let failure: unknown;
  for await (const part of result.fullStream) if (part.type === 'error') failure = part.error;
  if (failure) { console.error('consultation AI error', failure); throw new Error('The assistant could not answer right now. Please try again.'); }
  const text = (await result.text).trim();
  if (!text) throw new Error('The assistant could not answer right now. Please try again.');
  return text;
}
