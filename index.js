const lintStaged = require('./lint-staged');
const prettier = require('./prettier');

module.exports = function task(params) {
	lintStaged.task(params);
	prettier.task(params);
};
