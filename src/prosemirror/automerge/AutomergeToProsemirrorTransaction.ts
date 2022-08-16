import { ReplaceStep } from 'prosemirror-transform'
import { Fragment, Slice } from 'prosemirror-model'
import { schema } from 'prosemirror-schema-basic'
import { automergeToProsemirror, BLOCK_MARKER } from './PositionMapper'

import { EditorState, Transaction } from 'prosemirror-state'
import { AutomergeDoc, AutomergeTransaction, ChangeSetAddition, ChangeSetDeletion } from './AutomergeTypes'
import DocHandle from 'automerge-repo/src/DocHandle'

const convertAddToStep: (
  doc: AutomergeDoc,
  handle: DocHandle,
) => (added: ChangeSetAddition) => ReplaceStep = (doc: AutomergeDoc, handle: DocHandle) => {
   return (added: ChangeSetAddition) => {
    console.log('string', handle.textToString('/message'))
    const docString = handle.textToString('/message')
    let text = docString.substring(added.start, added.end)
    let { from } = automergeToProsemirror(added, doc)
    let nodes = []
    let blocks = text.split(BLOCK_MARKER)

    let depth = blocks.length > 1 ? 1 : 0

    // blocks: [ "text the first", "second text", "text" ]
    //          ^ no pgh break    ^ pgh break    ^ pgh break 2

    // the first text node here doesn't get a paragraph break
    let block = blocks.shift()
    if (!block) {
      let node = schema.node('paragraph', {}, [])
      nodes.push(node)
    } else {
      if (blocks.length === 0) {
        nodes.push(schema.text(block))
      } else {
        nodes.push(schema.node('paragraph', {}, schema.text(block)))
      }
    }

    blocks.forEach((block: string /* this might be wrong. i'm so sorry */) => {
      // FIXME this might be wrong for e.g. a paste with multiple empty paragraphs
      if (block.length === 0) {
        nodes.push(schema.node('paragraph', {}, []))
        return
      } else {
        let node = schema.node('paragraph', {}, schema.text(block))
        nodes.push(node)
      }
    })

    let fragment = Fragment.fromArray(nodes)
    let slice = new Slice(fragment, depth, depth)

    return new ReplaceStep(from, from, slice)
  }
}

const convertDeleteToStep: (
  doc: AutomergeDoc
) => (deleted: ChangeSetDeletion) => ReplaceStep = (doc: AutomergeDoc) => {
  // FIXME this should work, but the attribution steps we're getting
  // back from automerge are incorrect, so it breaks.
  return (deleted) => {
    let text = deleted.val
    let { from, to } = automergeToProsemirror(
      { start: deleted.pos, end: deleted.pos + text.length },
      doc
    )
    let fragment = Fragment.fromArray([])
    let slice = new Slice(fragment, 0, 0)
    return new ReplaceStep(from, to, slice)
  }
}

export const convertAutomergeTransactionToProsemirrorTransaction: (
  doc: AutomergeDoc,
  handle: DocHandle,
  state: EditorState,
  edits: AutomergeTransaction
) => Transaction | undefined = (
  doc: AutomergeDoc,
  handle: DocHandle,
  state: EditorState,
  edits: AutomergeTransaction
) => {
  console.log('wahey, here are edits', edits)
  if (!edits) return

  let tr = state.tr

  for (const changeset of edits) {
    //{add: {start: 3, end: 4}, del: []}

    changeset.add.map(convertAddToStep(doc, handle)).map((step) => tr.step(step))
    changeset.del.map(convertDeleteToStep(handle)).map((step) => tr.step(step))
  }

  // This is pretty inefficient. This whole changes thing kind of needs a
  // refactor to just pass around minimal diffs.
  //
  // in upwell, this bit updates the change highlighting; despite the
  // 'inefficient' comment, it's pretty fast.
  /*
  let automergeChangesState = tr.getMeta(automergeChangesKey)
  if (!automergeChangesState) automergeChangesState = {}
  if (automergeChangesState.doc !== doc) {
    automergeChangesState.doc = doc
    tr.setMeta(automergeChangesKey, automergeChangesState)
  }
  */

  return tr
}
