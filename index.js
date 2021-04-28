const lintStaged = require('./lint-staged');
const prettier = require('./prettier');
const eslintRc = require('./eslintrc');
const gitignore = require('./gitignore');

module.exports = function task() {
	lintStaged.task();
	eslintRc.task();
	prettier.task();
	gitignore.task();
};
