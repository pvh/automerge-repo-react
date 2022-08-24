import React, { useEffect, useRef } from 'react'

import ProseMirror from './ProseMirror'
import { Command, EditorState, Transaction } from 'prosemirror-state'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap, toggleMark } from 'prosemirror-commands'
import { history, redo, undo } from 'prosemirror-history'
import { schema } from 'prosemirror-schema-basic'

import { default as PeritextSource } from './automerge/atjson/PeritextSource'
import { default as ProsemirrorRenderer } from './automerge/atjson/ProsemirrorRenderer'

import { prosemirrorTransactionToAutomerge } from './automerge/ProsemirrorTransactionToAutomerge'
import { convertAutomergeTransactionToProsemirrorTransaction } from './automerge/AutomergeToProsemirrorTransaction'
import { MarkType } from 'prosemirror-model'
import * as Automerge from 'automerge-js'
import { DocHandle, DocHandleEventArg } from 'automerge-repo'
import { TextKeyOf } from './automerge/AutomergeTypes'
import { attributedTextChanges } from './RichTextUtils'

export type EditorProps<T> = { handle: DocHandle<T>, attribute: TextKeyOf<T>, doc: Automerge.Doc<T>, changeDoc: any }

const toggleBold = toggleMarkCommand(schema.marks.strong)
const toggleItalic = toggleMarkCommand(schema.marks.em)

function toggleMarkCommand(mark: MarkType): Command {
  return (
    state: EditorState,
    dispatch: ((tr: Transaction) => void) | undefined
  ) => {
    return toggleMark(mark)(state, dispatch)
  }
}

export function Editor<T>({handle, attribute, doc, changeDoc}: EditorProps<T>) {
  const [state, setState] = React.useState<EditorState | null>(null)
  const [initialized, setInitialized] = React.useState<boolean>(false)
  const [currentHeads, setCurrentHeads] = React.useState<Automerge.Heads>()

  useEffect(() => {
    if (!doc) return
    if (initialized) return

    // for whatever reason the typesystem can't follow our maze here
    // but i promise, this is good!
    const text: Automerge.Text = doc[attribute] as any
    let atjsonDoc = PeritextSource.fromRaw(text, doc, attribute)
    let renderDoc = ProsemirrorRenderer.render(atjsonDoc)
    let editorConfig = {
      schema,
      doc: renderDoc,
      history,
      plugins: [
        keymap({
          ...baseKeymap,
          'Mod-b': toggleBold,
          'Mod-i': toggleItalic,
          'Mod-z': undo,
          'Mod-y': redo,
          'Mod-Shift-z': redo})
      ]
    }

    let newState = EditorState.create(editorConfig)
    setState(newState)

    setCurrentHeads(Automerge.getBackend(doc).getHeads())

    setInitialized(true)

    // in upwelling we found that the automerge object wasn't stable enough to
    // use reliably with useEffect, and ended up using a stable integer id for
    // the document instead. Not sure what to do with the automerge-repo
    // integration, @pvh?
  }, [attribute, handle, doc, initialized])

  /*
  useEffect(() => { 
    if (!state) return

    changeDoc((edits: any) => {
      let transaction = convertAutomergeTransactionToProsemirrorTransaction(
        doc,
        state,
        edits
      )

      if (transaction) {
        let newState = state.apply(transaction)
        setState(newState)
      }

      // remote cursor sync would go here if relevant
    })
    
    
    // in upwelling we found that the automerge object wasn't stable enough to
    // use reliably with useEffect, and ended up using a stable integer id for
    // the document instead. Not sure what to do with the automerge-repo
    // integration, @pvh?
  }, [doc, state, changeDoc])
  */

  useEffect(() => {
    if (!state || !currentHeads) return
    let funfun = (args: DocHandleEventArg<T>) => {
      const attribution = attributedTextChanges(args.doc, currentHeads, attribute)
      setCurrentHeads(Automerge.getBackend(args.doc).getHeads())

      const transaction = convertAutomergeTransactionToProsemirrorTransaction(
        args.doc,
        attribute,
        state,
        attribution
      )

      if (transaction) {
        let newState = state.apply(transaction)
        setState(newState)
      }
    }

    handle.on('change', funfun) 

    return (() => {
      handle.off('change', funfun)
    })
  }, [doc, attribute, handle, currentHeads, state])

  const viewRef = useRef(null)

  // This takes transactions from prosemirror and updates the automerge doc to
  // match.
  let dispatchHandler = (transaction: Transaction) => {
    if (!state) return

    prosemirrorTransactionToAutomerge(
      transaction,
      changeDoc,
      attribute,
      state
    )

    let newState = state.apply(transaction)
    setState(newState)
  }

  if (!state) return <div>loading</div>

  return (
    <ProseMirror
      state={state}
      ref={viewRef}
      dispatchTransaction={dispatchHandler}
    />
  )
}