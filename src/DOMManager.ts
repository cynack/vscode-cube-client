import { Packet, OML } from './interface'
import * as uuid from 'uuid'
import * as assert from 'assert'

export default class DOMManager {
  DOM: DOM
  _DOMPath: {[id: string]: string[]}
  _errorFunction: Function
  constructor (OML: OML, errorFunction: Function) {
    this.DOM = { id: null }
    this._DOMPath = {}
    this._errorFunction = errorFunction
    const { newDOM } = this._OML2DOM(OML, this.DOM)
    this.DOM = newDOM
  }

  updateDOMByOML (OML: OML): Packet[] {
    const { newDOM, packets } = this._OML2DOM(OML, this.DOM)
    this.DOM = newDOM
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
            const { newDOM } = this._OML2DOM(OML, null)
            this.DOM = newDOM
          } else {
            const path = [...this._DOMPath[packet.data.targetId], packet.data.targetId]
            let DOM = this.DOM
            let parent = null
            if (path[0] !== this.DOM.id) {
              this._errorFunction('（　´∀｀）')
              return null
            }
            const { newDOM } = this._OML2DOM(OML, null, path)
            for (let id of path.slice(1)) {
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

  _OML2DOM (OML: OML, baseDOM: DOM, path?: string[]): {newDOM: DOM, packets: Packet[]} {
    let id = OML.id
    const dom = {} as DOM
    let packets = [] as Packet[]
    if (id == null) {
      if (baseDOM) {
        id = baseDOM.id
      } else {
        id = uuid.v4()
      }
    }
    if (path == null) {
      path = []
    }
    this._DOMPath[id] = path
    const childPath = [...path, id]

    let elementSet = false

    dom.id = id
    if (OML.component) {
      dom.component = OML.component
      if (baseDOM && OML.component !== baseDOM.component) {
        elementSet = true
      }
    }
    if (OML.scale) {
      dom.scale = OML.scale
      if (baseDOM && OML.scale !== baseDOM.scale) {
        elementSet = true
      }
    }
    if (OML.size) {
      dom.size = OML.size
      if (baseDOM && OML.size !== baseDOM.size) {
        elementSet = true
      }
    }
    if (OML.pos) {
      dom.pos = OML.pos
      if (baseDOM && OML.pos !== baseDOM.pos) {
        elementSet = true
      }
    }
    if (OML.rot) {
      dom.rot = OML.rot
      if (baseDOM && OML.pos !== baseDOM.pos) {
        elementSet = true
      }
    }
    if (OML.color) {
      dom.color = OML.color
      if (baseDOM && OML.pos !== baseDOM.pos) {
        elementSet = true
      }
    }
    if (OML.group) {
      dom.group = {}
      dom.groupOrder = []

      if (baseDOM) {
        if (baseDOM.groupOrder == null) {
          baseDOM.groupOrder = []
        }
        if (baseDOM.group == null) {
          elementSet = true
        }
        const checkedId = []
        for (let index = 0;index < OML.group.length;index++) {
          if (index >= baseDOM.groupOrder.length) {
            const { newDOM } = this._OML2DOM(OML.group[index], null, childPath)
            dom.group[newDOM.id] = newDOM
            dom.groupOrder.push(newDOM.id)
            packets.push({
              message: 'group.add',
              data: { parentId: id, oml: JSON.stringify(this.getOMLFromDOM(newDOM)) }
            } as Packet)
          } else {
            const _id = baseDOM.groupOrder[index]
            checkedId.push(_id)
            if (JSON.stringify(OML.group[index]) === JSON.stringify(baseDOM.group[_id])) {
              const { newDOM } = this._OML2DOM(OML.group[index], null, childPath)
              dom.group[_id] = newDOM
              dom.groupOrder.push(_id)
            } else {
              const { newDOM, packets: _packets } = this._OML2DOM(OML.group[index], baseDOM.group[_id], childPath)
              dom.group[_id] = newDOM
              dom.groupOrder.push(_id)
              packets = packets.concat(_packets)
            }
          }
        }
        baseDOM.groupOrder.forEach((id) => {
          if (checkedId.indexOf(id) === -1) {
            packets.push({
              message: 'group.del',
              data: { targetId: id }
            } as Packet)
          }
        })
      } else {
        for (let index = 0;index < OML.group.length;index++) {
          const { newDOM } = this._OML2DOM(OML.group[index], null, childPath)
          dom.group[newDOM.id] = newDOM
          dom.groupOrder.push(newDOM.id)
        }
      }
    }

    // group類もまとめて上書き
    if (elementSet) {
      packets = [{
        message: 'element.set',
        data: {
          targetId: id,
          oml: JSON.stringify(this.getOMLFromDOM(dom))
        }
      } as Packet]
    }

    return { newDOM: dom, packets }
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
  id: string
  scale?: string[] | number[]
  size?: string[] | number[]
  pos?: string[] | number[]
  rot?: string[] | number[]
  color?: string[] | number[]
}
