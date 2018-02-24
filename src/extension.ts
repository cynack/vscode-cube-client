'use strict'
import * as vscode from 'vscode'
import * as Websocket from 'ws'
import * as vm from 'vm'
import DOMManater from './DOMManager'
import { OML, Packet } from './interface'
// import * as jsStringify from 'javascript-stringify'
const jsStringify = require('javascript-stringify')

export function activate (context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('extension.connectServer', async () => {
    try {
      const server = await vscode.window.showInputBox({
        prompt: 'Websocket server address',
        value: 'ws://localhost:8080'
      })
      const ws = new Websocket(server)
      await new Promise((resolve, reject) => ws.on('open', resolve).on('error', reject))
      const OML = await getInitialOML(ws)
      const domManager = new DOMManater(OML)

      const document = await vscode.workspace.openTextDocument({ language: 'oml', content: getCodeFromOML(OML, '  ') })
      const textEdit = await vscode.window.showTextDocument(document)

      let omlChache = JSON.stringify(OML)
      vscode.window.onDidChangeTextEditorSelection(() => {
        if (vscode.window.activeTextEditor !== textEdit)return
        const OML = getOMLFromCode(document.getText())
        if (OML && JSON.stringify(OML) !== omlChache) {
          omlChache = JSON.stringify(OML)
          const packets = domManager.updateDOM(OML as OML)
          if (packets.length !== 0) {
            ws.send(JSON.stringify(packets))
          }
        }
      })
    } catch (e) {
      vscode.window.showErrorMessage(e.message)
      console.error(e)
    }
  })
  context.subscriptions.push(disposable)
}

function getInitialOML (ws: Websocket): Promise<OML> {
  return new Promise<OML>(resolve => {
    (function waitForRootOML () {
      ws.once('message', (data) => {
        try {
          const json = JSON.parse(data) as Packet[]
          const index = json.findIndex((json) => {
            if (json.message === 'element.set' && json.data.targetId == null) {
              return true
            }
            return false
          })
          if (index === -1) {
            return waitForRootOML()
          }
          const initialOML = JSON.parse(json[index].data.oml)
          resolve(initialOML)
        } catch (e) {
          waitForRootOML()
        }
      })
    })()
    ws.send(JSON.stringify([{
      message: 'element.get',
      data: { targetId: null }
    }] as Packet[]))
  })
}

function getOMLFromCode (code: string): boolean | OML {
  try {
    const script = new vm.Script(code)
    const sandbox = { module: { exports: {} } }
    script.runInContext(vm.createContext(sandbox))
    const result = sandbox.module.exports as any
    if (result.oml == null) {
      return {} as OML
    }
    return result.oml as OML
  } catch (e) {
    return false
  }
}

function getCodeFromOML (omlObj: OML, indent: string): string {
  const oml = jsStringify(
    { oml: omlObj },
    null,
    indent
  )
  return `module.exports = ${oml}`
}
