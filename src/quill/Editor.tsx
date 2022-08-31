import React, { useEffect, useRef } from 'react'

import * as Automerge from 'automerge-js'
import { DocHandle, DocHandleEventArg } from 'automerge-repo'
import { TextKeyOf } from '../prosemirror/automerge/AutomergeTypes'

import { Doc } from 'automerge-js'

import Quill from 'quill'
import Delta from 'quill-delta'

import { attributedTextChanges, textToString } from "../prosemirror/RichTextUtils"

function getDelta<T>(doc: Doc<T>, attribute: TextKeyOf<T>, prevHeads: string[]): { delta: Delta, newHeads: string[] } {
  let delta = new Delta()
  const docString = textToString(doc, attribute)
  const newHeads: string[] = Automerge.getBackend(doc as Doc<T>).getHeads()

  if (prevHeads[0] === newHeads[0]) {
    return { delta: delta.retain(docString.length), newHeads }
  }

  const attribution = attributedTextChanges(doc, prevHeads, attribute)
  console.log('quill, attribution', attribution)

  let changes: {start: number, ins?: string, del?: string}[] = []
  for (const changeset of attribution) {
    changeset.add.forEach(addition => {
      const text = docString.substring(addition.start, addition.end)
      changes.push({ start: addition.start, ins: text })
    })

    changeset.del.forEach(deletion => {
      changes.push({ start: deletion.pos, del: deletion.val })
    })
  }

  let currIdx = 0
  changes.sort((a, b) => a.start - b.start).forEach((change) => {
    if (currIdx < change.start) {
      delta.retain(change.start - currIdx)
      currIdx = change.start
    }
    
    if (change.ins) {
      delta.insert(change.ins)
      currIdx += change.ins.length
    } else if (change.del) {
      delta.delete(change.del.length)
      currIdx += change.del.length
    }
  })

  if (currIdx < docString.length) delta.retain(docString.length - currIdx)

  // quill always wants a trailing newline :shrug:
  //delta.insert('\n')

  console.log({prevHeads, newHeads, attribution, delta})

  return { delta, newHeads }
}

function applyDeltaToAutomerge<T>(delta: Delta, doc: Doc<T>, attribute: string): string[] {
  return []
}

export type EditorProps<T> = { handle: DocHandle<T>, attribute: TextKeyOf<T>, doc: Automerge.Doc<T>, changeDoc: any }

export function QuillEditor<T>({handle, attribute, doc}: EditorProps<T>) {
  const editorRoot = useRef<HTMLDivElement>(null!);

  useEffect(() => {

    let editor = new Quill(editorRoot.current)
    let heads: string[] = []

    handle.value().then(doc => {
      const { delta, newHeads } = getDelta(doc, attribute, heads)
      console.log('updating contents', editor, delta)
      editor.updateContents(delta, 'api')
      heads = newHeads
    })

    const onChange = (args: DocHandleEventArg<T>) => {
      const { delta, newHeads } = getDelta(args.doc, attribute, heads)
      editor.updateContents(delta, 'api')
      heads = newHeads
    }
    handle.on('change', onChange)

    const onQuillChange = (delta: Delta) => {
      heads = applyDeltaToAutomerge(delta, doc, attribute)
    }
//    editor.on('text-change', onQuillChange)

    /* move this out, we're in a then */ 
    return (() => {
      console.log('cleaning up')
      handle.off('change', onChange)
      //editor.destroy()
    })
  }, [handle, attribute])

  return <div ref={editorRoot}></div>
}