export interface Packet {
  message: string,
  data: {
    targetId?: string,
    oml?: string
  }
}

export interface OML {
  group?: OML[]
  component?: string
  id?: string
  scale?: string[] | number[]
  size?: string[] | number[]
  pos?: string[] | number[]
  rot?: string[] | number[]
  color?: string[] | number[]
}

export interface OMLNoID {
  group?: OMLNoID[]
  component?: string
  scale?: string[] | number[]
  size?: string[] | number[]
  pos?: string[] | number[]
  rot?: string[] | number[]
  color?: string[] | number[]
}
