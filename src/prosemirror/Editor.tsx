import React, { useEffect, useRef } from 'react'

import ProseMirror from './ProseMirror'
import { EditorState, Transaction } from 'prosemirror-state'
import { keymap } from 'prosemirror-keymap'
import { baseKeymap } from 'prosemirror-commands'
import { history, redo, undo } from 'prosemirror-history'
import { schema } from 'prosemirror-schema-basic'

import { default as PeritextSource } from './automerge/atjson/PeritextSource'
import { default as ProsemirrorRenderer } from './automerge/atjson/ProsemirrorRenderer'

import { prosemirrorTransactionToAutomerge } from './automerge/ProsemirrorTransactionToAutomerge'
import { convertAutomergeTransactionToProsemirrorTransaction } from './automerge/AutomergeToProsemirrorTransaction'

export type EditorProps = { handle: any, attribute: any, doc: any, changeDoc: any }

export function Editor({handle, attribute, doc, changeDoc}: EditorProps) {
  const [state, setState] = React.useState<EditorState | null>(null)
  const [initialized, setInitialized] = React.useState<boolean>(false)

  useEffect(() => {
    if (!doc) return
    if (initialized) return

    let atjsonDoc = PeritextSource.fromRaw(doc[attribute], handle, attribute)
    let renderDoc = ProsemirrorRenderer.render(atjsonDoc)
    let editorConfig = {
      schema,
      doc: renderDoc,
      history,
      plugins: [
        keymap({...baseKeymap, 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo})
      ]
    }

    let newState = EditorState.create(editorConfig)
    setState(newState)

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
    if (!state) return

    console.log('setting this up')

    let funfun = (args: any) => {
      if (args.attribution) {
        console.log('my change!', args)
      } else {
        console.log('no attribution :(')
      }

      if (!args.attribution) return

      const transaction = convertAutomergeTransactionToProsemirrorTransaction(
        doc,
        handle,
        state,
        args.attribution
      )

      console.log('transaction!', transaction)

      if (transaction) {
        let newState = state.apply(transaction)
        setState(newState)
      }
    }

    handle.on('change', funfun) 

    return (() => {
      console.log('unsubscribing')
      handle.off('change', funfun)
    })
  }, [doc, handle, state])

  const viewRef = useRef(null)

  // This takes transactions from prosemirror and updates the automerge doc to
  // match.
  let dispatchHandler = (transaction: Transaction) => {
    if (!state) return

    prosemirrorTransactionToAutomerge(
      transaction,
      handle,
      changeDoc,
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