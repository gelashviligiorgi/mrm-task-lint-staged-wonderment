// @ts-check
const path = require('path');
const editorConfigToPrettier = require('editorconfig-to-prettier');
const { json, install, getStyleForFile } = require('mrm-core');

const packages = {
	prettier: '>=2',
};

const defaultPrettierOptions = {
	printWidth: 100,
	tabWidth: 4,
	useTabs: true,
	semi: false,
	singleQuote: true,
	jsxSingleQuote: false,
	trailingComma: 'es5',
	bracketSpacing: true,
	jsxBracketSameLine: false,
	arrowParens: 'avoid',
};

// Remove options that have the same values as Prettier defaults
function removeDefaultOptions(options) {
	const newOptions = { ...options };
	for (const option in newOptions) {
		if (newOptions[option] === defaultPrettierOptions[option]) {
			delete newOptions[option];
		}
	}
	return newOptions;
}

module.exports.task = function () {
	// Try to read options from EditorConfig
	const testJsFile = path.join(process.cwd(), 'test.js');
	const editorconfigOptions = editorConfigToPrettier(
		getStyleForFile(testJsFile)
	);

	// .prettierrc
	const prettierrc = json('.prettierrc');

	// Update options and save
	prettierrc
		.merge(Object.assign({}, defaultPrettierOptions, editorconfigOptions))
		.save();

	// Dependencies
	install(packages);
};

module.exports.description = 'Adds Prettier';
