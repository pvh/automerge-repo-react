import { EditorState, Transaction } from 'prosemirror-state'
import {
  AddMarkStep,
  RemoveMarkStep,
  ReplaceAroundStep,
  ReplaceStep,
} from 'prosemirror-transform'
import { ChangeSet, TextKeyOf } from './AutomergeTypes';
import { prosemirrorToAutomerge } from './PositionMapper'
import { textInsertAt, textInsertBlock, textMark, textToString } from '../RichTextUtils';
import { Text, Doc } from 'automerge-js';

const emptyChangeSet: ChangeSet = { add: [], del: [] }

function handleReplaceStep<T>(
  step: ReplaceStep,
  doc: Doc<T>,
  attribute: TextKeyOf<T>,
  state: EditorState
): ChangeSet {
  let changeSet: ChangeSet = {
    add: [],
    del: [],
  }


  const docString = textToString(doc, attribute)
  let { start, end } = prosemirrorToAutomerge(step, docString, state)

  if (end !== start) {
    const text: Text = doc[attribute] as any
    // the type system can't keep track but we can. otherwise this is: T[TextKeyOf<T>]
    
    // XXX: orion fixing this
    let deleted = text.deleteAt(start, end - start)
    changeSet.del.push({
      //actor: doc.getActorId(),
      pos: start,
      val: /*deleted?.join('') || XXX: deleteAt has void type in this version of automerge */ '',
    })
  }

  if (step.slice) {
    let insOffset = start
    let sliceSize = step.slice.content.size
    sliceSize -= step.slice.openStart + step.slice.openEnd
    step.slice.content.forEach((node, idx) => {
      if (node.type.name === 'text' && node.text) {
        changeSet.add.push({
          //actor: doc.getActorId(),
          start,
          end: start + node.text.length,
        })
        // XXX blaine: i removed a handle.replace(doc) call inside this method. seems fine?
        textInsertAt(doc, `/${attribute}`, insOffset, node.text)
        insOffset += node.text.length
      } else if (['paragraph', 'heading'].indexOf(node.type.name) !== -1) {
        if (sliceSize >= 2) {
          // this isn't a function, need to implement it somewhere
          //insertBlock(doc, handle.getObjId('/', attribute), insOffset++, node.type.name)
          textInsertBlock(doc, `/${attribute}`, insOffset++, node.type.name)

          let nodeText = node.textBetween(0, node.content.size)
          changeSet.add.push({
            //actor: editableDraft.doc.getActorId(),
            start,
            end: start + nodeText.length,
          })
          if (nodeText.length > 0) {
            textInsertAt(doc, `/${attribute}`, insOffset, nodeText)
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

function handleAddMarkStep<T>(
  step: AddMarkStep,
  doc: Doc<T>,
  attribute: TextKeyOf<T>,
  state: EditorState
) { //: ChangeSet {
  const docString = textToString(doc, attribute)
  let { start, end } = prosemirrorToAutomerge(step, docString, state)
  let mark = step.mark

  if (mark.type.name === 'comment') {
    // again, isn't a function, needs implementation elsewhere
    /*text.insertComment(
      start,
      end,
      mark.attrs[attribute],
      mark.attrs.author.id
    )*/
  } else {
    textMark(doc, `/${attribute}`, `(${start}..${end})`, mark.type.name, "true")
  }

  // no way to encode mark changes in automerge attribution changesets (just yet)
  return emptyChangeSet
}

function handleRemoveMarkStep<T>(
  step: RemoveMarkStep,
  doc: Doc<T>,
  attribute: TextKeyOf<T>,
  state: EditorState
) { //: ChangeSet {
  const docString = textToString(doc, attribute)
  // TK not implemented because automerge doesn't support removing marks yet
  let { start, end } = prosemirrorToAutomerge(step, docString, state)
  let mark = step.mark
  if (mark.type.name === 'strong' || mark.type.name === 'em') {
    textMark(doc, `/${attribute}`, mark.type.name, `(${start}..${end})`, "false")
  }

  // no way to encode mark changes in automerge attribution changesets (just yet)
  return emptyChangeSet
}

function handleReplaceAroundStep<T>(
  step: ReplaceAroundStep,
  doc: Doc<T>,
  attribute: TextKeyOf<T>,
  state: EditorState
): ChangeSet {

  const text: Text = doc[attribute] as any
  const docString = textToString(doc, attribute)
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
      `Unhandled scenario in ReplaceAroundStep, expected character at ${gapStart} (${(text[
        gapStart - 1
      ]! as string).charCodeAt(0)}) to be ${'\uFFFC'.charCodeAt(0)}`,
      step
    )
    return emptyChangeSet
  }

  if (text[gapEnd] !== '\uFFFC' && gapEnd !== text.length) {
    console.error(
      `Unhandled scenario in ReplaceAroundStep, expected character at ${gapEnd} (${(text[
        gapStart - 1
      ]! as string)}) to be ${'\uFFFC'.charCodeAt(0)} or End of Document (${
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
  // ??? Blaine? text.setBlock(gapStart - 1, type.name, attrs)

  // setBlock doesn't map to a changeSet
  return emptyChangeSet
}

export const prosemirrorTransactionToAutomerge = <T>(
  transaction: Transaction,
  changeDoc: (cb: (doc: Doc<T>) => void) => void,
  attribute: TextKeyOf<T>,
  state: EditorState,
) => {
  let changeSets: ChangeSet[] = []

  changeDoc((doc: Doc<T>) => {
    for (let step of transaction.steps) {
      if (step instanceof ReplaceStep) {
        let replaceChanges = handleReplaceStep(step, doc, attribute, state)
        changeSets = changeSets.concat(replaceChanges)
      } else if (step instanceof AddMarkStep) {
        let addMarkChanges = handleAddMarkStep(step, doc, attribute, state)
        changeSets = changeSets.concat(addMarkChanges)
      } else if (step instanceof RemoveMarkStep) {
        let removeMarkChanges = handleRemoveMarkStep(step, doc, attribute, state)
        changeSets = changeSets.concat(removeMarkChanges)
      } else if (step instanceof ReplaceAroundStep) {
        let replaceAroundStepChanges = handleReplaceAroundStep(
          step,
          doc,
          attribute, 
          state
        )

        changeSets = changeSets.concat(replaceAroundStepChanges)
      }
    }

    const docString = textToString(doc, attribute)
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
