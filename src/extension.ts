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
    try {
      const server = await vscode.window.showInputBox({
        prompt: 'Websocket server address',
        value: 'ws://localhost:8080'
      })
      const ws = new Websocket(server)
      await new Promise((resolve, reject) => ws.on('open', resolve).on('error', reject))
      const domManager = await getInitialOML(ws)

      const document = await vscode.workspace.openTextDocument({
        language: 'oml',
        content: getCodeFromOML(domManager.getOMLFromDOM(), '  ')
      })
      const textEditor = await vscode.window.showTextDocument(document)

      let omlChache = JSON.stringify(domManager.getOMLFromDOM())
      vscode.window.onDidChangeTextEditorSelection(() => {
        if (vscode.window.activeTextEditor !== textEditor)return
        const OML = getOMLFromCode(document.getText())
        if (OML && JSON.stringify(OML) !== omlChache) {
          omlChache = JSON.stringify(OML)
          const packets = domManager.updateDOMByOML(OML as OML)
          if (packets.length !== 0) {
            ws.send(JSON.stringify(packets))
          }
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
          textEditor.edit(editBuilder => {
            editBuilder.delete(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(textEditor.document.lineCount, 0)))
            editBuilder.insert(new vscode.Position(0, 0), getCodeFromOML(OML, '  '))
          })
        }
      })
    } catch (e) {
      vscode.window.showErrorMessage(e.message)
      console.error(e)
    }
  })
  context.subscriptions.push(disposable)
}

function getInitialOML (ws: Websocket): Promise<DOMManater> {
  return new Promise<DOMManater>(resolve => {
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
          const domManager = new DOMManater(initialOML)
          resolve(domManager)
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
