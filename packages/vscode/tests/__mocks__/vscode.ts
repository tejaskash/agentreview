// Minimal VS Code API stubs for vitest

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

export class TreeItem {
  label?: string;
  description?: string;
  tooltip?: string;
  collapsibleState?: TreeItemCollapsibleState;
  iconPath?: any;
  command?: any;
  contextValue?: string;
  id?: string;

  constructor(
    labelOrUri: string | Uri,
    collapsibleState?: TreeItemCollapsibleState
  ) {
    if (typeof labelOrUri === "string") {
      this.label = labelOrUri;
    }
    this.collapsibleState = collapsibleState;
  }
}

export class ThemeIcon {
  id: string;
  constructor(id: string) {
    this.id = id;
  }
}

export class ThemeColor {
  id: string;
  constructor(id: string) {
    this.id = id;
  }
}

export class Uri {
  scheme: string;
  authority: string;
  path: string;
  fsPath: string;

  private constructor(scheme: string, path: string) {
    this.scheme = scheme;
    this.authority = "";
    this.path = path;
    this.fsPath = path;
  }

  static file(path: string): Uri {
    return new Uri("file", path);
  }

  static parse(value: string): Uri {
    return new Uri("file", value);
  }

  with(change: { scheme?: string; path?: string }): Uri {
    return new Uri(change.scheme ?? this.scheme, change.path ?? this.path);
  }

  toString(): string {
    return `${this.scheme}://${this.path}`;
  }
}

export class Range {
  start: Position;
  end: Position;
  constructor(
    startLineOrStart: number | Position,
    startCharOrEnd: number | Position,
    endLine?: number,
    endChar?: number
  ) {
    if (typeof startLineOrStart === "number") {
      this.start = new Position(
        startLineOrStart,
        startCharOrEnd as number
      );
      this.end = new Position(endLine!, endChar!);
    } else {
      this.start = startLineOrStart;
      this.end = startCharOrEnd as Position;
    }
  }
}

export class Position {
  line: number;
  character: number;
  constructor(line: number, character: number) {
    this.line = line;
    this.character = character;
  }
}

export class Selection extends Range {
  anchor: Position;
  active: Position;
  constructor(anchorLine: number, anchorChar: number, activeLine: number, activeChar: number) {
    super(anchorLine, anchorChar, activeLine, activeChar);
    this.anchor = this.start;
    this.active = this.end;
  }
}

export class EventEmitter<T> {
  private listeners: Array<(e: T) => void> = [];

  event = (listener: (e: T) => void) => {
    this.listeners.push(listener);
    return { dispose: () => { this.listeners = this.listeners.filter((l) => l !== listener); } };
  };

  fire(data: T) {
    this.listeners.forEach((l) => l(data));
  }

  dispose() {
    this.listeners = [];
  }
}

export class MarkdownString {
  value: string;
  isTrusted?: boolean;
  supportHtml?: boolean;
  constructor(value?: string) {
    this.value = value ?? "";
  }
  appendMarkdown(value: string): MarkdownString {
    this.value += value;
    return this;
  }
  appendCodeblock(code: string, language?: string): MarkdownString {
    this.value += `\n\`\`\`${language ?? ""}\n${code}\n\`\`\`\n`;
    return this;
  }
}

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

// Stub window
export const window = {
  createTextEditorDecorationType: (_opts?: any) => ({
    dispose: () => {},
  }),
  showInformationMessage: async (..._args: any[]) => undefined as any,
  showWarningMessage: async (..._args: any[]) => undefined as any,
  showErrorMessage: async (..._args: any[]) => undefined as any,
  showInputBox: async (_opts?: any) => undefined as string | undefined,
  showQuickPick: async (_items: any[], _opts?: any) => undefined as any,
  showOpenDialog: async (_opts?: any) => undefined as any,
  showSaveDialog: async (_opts?: any) => undefined as any,
  createWebviewPanel: (_viewType: string, _title: string, _column: any, _opts?: any) => {
    const emitter = new EventEmitter<any>();
    return {
      webview: {
        html: "",
        onDidReceiveMessage: emitter.event,
        postMessage: async (_msg: any) => true,
        asWebviewUri: (uri: Uri) => uri,
        cspSource: "https://example.com",
      },
      onDidDispose: new EventEmitter<void>().event,
      reveal: () => {},
      dispose: () => {},
    };
  },
  createStatusBarItem: (_alignment?: StatusBarAlignment, _priority?: number) => ({
    text: "",
    tooltip: "",
    command: "",
    show: () => {},
    hide: () => {},
    dispose: () => {},
  }),
  activeTextEditor: undefined as any,
  showTextDocument: async (_doc: any, _opts?: any) => ({} as any),
  registerWebviewViewProvider: () => ({ dispose: () => {} }),
  createTreeView: (_viewId: string, _opts: any) => ({
    dispose: () => {},
    reveal: async () => {},
  }),
  visibleTextEditors: [] as any[],
  onDidChangeActiveTextEditor: new EventEmitter<any>().event,
  onDidChangeVisibleTextEditors: new EventEmitter<any[]>().event,
};

// Stub workspace
export const workspace = {
  workspaceFolders: undefined as { uri: Uri; name: string }[] | undefined,
  getConfiguration: (_section?: string) => ({
    get: (_key: string, _defaultValue?: any) => _defaultValue,
    update: async () => {},
  }),
  createFileSystemWatcher: (_pattern: any) => {
    const emitter = new EventEmitter<Uri>();
    return {
      onDidCreate: emitter.event,
      onDidChange: emitter.event,
      onDidDelete: emitter.event,
      dispose: () => {},
    };
  },
  openTextDocument: async (uriOrPath: any) => ({
    uri: typeof uriOrPath === "string" ? Uri.file(uriOrPath) : uriOrPath,
    getText: () => "",
    lineAt: (_line: number) => ({ text: "", range: new Range(0, 0, 0, 0) }),
    lineCount: 0,
  }),
  findFiles: async (_include: any, _exclude?: any) => [] as Uri[],
  onDidChangeWorkspaceFolders: new EventEmitter<any>().event,
  fs: {
    readFile: async (_uri: Uri) => new Uint8Array(),
    writeFile: async (_uri: Uri, _content: Uint8Array) => {},
  },
};

// Stub commands
export const commands = {
  registerCommand: (_command: string, _callback: (...args: any[]) => any) => ({
    dispose: () => {},
  }),
  executeCommand: async (_command: string, ..._args: any[]) => undefined as any,
};

// Stub languages
export const languages = {
  registerHoverProvider: (_selector: any, _provider: any) => ({
    dispose: () => {},
  }),
};

export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
  Two = 2,
  Three = 3,
}

export class Hover {
  contents: MarkdownString[];
  range?: Range;
  constructor(contents: MarkdownString | MarkdownString[], range?: Range) {
    this.contents = Array.isArray(contents) ? contents : [contents];
    this.range = range;
  }
}

export class RelativePattern {
  base: string;
  pattern: string;
  constructor(base: any, pattern: string) {
    this.base = typeof base === "string" ? base : base?.uri?.fsPath ?? base?.fsPath ?? "";
    this.pattern = pattern;
  }
}

export enum OverviewRulerLane {
  Left = 1,
  Center = 2,
  Right = 4,
  Full = 7,
}

export enum CommentMode {
  Editing = 0,
  Preview = 1,
}

export enum CommentThreadState {
  Unresolved = 0,
  Resolved = 1,
}

export enum CommentThreadCollapsibleState {
  Collapsed = 0,
  Expanded = 1,
}

// Stub comments
export const comments = {
  createCommentController: (_id: string, _label: string) => {
    const threads: any[] = [];
    return {
      id: _id,
      label: _label,
      commentingRangeProvider: undefined as any,
      options: undefined as any,
      createCommentThread: (uri: Uri, range: Range, comments: any[]) => {
        const thread = {
          uri,
          range,
          comments,
          label: "",
          contextValue: "",
          canReply: true,
          state: CommentThreadState.Unresolved,
          collapsibleState: CommentThreadCollapsibleState.Expanded,
          dispose: () => {
            const idx = threads.indexOf(thread);
            if (idx >= 0) threads.splice(idx, 1);
          },
        };
        threads.push(thread);
        return thread;
      },
      dispose: () => {},
    };
  },
};

export const env = {
  clipboard: {
    writeText: async (_text: string) => {},
    readText: async () => "",
  },
};
