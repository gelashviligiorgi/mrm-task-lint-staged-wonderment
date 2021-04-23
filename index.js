// @ts-check
const {
	packageJson,
	install,
	getExtsFromCommand,
	uninstall,
} = require('mrm-core');
const { isUsingYarnBerry } = require('mrm-core/src/npm');
const { castArray } = require('lodash');
const husky = require('husky');
const prettier = require('./prettier');

const packages = {
	eslint: '^7.24.0',
	husky: '>=6',
	prettier: '^2.2.1',
	stylelint: '^13.12.0',
	'lint-staged': '>=10',
	'eslint-config-prettier': '^7.2.0',
	'eslint-config-react-app': '^6.0.0',
	'eslint-plugin-import': '^2.22.1',
	'eslint-plugin-jest': '^24.3.2',
	'eslint-plugin-lodash': '^7.2.0',
	'eslint-plugin-react': '^7.22.0',
	'eslint-plugin-react-hooks': '^4.2.0',
	'eslint-plugin-testing-library': '^4.1.1',
	'eslint-plugin-flowtype': '^5.7.1',
	'eslint-plugin-jsx-a11y': '^6.4.1',
	'babel-eslint': '^10.1.0',
};

/**
 * Default lint-staged rules
 *
 * @param name Name of the rule to match user overrides
 * @param [condition] Function that returns true when the rule should be added
 * @param extensions Default extension (if we can't infer them from an npm script)
 * @param [script] Name of an npm script to infer extensions
 * @param [param] Command line parameter of an npm script to infer extensions (for example, `ext` for `--ext`)
 * @param command Command to run for a lint-staged rule
 */
const defaultRules = [
	// ESLint
	{
		name: 'eslint',
		condition: (pkg) => true,
		extensions: ['js', 'jsx'],
		script: 'lint',
		param: 'ext',
		command: 'eslint --cache --fix  --max-warnings 0',
	},
	// Stylelint
	{
		name: 'stylelint',
		condition: (pkg) => true,
		extensions: ['css', 'scss', 'less'],
		script: 'lint:css',
		command: 'stylelint --fix',
	},
	// Prettier
	{
		name: 'prettier',
		condition: (pkg) => true,
		extensions: ['js', 'jsx', 'css', 'md'],
		script: 'format',
		command: 'prettier --write',
	},
];

/**
 * Merge default rules with user overrides
 *
 * @param {Array} defaults
 * @param {Object} overrides
 */
function mergeRules(defaults, overrides) {
	// Overrides for default rules
	const rulesWithOverrides = defaults.map((rule) => ({
		...rule,
		...overrides[rule.name],
	}));

	// Custom rules
	return Object.entries(overrides).reduce((acc, [name, rule]) => {
		if (acc.some((x) => x.name === name)) {
			return acc;
		}
		return [...acc, rule];
	}, rulesWithOverrides);
}

/**
 * Convert an array of extensions to a glob pattern
 *
 * Example: ['js', 'ts'] -> '*.{js,ts}'
 *
 * @param {string[]} exts
 */
function extsToGlob(exts) {
	if (exts.length > 1) {
		return `*.{${exts}}`;
	}

	return `*.${exts}`;
}

/**
 * Generate a regular expression to detect a rule in existing rules. For simplicity
 * assumes that the first word in the command is the binary you're running.
 *
 * Example: 'eslint --fix' -> /\beslint\b/
 *
 * TODO: Allow overriding for more complex commands
 *
 * @param {string} command
 */
function getRuleRegExp(command) {
	return new RegExp(`\\b${command.split(' ').shift()}\\b`);
}

/**
 * Check if a given command belongs to a rule
 *
 * @param {string | string[]} ruleCommands
 * @param {string} command
 */
function isCommandBelongsToRule(ruleCommands, command) {
	const regExp = getRuleRegExp(command);
	return castArray(ruleCommands).some((x) => regExp.test(x));
}

module.exports = function task(params) {
	const { lintStagedRules } = params;

	const pkg = packageJson();
	const allRules = mergeRules(defaultRules, lintStagedRules);
	const existingRules = Object.entries(pkg.get('lint-staged', {}));

	// Remove exising rules that run any of default commands
	const commandsToRemove = allRules.map((rule) => rule.command);
	const existingRulesToKeep = existingRules.filter(([, ruleCommands]) =>
		commandsToRemove
			.map((command) => isCommandBelongsToRule(ruleCommands, command))
			.every((x) => x === false)
	);

	// New rules
	const rulesToAdd = allRules.map(
		({
			condition = () => true,
			extensions: defaultExtensions,
			script,
			param,
			command,
			enabled = true,
		}) => {
			if (!enabled || !condition(pkg)) {
				return null;
			}

			const extensions =
				getExtsFromCommand(pkg.getScript(script), param) ||
				defaultExtensions;
			const pattern = extsToGlob(extensions);

			return [pattern, command];
		}
	);

	// Merge existing and new rules, clean up
	const rulesToWrite = [...existingRulesToKeep, ...rulesToAdd].filter(
		Boolean
	);

	// Merge rules with the same pattern and convert to an object
	// Wrap commands in an array only when a pattern has multiple commands
	const rules = {};
	rulesToWrite.forEach(([pattern, command]) => {
		if (rules[pattern]) {
			rules[pattern] = [...castArray(rules[pattern]), command];
		} else {
			rules[pattern] = command;
		}
	});

	if (Object.keys(rules).length === 0) {
		const names = defaultRules.map((rule) => rule.name);
		console.log(
			`\nCannot add lint-staged: only ${names.join(
				', '
			)} or custom rules are supported.`
		);
		return;
	}

	// package.json
	pkg
		// Remove husky 0.14 config
		.unset('scripts.precommit')
		// Remove husky 4 config
		.unset('husky')
		// Remove simple-git-hooks
		.unset('simple-git-hooks')
		// Add new config
		.merge({
			'lint-staged': rules,
		});

	if (isUsingYarnBerry()) {
		// Yarn 2 doesn't support `prepare` lifecycle yet
		// https://yarnpkg.com/advanced/lifecycle-scripts
		pkg.appendScript('postinstall', 'husky install');
		if (!pkg.get('private')) {
			// In case package isn't private, pinst ensures that postinstall
			// is disabled on publish
			pkg.appendScript('prepublishOnly', 'pinst --disable').appendScript(
				'postpublish',
				'pinst --enable'
			);
			packages.pinst = '>=2';
		}
	} else {
		// npm, Yarn 1, pnpm
		pkg.appendScript('prepare', 'husky install');
	}

	pkg.save();

	uninstall('simple-git-hooks');
	// Install dependencies
	install(packages);
	// Install husky
	husky.install();
	// Set lint-staged config
	husky.add('.husky/pre-commit', 'npx lint-staged');

	prettier.task(params);
};

module.exports.description = 'Adds lint-staged';
module.exports.parameters = {
	lintStagedRules: {
		type: 'config',
		default: {},
	},
};
