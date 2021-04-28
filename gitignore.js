// @ts-check
const { lines } = require('mrm-core');

module.exports.task = function task() {
	const ignore = ['.husky', '.eslintcache'];

	// adding ./husky to gitignore
	lines('.gitignore').add(ignore).save();
};
