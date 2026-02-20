import * as vscode from 'vscode';

export interface ReadImageFromPathInput {
  imagePath: string;
}

export interface ImgFromBase64Input {
  base64Data: string;
  mimeType?: string;
}

export interface ImgFromUrlInput {
  imageUrl: string;
}

export class ReadImageFromPathTool
  implements vscode.LanguageModelTool<ReadImageFromPathInput>
{
  async invoke(
    _options: vscode.LanguageModelToolInvocationOptions<ReadImageFromPathInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    // TODO: Phase 2 – implement actual image reading from path
    return new vscode.LanguageModelToolResult([]);
  }
}

export class ImgFromBase64Tool
  implements vscode.LanguageModelTool<ImgFromBase64Input>
{
  async invoke(
    _options: vscode.LanguageModelToolInvocationOptions<ImgFromBase64Input>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    // TODO: Phase 2 – implement actual base64 image decoding
    return new vscode.LanguageModelToolResult([]);
  }
}

export class ImgFromUrlTool implements vscode.LanguageModelTool<ImgFromUrlInput> {
  async invoke(
    _options: vscode.LanguageModelToolInvocationOptions<ImgFromUrlInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    // TODO: Phase 2 – implement actual image fetching from URL
    return new vscode.LanguageModelToolResult([]);
  }
}
