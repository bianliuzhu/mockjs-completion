const vscode = require('vscode');
const { getLocation, parse } = require('jsonc-parser');
const fs = require('node:fs');
const path = require('node:path');
const snippets = parse(fs.readFileSync(path.join(__dirname, '../snippets/mockjs.code-snippets'), 'utf8'));

function provideCompletionItems(document, position) {
	const folder = vscode.workspace.getWorkspaceFolder(document.uri);
	if (!folder) return [];
	const relativePath = path.relative(folder.uri.fsPath, document.uri.fsPath).split(path.sep).join('/');
	if (!relativePath.startsWith('mocks/') || !relativePath.endsWith('.json')) return [];

	const text = document.getText();
	const offset = document.offsetAt(position);
	const location = getLocation(text, offset);
	const node = location.previousNode;
	if (location.isAtPropertyKey || node?.type !== 'string' || offset <= node.offset || offset >= node.offset + node.length) return [];

	const line = document.lineAt(position.line).text;
	const prefix = line.slice(0, position.character).match(/@[a-zA-Z]*$/);
	if (!prefix) return [];
	const suffix = line.slice(position.character).match(/^[a-zA-Z]*/)[0];
	const range = new vscode.Range(position.line, position.character - prefix[0].length, position.line, position.character + suffix.length);
	return Object.values(snippets).map((snippet) => {
		const item = new vscode.CompletionItem(snippet.prefix, vscode.CompletionItemKind.Snippet);
		item.insertText = new vscode.SnippetString(snippet.body);
		item.range = range;
		item.detail = 'Mock.js';
		item.documentation = snippet.description;
		return item;
	});
}

function activate(context) {
	context.subscriptions.push(
		vscode.languages.registerCompletionItemProvider(
			['json', 'jsonc'].map((language) => ({ language, scheme: 'file', pattern: '**/mocks/**/*.json' })),
			{ provideCompletionItems },
			'@',
		),
	);
}

module.exports = { activate };
