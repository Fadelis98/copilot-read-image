import * as vscode from 'vscode';
import { ImgFromBase64Tool, ImgFromUrlTool, ReadImageFromPathTool } from './tools';

const READ_IMAGE_FROM_PATH_TOOL = 'copilot-read-image_readImageFromPath';
const IMG_FROM_BASE64_TOOL = 'copilot-read-image_imgFromBase64';
const IMG_FROM_URL_TOOL = 'copilot-read-image_imgFromUrl';

export function activate(context: vscode.ExtensionContext): void {
  console.log('🚀 Copilot Image Reader extension is activating...');
  console.log('VS Code version:', vscode.version);
  console.log('Extension context:', {
    extensionPath: context.extensionPath,
    extensionUri: context.extensionUri.toString()
  });
  
  // Check if lm API is available
  if (!vscode.lm) {
    console.error('❌ vscode.lm API is not available! This extension requires VS Code 1.90+');
    return;
  }
  
  console.log('✅ vscode.lm API is available');
  console.log('Available lm properties:', Object.keys(vscode.lm));
  
  try {
    // Register tools - use simple names matching package.json contributes
    const tool1 = vscode.lm.registerTool(
      READ_IMAGE_FROM_PATH_TOOL,
      new ReadImageFromPathTool()
    );
    console.log(`✅ Registered tool: ${READ_IMAGE_FROM_PATH_TOOL}`);
    
    const tool2 = vscode.lm.registerTool(
      IMG_FROM_BASE64_TOOL,
      new ImgFromBase64Tool()
    );
    console.log(`✅ Registered tool: ${IMG_FROM_BASE64_TOOL}`);
    
    const tool3 = vscode.lm.registerTool(
      IMG_FROM_URL_TOOL,
      new ImgFromUrlTool()
    );
    console.log(`✅ Registered tool: ${IMG_FROM_URL_TOOL}`);
    
    context.subscriptions.push(tool1, tool2, tool3);
    
    console.log('🎉 Copilot Image Reader extension activated successfully!');
    
    // Try to list all registered tools
    try {
      const tools = vscode.lm.tools;
      console.log(`📊 Total registered tools: ${tools.length}`);
      const ourTools = tools.filter((t) => t.name.includes('copilot-read-image'));
      console.log(`📊 Our tools found: ${ourTools.length}`, ourTools.map((t) => t.name));
    } catch (err) {
      console.error('Failed to list tools:', err);
    }
  } catch (error) {
    console.error('❌ Failed to activate Copilot Image Reader extension:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'N/A');
  }
}

export function deactivate(): void {
  console.log('👋 Copilot Image Reader extension is deactivating...');
  // Nothing to clean up – subscriptions are disposed automatically by VS Code
}
