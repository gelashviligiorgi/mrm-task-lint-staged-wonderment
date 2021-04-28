const _ = require('lodash');
const { json, lines } = require('mrm-core');

const rules = {
	env: {
		browser: true,
		node: true,
		es2021: true,
	},
	extends: ['eslint:recommended', 'plugin:react/recommended'],
	parserOptions: {
		ecmaFeatures: {
			jsx: true,
		},
		ecmaVersion: 12,
		sourceType: 'module',
	},
	plugins: ['react'],
	rules: {
		'react/prop-types': 0,
		'react/react-in-jsx-scope': 0, // disable for next.js
	},
	settings: {
		react: {
			version: 'latest',
		},
	},
};

module.exports.task = function () {
	const legacyConfigFile = '.eslintrc';
	const configFile = '.eslintrc.json';

	const ignores = ['node_modules/', '.eslintrc.json', ''];
	const ignoresToRemove = ['node_modules'];

	// Migrate legacy config
	const legacyEslintrc = json(legacyConfigFile);
	const legacyConfig = legacyEslintrc.get();
	legacyEslintrc.delete();

	// .eslintrc.json
	const eslintrc = json(configFile, legacyConfig);

	eslintrc.merge({
		...rules,
	});

	eslintrc.save();

	lines('.eslintignore').remove(ignoresToRemove).add(ignores).save();
};
