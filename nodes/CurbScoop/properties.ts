import type { INodeProperties } from 'n8n-workflow';

export const properties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				value: 'getFinancing',
				name: 'Get Financing',
				action: 'Get property financing',
				description: 'Get recorded mortgage evidence for a tax lot',
			},
			{
				value: 'getNeighborhoodInsights',
				name: 'Get Neighborhood Insights',
				action: 'Get neighborhood insights',
				description: 'Get source-qualified neighborhood analyses',
			},
			{
				value: 'getDossier',
				name: 'Get Property Dossier',
				action: 'Get a property dossier',
				description: 'Get research for one exact tax lot',
			},
			{
				value: 'getResearchPlan',
				name: 'Get Research Plan',
				action: 'Get a research plan',
				description: 'Get a research plan without fetching its datasets',
			},
			{
				value: 'getWatchlist',
				name: 'Get Watchlist',
				action: 'Get a property watchlist',
				description: 'Get saved properties from the connected account',
			},
			{
				value: 'resolveAddress',
				name: 'Resolve Address',
				action: 'Resolve a property address',
				description: 'Find tax lots matching a NYC address or BBL',
			},
			{
				value: 'searchProperties',
				name: 'Search Properties',
				action: 'Search properties',
				description: 'Screen NYC properties by building filters',
			},
		],
		default: 'resolveAddress',
	},
	{
		displayName: 'Address Query',
		name: 'q',
		type: 'string',
		default: '',
		description: 'NYC address, building name, or BBL to resolve',
		displayOptions: {
			show: {
				operation: ['resolveAddress'],
			},
		},
		required: true,
		placeholder: '117 Henry Street',
	},
	{
		displayName: 'Search Query',
		name: 'q',
		type: 'string',
		default: '',
		description: 'Optional address text; at least three characters when supplied',
		displayOptions: {
			show: {
				operation: ['searchProperties'],
			},
		},
	},
	{
		displayName: 'Borough',
		name: 'borough',
		type: 'options',
		default: 'all',
		options: [
			{
				name: 'All',
				value: 'all',
			},
			{
				name: 'Bronx',
				value: 'bronx',
			},
			{
				name: 'Brooklyn',
				value: 'brooklyn',
			},
			{
				name: 'Manhattan',
				value: 'manhattan',
			},
			{
				name: 'Queens',
				value: 'queens',
			},
			{
				name: 'Staten Island',
				value: 'staten_island',
			},
		],
		displayOptions: {
			show: {
				operation: ['searchProperties'],
			},
		},
	},
	{
		displayName: 'Building Use',
		name: 'use',
		type: 'options',
		default: 'all',
		options: [
			{
				name: 'All',
				value: 'all',
			},
			{
				name: 'Commercial',
				value: 'commercial',
			},
			{
				name: 'Residential',
				value: 'residential',
			},
		],
		displayOptions: {
			show: {
				operation: ['searchProperties'],
			},
		},
	},
	{
		displayName: 'Minimum Units',
		name: 'minUnits',
		type: 'number',
		default: 0,
		description: 'Minimum number of residential units',
		displayOptions: {
			show: {
				operation: ['searchProperties'],
			},
		},
		typeOptions: {
			minValue: 0,
			maxValue: 100000,
		},
	},
	{
		displayName: 'Minimum Year Built',
		name: 'minYear',
		type: 'number',
		default: 0,
		description: 'Earliest construction year; zero disables the filter',
		displayOptions: {
			show: {
				operation: ['searchProperties'],
			},
		},
		typeOptions: {
			minValue: 0,
			maxValue: 2100,
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				operation: ['searchProperties'],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
	},
	{
		displayName: 'Offset',
		name: 'offset',
		type: 'number',
		default: 0,
		description: 'Number of results to skip',
		displayOptions: {
			show: {
				operation: ['searchProperties'],
			},
		},
		typeOptions: {
			minValue: 0,
			maxValue: 1000,
		},
	},
	{
		displayName: 'BBL',
		name: 'bbl',
		type: 'string',
		default: '',
		description: 'Exact 10-digit tax-lot identifier returned by Resolve Address',
		displayOptions: {
			show: {
				operation: ['getDossier', 'getResearchPlan', 'getFinancing', 'getNeighborhoodInsights'],
			},
		},
		required: true,
		placeholder: '1002830005',
	},
	{
		displayName: 'Unit',
		name: 'unit',
		type: 'string',
		default: '',
		description: 'Optional apartment identifier; building context remains separate',
		displayOptions: {
			show: {
				operation: ['getDossier'],
			},
		},
	},
	{
		displayName: 'Sections',
		name: 'sections',
		type: 'multiOptions',
		default: ['comps', 'ownership', 'financing', 'condition'],
		description: 'Dossier sections to fetch',
		displayOptions: {
			show: {
				operation: ['getDossier'],
			},
		},
		options: [
			{
				name: 'Building Sales',
				value: 'buildingSales',
			},
			{
				name: 'Comps',
				value: 'comps',
			},
			{
				name: 'Condition',
				value: 'condition',
			},
			{
				name: 'Financing',
				value: 'financing',
			},
			{
				name: 'Listings',
				value: 'listings',
			},
			{
				name: 'Neighborhood',
				value: 'neighborhood',
			},
			{
				name: 'Ownership',
				value: 'ownership',
			},
			{
				name: 'Permits',
				value: 'permits',
			},
			{
				name: 'Taxes',
				value: 'taxes',
			},
			{
				name: 'Violations',
				value: 'violations',
			},
		],
	},
	{
		displayName: 'Workflow',
		name: 'workflow',
		type: 'options',
		default: 'property_memo',
		options: [
			{
				name: 'Acquisition',
				value: 'acquisition',
			},
			{
				name: 'Broker Selection',
				value: 'broker_selection',
			},
			{
				name: 'Neighborhood',
				value: 'neighborhood',
			},
			{
				name: 'Ownership',
				value: 'ownership',
			},
			{
				name: 'Property Memo',
				value: 'property_memo',
			},
		],
		displayOptions: {
			show: {
				operation: ['getResearchPlan'],
			},
		},
	},
];
