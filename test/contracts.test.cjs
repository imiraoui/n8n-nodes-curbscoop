const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	buildRequest,
	unwrapResponse,
	multipartDocument,
} = require('../dist/nodes/CurbScoop/request');
const { CurbScoop } = require('../dist/nodes/CurbScoop/CurbScoop.node');
const { properties } = require('../dist/nodes/CurbScoop/properties');
const base = 'https://curbscoop.com/api/terminal/mcp';
const uuid = '00000000-0000-4000-8000-000000000001';
const creds = { userId: uuid, apiKey: 'test-secret', baseUrl: 'https://mailreveal.example' };
const defaults = {
	identifier: 'Chateau Margaux 2015',
	identifierType: 'query',
	queries: 'Chateau Margaux 2015\nChateau Latour 2010',
	url: 'https://example.com/document.pdf',
	binaryProperty: 'data',
	query: 'security deposit',
	slug: 'security-deposit',
	area: 'chelsea',
	bedrooms: '0',
	q: '117 Henry Street',
	bbl: '1002830005',
	sections: ['comps'],
	messageId: uuid,
	recipient: 'recipient@example.com',
	subject: 'Example',
	body: 'Example body',
	idempotencyKey: 'test-123',
	confirmed: true,
};
const service = 'curbscoop';

test('every advertised operation builds a bounded request to its service', () => {
	const operations = properties.find((p) => p.name === 'operation').options;
	for (const operation of operations) {
		const plan = buildRequest(base, operation.value, defaults, creds);
		assert.ok(
			plan.options.url.startsWith(
				service === 'mailreveal' ? 'https://mailreveal.example/api/v1' : base,
			),
		);
		assert.ok(plan.options.timeout > 0);
		assert.equal(plan.options.disableFollowRedirect, true);
		assert.ok(!JSON.stringify(plan).includes('test-secret'));
		if (plan.options.method === 'GET') assert.equal(plan.options.body, undefined);
	}
	assert.throws(() => buildRequest(base, 'unknown', defaults, creds), /Unknown/);
});

test('one result per input retains paired item indexes and uses the authenticated helper when needed', async () => {
	const requests = [];
	const auth = [];
	const operation = 'resolveAddress';
	const parameters = {
		...Object.fromEntries(properties.map((p) => [p.name, p.default])),
		...defaults,
		operation,
	};
	const context = {
		getInputData: () => [{ json: { input: 1 } }, { json: { input: 2 } }],
		getNodeParameter: (key, index, fallback) => parameters[key] ?? fallback,
		getCredentials: async (name) => {
			auth.push(name);
			return creds;
		},
		continueOnFail: () => false,
		getNode: () => ({
			name: 'Test',
			type: 'test',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		}),
		helpers: {
			httpRequest: async (options) => {
				requests.push(options);
				return reply();
			},
			httpRequestWithAuthentication: async function (name, options) {
				auth.push(name);
				requests.push(options);
				return reply();
			},
		},
	};
	const [out] = await new CurbScoop().execute.call(context);
	assert.equal(requests.length, 2);
	assert.equal(out.length, 2);
	assert.deepEqual(
		out.map((item) => item.pairedItem),
		[{ item: 0 }, { item: 1 }],
	);
	assert.equal(auth.length, true ? 2 : 0);
});

function reply() {
	return ['rentreboot', 'curbscoop'].includes(service)
		? { jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: '{"ok":true}' }] } }
		: { ok: true };
}

test('continue-on-fail retains failed item indexes and does not mutate input', async () => {
	const input = [{ json: { source: 1 } }];
	const context = {
		getInputData: () => input,
		getNodeParameter: () => {
			throw new Error('invalid parameter');
		},
		getCredentials: async () => creds,
		continueOnFail: () => true,
	};
	const [out] = await new CurbScoop().execute.call(context);
	assert.deepEqual(out, [{ json: { error: 'invalid parameter' }, pairedItem: { item: 0 } }]);
	assert.deepEqual(input, [{ json: { source: 1 } }]);
});

test('response normalization preserves source data, arrays and remote errors', () => {
	const evidence = { currency: 'EUR', source: 'https://example.com/evidence', confidence: 'low' };
	assert.deepEqual(unwrapResponse(evidence, false), evidence);
	assert.deepEqual(unwrapResponse([evidence], false), { results: [evidence] });
	assert.deepEqual(
		unwrapResponse({ result: { structuredContent: evidence, content: [] } }, true),
		evidence,
	);
	assert.deepEqual(
		unwrapResponse(
			{ result: { content: [{ type: 'text', text: JSON.stringify([evidence]) }] } },
			true,
		),
		{ results: [evidence] },
	);
	assert.throws(
		() => unwrapResponse({ error: { message: 'quota exceeded' } }, true),
		/quota exceeded/,
	);
	assert.throws(
		() =>
			unwrapResponse(
				{ result: { isError: true, content: [{ type: 'text', text: 'not available' }] } },
				true,
			),
		/not available/,
	);
	assert.throws(() => unwrapResponse({}, true), /invalid MCP response/);
});

test('examples contain no selected credentials, active workflows, or fabricated results', () => {
	for (const filename of ['basic', 'ai-agent-tool']) {
		const workflow = require('../examples/' + filename + '.json');
		assert.equal(workflow.active, false);
		assert.deepEqual(workflow.pinData, {});
		assert.ok(workflow.nodes.every((node) => !node.credentials));
	}
});

test('CurbScoop keeps exact BBLs and wraps catalog operations in call_tool', () => {
	const plan = buildRequest(base, 'getFinancing', defaults);
	assert.deepEqual(plan.options.body.params, {
		name: 'call_tool',
		arguments: { name: 'get_financing', arguments: { bbl: '1002830005' } },
	});
	assert.equal(
		buildRequest(base, 'getDossier', defaults).options.body.params.arguments.bbl,
		'1002830005',
	);
	assert.throws(() => buildRequest(base, 'getDossier', { ...defaults, bbl: '123' }), /10-digit/);
	assert.throws(
		() => buildRequest(base, 'searchProperties', { ...defaults, offset: 1001 }),
		/offset/,
	);
});
