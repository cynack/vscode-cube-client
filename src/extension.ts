'use strict'
import * as vscode from 'vscode'
import * as Websocket from 'ws'
import * as vm from 'vm'
import DOMManater from './DOMManager'
import { OML, Packet, OMLNoID } from './interface'
// import * as jsStringify from 'javascript-stringify'
const jsStringify = require('javascript-stringify')

export function activate (context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('extension.connectServer', async () => {
    const server = await vscode.window.showInputBox({
      prompt: 'Websocket server address',
      value: 'ws://localhost:8080'
    })
    if (server == null)return
    const ws = new Websocket(server)
    await new Promise((resolve, reject) => ws.on('open', resolve).on('error', reject))
    const domManager = new DOMManater({}, vscode.window.showErrorMessage)
    const config = vscode.workspace.getConfiguration('editor', null as null as undefined)
    const indent = config.get('insertSpaces')
      ? ' '.repeat(config.get('tabSize'))
      : '\t'

    const document = await vscode.workspace.openTextDocument({
      language: 'oml',
      content: getCodeFromOML(domManager.getOMLFromDOM(), indent)
    })
    const textEditor = await vscode.window.showTextDocument(document)

    let OMLChache
    vscode.workspace.onDidChangeTextDocument((evt) => {
      if (evt.document !== document)return
      const OML = getOMLFromCode(document.getText())
      if (OML && JSON.stringify(OML) !== OMLChache && checkOML(OML)) {
        OMLChache = JSON.stringify(OML)
        const packets = domManager.updateDOMByOML(OML as OML)
        if (packets.length !== 0) {
          ws.send(JSON.stringify(packets))
        }
      }
    })
    vscode.workspace.onDidCloseTextDocument((textDocument) => {
      if (document === textDocument) {
        ws.close()
      }
    })
    ws.on('message', async (data) => {
      let recievePackets
      try {
        recievePackets = JSON.parse(data.toString()) as Packet[]
      } catch (e) {
        return
      }
      const { packets: sendPackets, update } = domManager.updateDOMByPackets(recievePackets)
      sendPackets.forEach(packet => {
        ws.send(JSON.stringify(packet))
      })
      if (update) {
        const OML = domManager.getOMLFromDOM()
        const edits = [
          vscode.TextEdit.delete(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineCount, 0))),
          vscode.TextEdit.insert(new vscode.Position(0, 0), getCodeFromOML(OML, indent))
        ]
        const edit = new vscode.WorkspaceEdit()
        edit.set(document.uri, edits)
        vscode.workspace.applyEdit(edit)
      }
    })

    ws.send(JSON.stringify([{
      message: 'element.get',
      data: { targetId: null }
    }] as Packet[]))
  })
  context.subscriptions.push(disposable)
}

function getOMLFromCode (code: string): OMLNoID {
  try {
    const script = new vm.Script(code)
    const sandbox = { module: { exports: {} } }
    script.runInContext(vm.createContext(sandbox))
    const result = sandbox.module.exports as any
    if (result.oml == null) {
      return {} as OMLNoID
    }
    return result.oml as OMLNoID
  } catch (e) {
    return
  }
}

function getCodeFromOML (OML: OML, indent: string): string {
  const oml = jsStringify(
    { oml: deleteIdFromOML(OML) },
    null,
    indent
  )
  return `module.exports = ${oml}`
}

function deleteIdFromOML (OML: OML): OMLNoID {
  const newOML = Object.assign({}, OML) as OML
  if (newOML.id) {
    delete newOML.id
  }
  if (newOML.group) {
    newOML.group = newOML.group.map(deleteIdFromOML)
  }
  return newOML
}

const componentReg = /@(cube|sphere|cylinder|plane|model\(.*\))/
function checkOML (OML: OML): boolean {
  if (OML.component == null && OML.group == null) {
    return false
  }
  if (OML.component != null) {
    if (!componentReg.test(OML.component))return false
  }
  if (OML.group != null) {
    for (const _OML of OML.group) {
      if (!checkOML(_OML)) {
        return false
      }
    }
  }
  return true
}
