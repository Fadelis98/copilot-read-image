import * as vscode from 'vscode';
import { ImgFromBase64Tool, ImgFromUrlTool, ReadImageFromPathTool } from './tools';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.lm.registerTool('readImageFromPath', new ReadImageFromPathTool()),
    vscode.lm.registerTool('imgFromBase64', new ImgFromBase64Tool()),
    vscode.lm.registerTool('imgFromUrl', new ImgFromUrlTool())
  );
}

export function deactivate(): void {
  // Nothing to clean up – subscriptions are disposed automatically by VS Code
}
