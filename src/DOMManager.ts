import { Packet, OML } from './interface'
import * as uuid from 'uuid'

export default class DOMManager {
  DOM: DOM
  constructor (OML: OML) {
    this.DOM = {}
    this._addElementToDOM(OML, this.DOM)
  }

  updateDOM (OML: OML): Packet[] {
    // TODO: よりよく（ごり押しなう）
    // 現在一番親のコンポーネントを入れ替え
    const packets: Packet[] = []
    this.DOM = {}
    packets.push({ message: 'group.del', data: { targetId: null } } as Packet)
    this._addElementToDOM(OML, this.DOM)
    packets.push({
      message: 'group.add',
      data: {
        parentId: null,
        oml: JSON.stringify(this._getOMLFromDOM(this.DOM))
      }
    })
    return packets
  }

  _addElementToDOM (OML: OML, parent: DOM, id?: string) {
    if (id == null) {
      id = uuid.v4()
    }
    parent.id = id
    if (OML.group) {
      parent.group = {}
      OML.group.forEach(element => {
        const id = uuid.v4()
        parent.group[id] = {}
        this._addElementToDOM(element, parent.group[id], id)
      })
    }
    if (OML.component)parent.component = OML.component
    if (OML.scale)parent.scale = OML.scale
    if (OML.size)parent.size = OML.size
    if (OML.pos)parent.pos = OML.pos
    if (OML.rot)parent.rot = OML.rot
    if (OML.color)parent.color = OML.color
  }

  _getOMLFromDOM (DOM: DOM): OML {
    const OML = {} as OML
    OML.id = DOM.id
    if (DOM.group) {
      OML.group = []
      for (let id in DOM.group) {
        const _OML = this._getOMLFromDOM(DOM.group[id])
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
