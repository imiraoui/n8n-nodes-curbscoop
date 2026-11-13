import type {
	IAuthenticateGeneric,
	ICredentialType,
	Icon,
	INodeProperties,
	ICredentialTestRequest,
} from 'n8n-workflow';

export class CurbScoopApi implements ICredentialType {
	name = 'curbScoopApi';
	displayName = 'CurbScoop API';
	icon: Icon = { light: 'file:curbscoop.svg', dark: 'file:curbscoop.dark.svg' };
	documentationUrl = 'https://curbscoop.com/terminal';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			description: 'API key issued by CurbScoop',
			typeOptions: {
				password: true,
			},
			required: true,
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: { Authorization: '={{$credentials.apiKey ? "Bearer " + $credentials.apiKey : ""}}' },
		},
	};
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://curbscoop.com/api/terminal/mcp',
			url: '',
			method: 'POST',
			headers: { Accept: 'application/json, text/event-stream' },
			body: { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} },
		},
	};
}
