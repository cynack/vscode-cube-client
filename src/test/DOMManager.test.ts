declare var suite
declare var test

import * as assert from 'assert'
import * as vscode from 'vscode'
import * as chai from 'chai'
import DOMManager from '../DOMManager'
import { Packet } from '../interface'
const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/

suite('DOMManager Tests', () => {
  test('constructor, check DOM', () => {
    const domManager = new DOMManager({}, console.error)
    chai.expect(domManager)
      .to.have.property('DOM')
      .to.have.property('id').match(uuid)
  })
  test('constructor, getOML check', () => {
    const domManager = new DOMManager({}, console.error)
    // {"id":uuid}
    chai.expect(domManager.getOMLFromDOM())
      .to.have.property('id').match(uuid)
  })
  test('include group constructor', () => {
    const domManager = new DOMManager({ group: [] }, console.error)
    // {"id":uuid,"group":[]}
    chai.expect(domManager.getOMLFromDOM())
      .to.deep.include({ 'group': [] })
      .to.have.property('id').match(uuid)
  })
  test('include component constructor', () => {
    const domManager = new DOMManager({ component: '@cube' }, console.error)
    // {"id":uuid,"component":"@cube"}
    chai.expect(domManager.getOMLFromDOM())
      .to.deep.include({ 'component': '@cube' })
      .to.have.property('id').match(uuid)
  })
  test('get packets', () => {
    const domManager = new DOMManager({}, console.error)
    const packets = domManager.updateDOMByOML({ group: [] })
    // {"id":uuid,"group":[]}
    chai.expect(domManager.getOMLFromDOM())
      .to.have.deep.include({ group: [] })
      .to.have.property('id').match(uuid)
  })
  test('get packets2', () => {
    const domManager = new DOMManager({ group: [{ id: 'testId', component: '@cube' }] }, console.error)
    const packets = domManager.updateDOMByOML({ group: [{ id: 'testId', component: '@sphere' }] })
    // {"id":uuid,"group":[{"id":uuid,"component":"@sphere"}]}
    chai.expect(domManager.getOMLFromDOM())
      .to.have.property('id').match(uuid)
    chai.expect(domManager.getOMLFromDOM())
      .to.have.nested.include({ 'group[0].component': '@sphere' })
      .to.have.nested.include({ 'group[0].id': 'testId' })
  })
  test('packet should difference only', () => {
    const domManager = new DOMManager({ group: [{ id: 'testId', component: '@cube' }] }, console.error)
    const packets = domManager.updateDOMByOML({ group: [{ id: 'testId', component: '@sphere' }] })
    // [{"message":"element.set","data":{"targetId":"testId","oml":"{\"id\":\"testId\",\"component\":\"@sphere\"}"}}]
    chai.expect(packets)
      .to.have.lengthOf(1)
    chai.expect(packets[0])
      .to.have.nested.include({ 'message': 'element.set' })
      .to.have.nested.include({ 'data.targetId': 'testId' })
      .to.have.nested.include({ 'data.oml': '{"id":"testId","component":"@sphere"}' })
  })
  test('apply packet', () => {
    const domManager = new DOMManager({}, console.error)
    domManager.updateDOMByPackets([{
      message: 'element.set',
      data: {
        targetId: null,
        oml: '{"group":[{"component":"@cube"}]}'
      }
    } as Packet])
    // {"id":uuid,"group":[{"id":uuid,"component":"@cube"}]}
    chai.expect(domManager.getOMLFromDOM())
      .to.have.property('id').match(uuid)
    chai.expect(domManager.getOMLFromDOM())
      .to.have.nested.include({ 'group[0].component': '@cube' })
      .to.have.nested.property('group[0].id').match(uuid)
  })
  test('apply packet with target id', () => {
    const domManager = new DOMManager({
      group: [
        {
          id: 'testId',
          group: [
            {
              id: 'testId2',
              component: '@cube'
            }
          ]
        }
      ]
    }, console.error)
    domManager.updateDOMByPackets([{
      message: 'element.set',
      data: {
        targetId: 'testId2',
        oml: '{"id":"testId3","component":"@sphere"}'
      }
    } as Packet])
    // {"id":uuid,"group":[{"id":"testId","component":"@sphere"}]}
    chai.expect(domManager.getOMLFromDOM())
      .to.have.nested.include({ 'group[0].id': 'testId' })
      .to.have.nested.include({ 'group[0].group[0].id': 'testId3' })
      .to.have.nested.include({ 'group[0].group[0].component': '@sphere' })
      .to.have.property('id').match(uuid)
  })
})
