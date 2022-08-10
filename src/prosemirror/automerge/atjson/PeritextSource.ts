import Document from '@atjson/document'
import { InlineAnnotation, BlockAnnotation } from '@atjson/document'
//import { Upwell, Draft, CommentState } from 'api'

export class Insertion extends InlineAnnotation<{
  author?: string
  authorColor: string
  text: string
}> {
  static vendorPrefix = 'automerge'
  static type = 'insert'
}

export class Deletion extends InlineAnnotation<{
  author?: string
  authorColor: string
  text: string
}> {
  static vendorPrefix = 'automerge'
  static type = 'delete'
}

export class Paragraph extends BlockAnnotation<{}> {
  static vendorPrefix = 'automerge'
  static type = 'paragraph'
}

export class Heading extends BlockAnnotation<{
  level: number
}> {
  static vendorPrefix = 'automerge'
  static type = 'heading'
}

export class Strong extends InlineAnnotation<{}> {
  static vendorPrefix = 'automerge'
  static type = 'strong'
}

export class Emphasis extends InlineAnnotation<{}> {
  static vendorPrefix = 'automerge'
  static type = 'em'
}

export class Comment extends InlineAnnotation<{}> {
  static vendorPrefix = 'automerge'
  static type = 'comment'
}

export default class AutomergeSource extends Document {
  static schema = [
    Comment,
    Deletion,
    Emphasis,
    Heading,
    Insertion,
    Paragraph,
    Strong,
  ]

  // This converts an upwell/automerge draft to an atjson document.
  static fromRaw(text: any, handle: any, attribute: any, parentObjId = '_root') {

    // first convert marks to annotations
    let objId = handle.getObjId(parentObjId, attribute)
    let marks = handle.getMarks(objId)

    console.log('text', text)

    marks.forEach((m: any) => {
      let attrs = {}
      //if (m.type === 'comment') {
        //attrs = doc.comments.get(m.value)
        //if (m.value.state === CommentState.CLOSED) return
        //if (!attrs) return
        //if (attrs) attrs.authorColor = upwell.getAuthorColor(attrs.author)
        //else attrs = { authorColor: '', message: '' }
      //} else {

      try {
        if (m.value && m.value.length > 0) attrs = JSON.parse(m.value)
        if (!attrs) return
      } catch {
        console.log(
          'Stuffing mark attrs into a string is not exactly ideal.'
        )
      }

      //}

      // I wonder if there's a (good) way to preserve the automerge identity of
      // the mark here (id? presumably?) Or I guess just the mark itself?) so
      // that we can do direct actions on the Upwell draft via the atjson annotation
      // as a proxy.
      marks.push({
        start: m.start,
        end: m.end,
        type: `-automerge-${m.type}`,
        attributes: attrs,
      })
    })

    // next convert blocks to annotations
    console.log(handle.textGetBlocks('message'))
    for (let b of handle.textGetBlocks('message')) {
      if (['paragraph', 'heading'].indexOf(b.type) === -1) b.type = 'paragraph'
      b.type = `-automerge-${b.type}`
      marks.push(b)
    }

    console.log(marks)
    // Insert a fake paragraph until we have native blocks working.
    /*
    marks.push({
      start: 0,
      end: text.length,
      type: '-automerge-paragraph',
      attributes: {}
    })
    */

    return new this({
      content: handle.textToString('message'),
      annotations: marks,
    })
  }
}
