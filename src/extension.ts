// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
const yaml = require("js-yaml");
const fs = require("fs");

interface PathKeys {
  [x: string]: any;
}

let objectCache: PathKeys = {};

function convertToPathKeys(obj: PathKeys, path = "") {
  const result: PathKeys = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      const newPath = path ? `${path}.${key}` : key;
      if (typeof value === "object") {
        Object.assign(result, convertToPathKeys(value, newPath));
      } else {
        result[newPath] = value;
      }
    }
  }
  return result;
}

function createMapDict(pathKeys: PathKeys) {
  const mapDict: PathKeys = {};
  for (const key in pathKeys) {
    if (mapDict[pathKeys[key]]) {
      mapDict[pathKeys[key]].push(key);
    } else {
      mapDict[pathKeys[key]] = [key];
    }
  }
  return mapDict;
}

function readYamlFiles() {
  let folder = vscode.workspace.rootPath;
  let filePattern = "**/*.yaml";
  let textSpace = "";
  vscode.workspace.findFiles(filePattern, folder, 1000).then((uris) => {
    uris.forEach((file) => {
      fs.readFile(file.fsPath, "utf8", (err: any, data: any) => {
        if (err) {
          console.log(err);
          return;
        }
        try {
          const yamlData = yaml.load(data);
          const dictMap = createMapDict(convertToPathKeys(yamlData));
          objectCache = { ...objectCache, ...dictMap };
          console.log("yaml files read and cached");
          console.log(objectCache);
        } catch (e) {
          console.log(`Error parsing yaml file ${file.fsPath}, ${e}`);
        }
      });
    });
  });
}

function findKeyValuePairsInCache(selectedText: string) {
  const keys = Object.keys(objectCache);
  const foundPairs = keys.filter((key) => key === selectedText);
  const list = foundPairs.map((pair) => {
    return objectCache[pair];
  });
  return list[0];
}

function showDropdown(selectedText: string, selection: vscode.Range) {
  const options = findKeyValuePairsInCache(selectedText);
  const position = new vscode.Position(
    selection.end.line,
    selection.end.character
  );
  const range = new vscode.Range(position, position);
  console.log(options);
  vscode.window
    .showQuickPick(options, {
      placeHolder: "select yaml path to replace",
      matchOnDescription: true,
      matchOnDetail: true,
    })
    .then((selectedOption) => {
      if (selectedOption) {
        replaceSelectedText(selectedText, selectedOption);
      }
    });
}

function replaceSelectedText(selectedText: string, replacement: string) {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const selection = editor.selection;
    editor.edit((editBuilder) => {
      editBuilder.replace(selection, replacement);
    });
  }
}

class MyAutoCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<
    vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>
  > {
    const completionItems: vscode.CompletionItem[] = [];
    return completionItems;
  }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "getyaml" is now active!');

  let ca = vscode.window.onDidChangeTextEditorSelection((event) => {
    const editor = event.textEditor;
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    showDropdown(selectedText, selection);
  });

  // let disposable = vscode.commands.registerCommand("getyaml.getyaml", () => {
  //   const editor = vscode.window.activeTextEditor;
  //   if (editor) {
  //     const selection = editor.selection;
  //     const selectedText = editor.document.getText(selection);
  //     showDropdown(selectedText);
  //     // findKeyValuePairsInCache(selectedText);
  //   }
  // });
  readYamlFiles();
  context.subscriptions.push(ca);
}

// This method is called when your extension is deactivated
export function deactivate() {}
