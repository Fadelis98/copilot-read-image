type TestContext = {
  subscriptions: { dispose: () => void }[];
};

describe('extension activation', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('registers all language model tools and stores disposables', async () => {
    const appendLineMock = jest.fn();
    const createOutputChannelMock = jest.fn(() => ({
      appendLine: appendLineMock,
      dispose: jest.fn(),
    }));
    const registerToolMock = jest.fn((name: string) => ({
      name,
      dispose: jest.fn(),
    }));

    jest.doMock(
      'vscode',
      () => ({
        lm: {
          registerTool: registerToolMock,
        },
        window: {
          createOutputChannel: createOutputChannelMock,
        },
      }),
      { virtual: true }
    );

    const { activate } = await import('../src/extension');
    const context: TestContext = { subscriptions: [] };

    activate(context as unknown as never);

    expect(createOutputChannelMock).toHaveBeenCalledWith('Copilot Image Reader');
    expect(registerToolMock).toHaveBeenCalledTimes(3);
    expect(registerToolMock).toHaveBeenNthCalledWith(
      1,
      'copilot-read-image_readImageFromPath',
      expect.anything()
    );
    expect(registerToolMock).toHaveBeenNthCalledWith(
      2,
      'copilot-read-image_imgFromBase64',
      expect.anything()
    );
    expect(registerToolMock).toHaveBeenNthCalledWith(
      3,
      'copilot-read-image_imgFromUrl',
      expect.anything()
    );
    expect(context.subscriptions).toHaveLength(4);
    expect(appendLineMock).toHaveBeenCalledWith('Extension activated successfully.');
  });

  it('logs and exits early when vscode.lm is unavailable', async () => {
    const appendLineMock = jest.fn();
    const createOutputChannelMock = jest.fn(() => ({
      appendLine: appendLineMock,
      dispose: jest.fn(),
    }));

    jest.doMock(
      'vscode',
      () => ({
        lm: undefined,
        window: {
          createOutputChannel: createOutputChannelMock,
        },
      }),
      { virtual: true }
    );

    const { activate } = await import('../src/extension');
    const context: TestContext = { subscriptions: [] };

    activate(context as unknown as never);

    expect(appendLineMock).toHaveBeenCalledWith(
      expect.stringContaining('vscode.lm API is not available')
    );
  });

  it('deactivate does not throw', async () => {
    jest.doMock(
      'vscode',
      () => ({
        lm: {
          registerTool: jest.fn(),
        },
        window: {
          createOutputChannel: jest.fn(() => ({
            appendLine: jest.fn(),
            dispose: jest.fn(),
          })),
        },
      }),
      { virtual: true }
    );

    const { deactivate } = await import('../src/extension');
    expect(() => deactivate()).not.toThrow();
  });
});
