import React, { useEffect, useRef } from 'react'

import ProseMirror from './ProseMirror'
import { EditorState } from 'prosemirror-state'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import { history, redo, undo } from 'prosemirror-history'
import { schema } from 'prosemirror-schema-basic'

import { default as PeritextSource } from './automerge/atjson/PeritextSource'
import { default as ProsemirrorRenderer } from './automerge/atjson/ProsemirrorRenderer'

import { prosemirrorTransactionToAutomerge } from './automerge/ProsemirrorTransactionToAutomerge'
import { convertAutomergeTransactionToProsemirrorTransaction } from './automerge/AutomergeToProsemirrorTransaction'

export function Editor({doc, changeDoc}) {
  const [state, setState] = React.useState(null)

  console.log(doc, changeDoc)

  useEffect((amD) => {
    if (!amD) return
    let atjsonDoc = PeritextSource.fromRaw(amD)
    let doc = ProsemirrorRenderer.render(atjsonDoc)
    let editorConfig = {
      schema,
      amD,
      history,
      plugins: [
        keymap({...baseKeymap, 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo})
      ]
    }

    let newState = EditorState.create(editorConfig)
    setState(newState)

    // in upwelling we found that the automerge object wasn't stable enough to
    // use reliably with useEffect, and ended up using a stable integer id for
    // the document instead. Not sure what to do with the automerge-repo
    // integration, @pvh?
  }, [doc])

  useEffect((automergeDoc) => {
    if (!state) return

    automergeDoc.change((edits) => {
      let transaction = convertAutomergeTransactionToProsemirrorTransaction(
        automergeDoc,
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
  }, [doc, state])

  const viewRef = useRef(null)

  // This takes transactions from prosemirror and updates the automerge doc to
  // match.
  let dispatchHandler = (transaction) => {
    if (!state) return

    prosemirrorTransactionToAutomerge(
      transaction,
      doc,
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