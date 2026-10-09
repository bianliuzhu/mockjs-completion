const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const manifest = require('../package.json');
const extensionPath = path.resolve(root, manifest.main);
const registrations = [];
const vscode = {
	workspace: {
		getWorkspaceFolder: () => ({ uri: { fsPath: root } }),
	},
	languages: {
		registerCompletionItemProvider: (...args) => {
			registrations.push(args);
			return { dispose() {} };
		},
	},
	CompletionItemKind: { Snippet: 14 },
	CompletionItem: class {
		constructor(label, kind) {
			Object.assign(this, { label, kind });
		}
	},
	SnippetString: class {
		constructor(value) {
			this.value = value;
		}
	},
	Range: class {
		constructor(startLine, startCharacter, endLine, endCharacter) {
			this.start = { line: startLine, character: startCharacter };
			this.end = { line: endLine, character: endCharacter };
		}
	},
};
const sandbox = {
	module: { exports: {} },
	__dirname: path.dirname(extensionPath),
	require: (name) => (name === 'vscode' ? vscode : require(name)),
};
vm.runInNewContext(fs.readFileSync(extensionPath, 'utf8'), sandbox);
sandbox.module.exports.activate({ subscriptions: [] });
const [selector, provider, trigger] = registrations[0];

function complete(markedText, filename = 'mocks/growth/agreement.json') {
	const offset = markedText.indexOf('|');
	const text = markedText.replace('|', '');
	const preceding = text.slice(0, offset).split('\n');
	const position = { line: preceding.length - 1, character: preceding.at(-1).length };
	const document = {
		uri: { fsPath: path.join(root, filename) },
		getText: () => text,
		offsetAt: () => offset,
		lineAt: (line) => ({ text: text.split('\n')[line] }),
	};
	return provider.provideCompletionItems(document, position);
}

test('registers @ for JSON and JSONC mock documents', () => {
	assert.equal(trigger, '@');
	assert.equal(selector.length, 2);
	assert.deepEqual(Array.from(selector, (filter) => filter.language), ['json', 'jsonc']);
	assert(selector.every((filter) => filter.scheme === 'file'));
	assert(selector.every((filter) => filter.pattern === '**/mocks/**/*.json'));
});

test('completes after a bare @ in the existing JSONC response shape', () => {
	const items = complete('/* @url /test */\n{"data":{"content":"@|"}}');
	assert.equal(items.length, 51);
	assert(items.some((item) => item.label === '@cparagraph'));
	assert(items.some((item) => item.insertText.value === '@integer(${1:1}, ${2:100})'));
});

test('replaces @ and the complete identifier around the cursor', () => {
	const item = complete('{"content":"@cna|me"}').find((item) => item.label === '@cname');
	assert.equal(item.range.start.character, 12);
	assert.equal(item.range.end.character, 18);
	assert.equal(item.insertText.value, '@cname');
});

test('supports array strings and placeholders embedded in text', () => {
	assert.equal(complete('{"list":["@|"]}').length, 51);
	assert.equal(complete('{"title":"hello @|"}').length, 51);
});

test('ignores comments, property names, non-string values and unrelated files', () => {
	for (const text of ['// @|\n{}', '/* @| */ {}', '{"@|":"x"}', '{"value": @|}', '{"value":"x"} @|', '{"value":"hello|"}']) {
		assert.equal(complete(text).length, 0, text);
	}
	assert.equal(complete('{"value":"@|"}', 'package.json').length, 0);
	assert.equal(complete('{"value":"@|"}', 'app/mocks/test.json').length, 0);
	assert.equal(complete('{"value":"@|"}', 'mocks/test.jsonc').length, 0);
});

test('supports a file directly under the workspace mocks directory', () => {
	assert.equal(complete('{"name":"@|"}', 'mocks/user.json').length, 51);
});

test('ignores documents without a workspace folder', () => {
	const getWorkspaceFolder = vscode.workspace.getWorkspaceFolder;
	vscode.workspace.getWorkspaceFolder = () => undefined;
	try {
		assert.equal(complete('{"name":"@|"}').length, 0);
	} finally {
		vscode.workspace.getWorkspaceFolder = getWorkspaceFolder;
	}
});
