import { Packet, OML } from './interface'
import * as uuid from 'uuid'
import * as assert from 'assert'

export default class DOMManager {
  DOM: DOM
  _DOMPath: {[id: string]: string[]}
  _errorFunction: Function
  constructor (OML: OML, errorFunction: Function) {
    this.DOM = {}
    this._DOMPath = {}
    this._errorFunction = errorFunction
    this._addElementToDOM(OML, this.DOM)
  }

  updateDOMByOML (OML: OML): Packet[] {
    // TODO: よりよく（ごり押しなう）
    // 現在一番親のコンポーネントを入れ替え
    const packets: Packet[] = []
    this.DOM = {}
    this._addElementToDOM(OML, this.DOM)
    packets.push({
      message: 'element.set',
      data: {
        parentId: null,
        oml: JSON.stringify(this.getOMLFromDOM(this.DOM))
      }
    })
    return packets
  }

  updateDOMByPackets (packets: Packet[]): {packets: Packet[], update: boolean} {
    let update = false
    const sendPackets = packets.map(packet => {
      switch (packet.message) {
        case 'element.set': {
          let OML
          try {
            OML = JSON.parse(packet.data.oml)
          } catch (e) {
            return null
          }
          if (packet.data.targetId == null) {
            this.DOM = {}
            this._addElementToDOM(OML, this.DOM)
          } else {
            const path = [...this._DOMPath[packet.data.targetId], packet.data.targetId]
            let DOM = this.DOM
            let parent = null
            if (path[0] !== DOM.id) {
              this._errorFunction('（　´∀｀）')
              return null
            }
            for (let id of path.slice(1)) {
              parent = DOM
              if (!DOM.group && DOM.group[id]) {
                this._errorFunction('（　´∀｀）')
                return null
              }
              DOM = DOM.group[id]
              assert.equal(id, DOM.id)
            }
            this._addElementToDOM(OML, DOM, path, packet.data.targetId)
          }
          update = true
          return null
        }
        default: {
          throw new Error('not implemented')
        }
      }
    }).filter(data => data)
    return { packets: sendPackets , update }
  }

  _addElementToDOM (OML: OML, parent: DOM, path?: string[], id?: string) {
    if (id == null) {
      id = uuid.v4()
    }
    if (path == null) {
      path = []
    }
    this._DOMPath[id] = path
    parent.id = id
    if (OML.group) {
      parent.group = {}
      OML.group.forEach(element => {
        const _id = element.id == null ? uuid.v4() : element.id
        parent.group[_id] = {}
        path = path.slice()
        path.push(id)
        this._addElementToDOM(element, parent.group[_id], path, _id)
      })
    }
    if (OML.component)parent.component = OML.component
    if (OML.scale)parent.scale = OML.scale
    if (OML.size)parent.size = OML.size
    if (OML.pos)parent.pos = OML.pos
    if (OML.rot)parent.rot = OML.rot
    if (OML.color)parent.color = OML.color
  }

  getOMLFromDOM (DOM?: DOM): OML {
    if (!DOM) {
      DOM = this.DOM
    }
    const OML = {} as OML
    OML.id = DOM.id
    if (DOM.group) {
      OML.group = []
      for (let id in DOM.group) {
        const _OML = this.getOMLFromDOM(DOM.group[id])
        OML.group.push(_OML)
      }
    }
    if (DOM.component)OML.component = DOM.component
    if (DOM.scale)OML.scale = DOM.scale
    if (DOM.size)OML.size = DOM.size
    if (DOM.pos)OML.pos = DOM.pos
    if (DOM.rot)OML.rot = DOM.rot
    if (DOM.color)OML.color = DOM.color
    return OML
  }
}

export interface DOM {
  group?: {
    [id: string]: DOM
  }
  component?: string
  id?: string
  scale?: string[] | number[]
  size?: string[] | number[]
  pos?: string[] | number[]
  rot?: string[] | number[]
  color?: string[] | number[]
}
