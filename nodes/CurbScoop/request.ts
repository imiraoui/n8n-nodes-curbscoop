import type { IDataObject, IHttpRequestOptions } from 'n8n-workflow';

export interface RequestPlan {
	options: IHttpRequestOptions;
	rpc: boolean;
	binaryProperty?: string;
}

function required(p: IDataObject, key: string): string {
	const value = String(p[key] ?? '').trim();
	if (!value) throw new Error(`${key} is required`);
	return value;
}

function bounded(p: IDataObject, key: string, fallback: number, min: number, max: number): number {
	const value = Number(p[key] ?? fallback);
	if (!Number.isInteger(value) || value < min || value > max)
		throw new Error(`${key} must be an integer between ${min} and ${max}`);
	return value;
}

function pick(p: IDataObject, keys: string[]): IDataObject {
	return Object.fromEntries(
		keys
			.filter((key) => p[key] !== '' && p[key] !== undefined && p[key] !== null)
			.map((key) => [key, p[key]]),
	);
}

function enumValue(p: IDataObject, key: string, allowed: string[], fallback: string): string {
	const value = String(p[key] ?? fallback);
	if (!allowed.includes(value)) throw new Error(`Invalid ${key}`);
	return value;
}

export function buildRequest(base: string, operation: string, p: IDataObject): RequestPlan {
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: base,
		json: true,
		timeout: 120000,
		disableFollowRedirect: true,
		headers: { Accept: 'application/json' },
	};
	const plan: RequestPlan = { options, rpc: false };
	let body: IDataObject = {};
	{
		plan.rpc = true;
		options.headers = {
			Accept: 'application/json, text/event-stream',
			'MCP-Protocol-Version': '2025-03-26',
		};
		let tool = '';
		let args: IDataObject = {};
		{
			const tools: Record<string, string> = {
				resolveAddress: 'resolve_address',
				searchProperties: 'search_properties',
				getDossier: 'get_property_dossier',
				getResearchPlan: 'get_research_plan',
				getFinancing: 'get_financing',
				getNeighborhoodInsights: 'get_neighborhood_insights',
				getWatchlist: 'get_watchlist',
			};
			tool = tools[operation];
			if (!tool) throw new Error('Unknown CurbScoop operation');
			if (operation === 'resolveAddress') {
				const q = required(p, 'q');
				if (q.length < 2 || q.length > 100)
					throw new Error('Address query must have 2 to 100 characters');
				args.q = q;
			}
			if (operation === 'searchProperties') {
				const q = String(p.q ?? '').trim();
				if (q && (q.length < 3 || q.length > 100))
					throw new Error('Search query must have 3 to 100 characters');
				args = {
					q,
					borough: enumValue(
						p,
						'borough',
						['all', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten_island'],
						'all',
					),
					use: enumValue(p, 'use', ['all', 'residential', 'commercial'], 'all'),
					minUnits: bounded(p, 'minUnits', 0, 0, 100000),
					minYear: bounded(p, 'minYear', 0, 0, 2100),
					limit: bounded(p, 'limit', 20, 1, 100),
					offset: bounded(p, 'offset', 0, 0, 1000),
				};
			}
			if (
				['getDossier', 'getResearchPlan', 'getFinancing', 'getNeighborhoodInsights'].includes(
					operation,
				)
			) {
				const bbl = required(p, 'bbl');
				if (!/^[1-5][0-9]{9}$/.test(bbl)) throw new Error('Provide an exact 10-digit NYC BBL');
				args.bbl = bbl;
			}
			if (operation === 'getDossier') Object.assign(args, pick(p, ['unit', 'sections']));
			if (operation === 'getResearchPlan')
				args.workflow = enumValue(
					p,
					'workflow',
					['property_memo', 'acquisition', 'ownership', 'neighborhood', 'broker_selection'],
					'property_memo',
				);
			if (['getFinancing', 'getWatchlist'].includes(operation)) {
				args = { name: tool, arguments: args };
				tool = 'call_tool';
			}
		}
		body = { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: tool, arguments: args } };
	}
	options.body = body;
	return plan;
}

export function unwrapResponse(response: unknown, rpc: boolean): IDataObject {
	if (!rpc)
		return Array.isArray(response)
			? { results: response }
			: response && typeof response === 'object'
				? (response as IDataObject)
				: { data: response as string };
	const envelope = response as {
		error?: { message?: string };
		result?: {
			isError?: boolean;
			structuredContent?: IDataObject;
			content?: Array<{ type: string; text?: string }>;
		};
	};
	if (envelope.error) throw new Error(envelope.error.message || 'Remote procedure call failed');
	if (!envelope.result) throw new Error('The API returned an invalid MCP response');
	const result = envelope.result;
	const text = (result.content ?? [])
		.filter((c) => c.type === 'text')
		.map((c) => c.text ?? '')
		.join('\n');
	if (result.isError) throw new Error(text || 'The API tool failed');
	if (result.structuredContent) return result.structuredContent;
	try {
		const parsed: unknown = JSON.parse(text);
		return Array.isArray(parsed)
			? { results: parsed }
			: parsed && typeof parsed === 'object'
				? (parsed as IDataObject)
				: { data: parsed as string };
	} catch {
		return { text };
	}
}
