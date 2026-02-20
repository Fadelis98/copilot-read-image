import * as vscode from 'vscode';
import { ImgFromBase64Tool, ImgFromUrlTool, ReadImageFromPathTool } from './tools';

const READ_IMAGE_FROM_PATH_TOOL = 'copilot-read-image_readImageFromPath';
const IMG_FROM_BASE64_TOOL = 'copilot-read-image_imgFromBase64';
const IMG_FROM_URL_TOOL = 'copilot-read-image_imgFromUrl';
const OUTPUT_CHANNEL_NAME = 'Copilot Image Reader';

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  context.subscriptions.push(outputChannel);

  outputChannel.appendLine('Activating extension...');

  if (!vscode.lm) {
    outputChannel.appendLine('vscode.lm API is not available. This extension requires VS Code 1.95+');
    return;
  }

  try {
    const tool1 = vscode.lm.registerTool(
      READ_IMAGE_FROM_PATH_TOOL,
      new ReadImageFromPathTool()
    );

    const tool2 = vscode.lm.registerTool(
      IMG_FROM_BASE64_TOOL,
      new ImgFromBase64Tool()
    );

    const tool3 = vscode.lm.registerTool(
      IMG_FROM_URL_TOOL,
      new ImgFromUrlTool()
    );

    context.subscriptions.push(tool1, tool2, tool3);

    outputChannel.appendLine(`Registered tool: ${READ_IMAGE_FROM_PATH_TOOL}`);
    outputChannel.appendLine(`Registered tool: ${IMG_FROM_BASE64_TOOL}`);
    outputChannel.appendLine(`Registered tool: ${IMG_FROM_URL_TOOL}`);
    outputChannel.appendLine('Extension activated successfully.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`Failed to activate extension: ${message}`);
  }
}

export function deactivate(): void {
  // Nothing to clean up – subscriptions are disposed automatically by VS Code
}
