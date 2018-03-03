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
    this.DOM = this._OML2DOM(OML)
  }

  updateDOMByOML (OML: OML): Packet[] {
    // TODO: よりよく（ごり押しなう）
    // 現在一番親のコンポーネントを入れ替え
    const packets: Packet[] = []
    // this._getDiffPackets(OML, this.DOM)
    this.DOM = this._OML2DOM(OML)
    packets.push({
      message: 'element.set',
      data: {
        targetId: null,
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
            this.DOM = this._OML2DOM(OML)
          } else {
            const path = [...this._DOMPath[packet.data.targetId], packet.data.targetId]
            let DOM = this.DOM
            let parent = null
            if (path[0] !== this.DOM.id) {
              this._errorFunction('（　´∀｀）')
              return null
            }
            const newDOM = this._OML2DOM(OML, path, packet.data.targetId)
            for (let id of path.slice(1)) {
              parent = DOM
              if (!DOM.group && DOM.group[id]) {
                this._errorFunction('（　´∀｀）')
                return null
              }
              if (packet.data.targetId === id) {
                DOM.group[id] = newDOM
                return null
              }
              DOM = DOM.group[id]
            }
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

  _OML2DOM (OML: OML, path?: string[], id?: string): DOM {
    const dom = {} as DOM
    if (id == null) {
      id = uuid.v4()
    }
    if (path == null) {
      path = []
    }
    this._DOMPath[id] = path
    dom.id = id
    if (OML.group) {
      dom.group = {}
      dom.groupOrder = []
      OML.group.forEach(element => {
        const _id = element.id == null ? uuid.v4() : element.id
        dom.group[_id] = {}
        dom.groupOrder.push(_id)
        path = path.slice()
        path.push(id)
        dom.group[_id] = this._OML2DOM(element, path, _id)
      })
    }
    if (OML.component)dom.component = OML.component
    if (OML.scale)dom.scale = OML.scale
    if (OML.size)dom.size = OML.size
    if (OML.pos)dom.pos = OML.pos
    if (OML.rot)dom.rot = OML.rot
    if (OML.color)dom.color = OML.color
    return dom
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
  groupOrder?: Array<string>
  component?: string
  id?: string
  scale?: string[] | number[]
  size?: string[] | number[]
  pos?: string[] | number[]
  rot?: string[] | number[]
  color?: string[] | number[]
}
