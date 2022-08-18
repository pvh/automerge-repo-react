import { EditorState, Transaction } from 'prosemirror-state'
import {
  AddMarkStep,
  RemoveMarkStep,
  ReplaceAroundStep,
  ReplaceStep,
} from 'prosemirror-transform'
import { ChangeSet } from './AutomergeTypes';
// @ts-ignore
import { DocHandle } from 'automerge-repo/src/DocHandle'
import { prosemirrorToAutomerge } from './PositionMapper'

const emptyChangeSet: ChangeSet = { add: [], del: [] }

function handleReplaceStep(
  step: ReplaceStep,
  handle: DocHandle,
  state: EditorState
): ChangeSet {
  let changeSet: ChangeSet = {
    add: [],
    del: [],
  }

  const docString = handle.textToString('message')
  let { start, end } = prosemirrorToAutomerge(step, docString, state)

  if (end !== start) {
    let deleted = handle.doc["message"].deleteAt(start, end - start)
    changeSet.del.push({
      //actor: doc.getActorId(),
      pos: start,
      val: deleted?.join('') || '',
    })
  }

  if (step.slice) {
    let insOffset = start
    console.log(step.slice)
    let sliceSize = step.slice.content.size
    sliceSize -= step.slice.openStart + step.slice.openEnd
    step.slice.content.forEach((node, idx) => {
      if (node.type.name === 'text' && node.text) {
        changeSet.add.push({
          //actor: doc.getActorId(),
          start,
          end: start + node.text.length,
        })
        handle.textInsertAt('/message', insOffset, node.text)
        insOffset += node.text.length
      } else if (['paragraph', 'heading'].indexOf(node.type.name) !== -1) {
        if (sliceSize >= 2) {
          // this isn't a function, need to implement it somewhere
          console.log({handle, insOffset})
          //handle.insertBlock(handle.getObjId('/', 'message'), insOffset++, node.type.name)
          handle.textInsertBlock('/message', insOffset++, node.type.name)
          console.log('inserted block: ', handle.textGetBlock('/message', insOffset - 1))

          let nodeText = node.textBetween(0, node.content.size)
          console.log(`node text: --->${nodeText}<---`)
          changeSet.add.push({
            //actor: editableDraft.doc.getActorId(),
            start,
            end: start + nodeText.length,
          })
          if (nodeText.length > 0) {
            handle.textInsertAt('/message', insOffset, nodeText)
            insOffset += nodeText.length
          }
          sliceSize -= 2 // account for having effectively added an open and a close tag
        }
      } else {
        alert(
          `Hi! We would love to insert that text (and other stuff), but
          this is a research prototype, and that action hasn't been
          implemented.`
        )
      }
    })
  }

  return changeSet
}

function handleAddMarkStep(
  step: AddMarkStep,
  handle: DocHandle,
  state: EditorState
) { //: ChangeSet {
  const text = handle.doc["message"]
  const docString = handle.textToString('message')
  let { start, end } = prosemirrorToAutomerge(step, docString, state)
  let mark = step.mark

  if (mark.type.name === 'comment') {
    // again, isn't a function, needs implementation elsewhere
    text.insertComment(
      start,
      end,
      mark.attrs.message,
      mark.attrs.author.id
    )
  } else {
    text.mark(mark.type.name, `(${start}..${end})`, true)
  }

  // no way to encode mark changes in automerge attribution changesets (just yet)
  return emptyChangeSet
}

function handleRemoveMarkStep(
  step: RemoveMarkStep,
  handle: DocHandle,
  state: EditorState
) { //: ChangeSet {
  const text = handle.doc["message"]
  const docString = handle.textToString('message')
  // TK not implemented because automerge doesn't support removing marks yet
  let { start, end } = prosemirrorToAutomerge(step, docString, state)
  let mark = step.mark
  if (mark.type.name === 'strong' || mark.type.name === 'em') {
    text.mark(mark.type.name, `(${start}..${end})`, false)
  }

  // no way to encode mark changes in automerge attribution changesets (just yet)
  return emptyChangeSet
}

function handleReplaceAroundStep(
  step: ReplaceAroundStep,
  handle: DocHandle,
  state: EditorState
): ChangeSet {

  const text = handle.doc["message"]
  const docString = handle.textToString('message')
  // This is just a guard to prevent us from handling a ReplaceAroundStep
  // that isn't simply replacing the container, because implementing that
  // is complicated and I can't think of an example where this would be
  // the case!
  //
  // e.g. the normal case for p -> h1:
  //   start == <p>
  //   end == </p>
  //   gapStart == the first character of the paragraph
  //   gapEnd == the last character of the paragraph
  //
  // The step contains an empty node that has a `heading` type instead of
  // `paragraph`
  //
  if (
    //@ts-ignore: step.structure isn't defined in prosemirror's types
    !step.structure ||
    step.insert !== 1 ||
    step.from !== step.gapFrom - 1 ||
    step.to !== step.gapTo + 1
  ) {
    console.debug(
      'Unhandled scenario in ReplaceAroundStep (non-structure)',
      step
    )
  }

  let { start: gapStart, end: gapEnd } = prosemirrorToAutomerge(
    { from: step.gapFrom, to: step.gapTo },
    docString,
    state
  )

  // Double-check that we're doing what we think we are, i.e., replacing a parent node
  if (text[gapStart - 1] !== '\uFFFC') {
    console.error(
      `Unhandled scenario in ReplaceAroundStep, expected character at ${gapStart} (${text[
        gapStart - 1
      ].charCodeAt(0)}) to be ${'\uFFFC'.charCodeAt(0)}`,
      step
    )
    return emptyChangeSet
  }

  if (text[gapEnd] !== '\uFFFC' && gapEnd !== text.length) {
    console.error(
      `Unhandled scenario in ReplaceAroundStep, expected character at ${gapEnd} (${text[
        gapEnd
      ]?.charCodeAt(0)}) to be ${'\uFFFC'.charCodeAt(0)} or End of Document (${
        text.length
      })`,
      step
    )
    return emptyChangeSet
  }

  // Get the replacement node and extract its attributes and reset the block!
  let node = step.slice.content.maybeChild(0)
  if (!node) return emptyChangeSet

  let { type, attrs } = node

  // see previous usage of setBlock above, not a function
  text.setBlock(gapStart - 1, type.name, attrs)

  // setBlock doesn't map to a changeSet
  return emptyChangeSet
}

export const prosemirrorTransactionToAutomerge = (
  transaction: Transaction,
  handle: DocHandle,
  changeDoc: Function, //: a change function. God help us.
  state: EditorState,
) => {
  let changeSets: ChangeSet[] = []

  changeDoc((d: any) => {    
    for (let step of transaction.steps) {
      if (step instanceof ReplaceStep) {
        let replaceChanges = handleReplaceStep(step, handle, state)
        changeSets = changeSets.concat(replaceChanges)
      } else if (step instanceof AddMarkStep) {
        let addMarkChanges = handleAddMarkStep(step, handle, state)
        changeSets = changeSets.concat(addMarkChanges)
      } else if (step instanceof RemoveMarkStep) {
        let removeMarkChanges = handleRemoveMarkStep(step, handle, state)
        changeSets = changeSets.concat(removeMarkChanges)
      } else if (step instanceof ReplaceAroundStep) {
        let replaceAroundStepChanges = handleReplaceAroundStep(
          step,
          handle,
          state
        )

        changeSets = changeSets.concat(replaceAroundStepChanges)
      }
    }

    const docString = handle.textToString('message')
    const cursorPosition = prosemirrorToAutomerge(
      {
        from: transaction.selection.ranges[0].$from.pos,
        to: transaction.selection.ranges[0].$to.pos,
      },
      docString,
      state
    )

    // Combine ChangeSets from all steps.
    /*
    let changeSet = [
      changeSets.reduce((prev, curr) => {
        return {
          add: prev.add.concat(curr.add),
          del: prev.del.concat(curr.del),
        }
      }, emptyChangeSet),
    ]

    transaction.setMeta(automergeChangesKey, { changeSet })
    */
  })

}
