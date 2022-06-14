import Document from '@atjson/document'
import { InlineAnnotation, BlockAnnotation } from '@atjson/document'
//import { Upwell, Draft, CommentState } from 'api'

export class Insertion extends InlineAnnotation /*<{
  author?: string
  authorColor: string
  text: string
}> */ {
  static vendorPrefix = 'automerge'
  static type = 'insert'
}

export class Deletion extends InlineAnnotation /*<{
  author?: string
  authorColor: string
  text: string
}>*/ {
  static vendorPrefix = 'automerge'
  static type = 'delete'
}

export class Paragraph extends BlockAnnotation /*<{}>*/ {
  static vendorPrefix = 'automerge'
  static type = 'paragraph'
}

export class Heading extends BlockAnnotation /*<{
  level: number
}>*/ {
  static vendorPrefix = 'automerge'
  static type = 'heading'
}

export class Strong extends InlineAnnotation /*<{}>*/ {
  static vendorPrefix = 'automerge'
  static type = 'strong'
}

export class Emphasis extends InlineAnnotation /*<{}>*/ {
  static vendorPrefix = 'automerge'
  static type = 'em'
}

export class Comment extends InlineAnnotation /*<{}>*/ {
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
  static fromRaw(doc /*: AutomergeDoc, upwell: Upwell*/) {
    // first convert marks to annotations
    let marks = []
    doc.marks.forEach((m) => {
      let attrs = {}
      if (m.type === 'comment') {
        attrs = doc.comments.get(m.value)
        //if (m.value.state === CommentState.CLOSED) return
        if (!attrs) return
        //if (attrs) attrs.authorColor = upwell.getAuthorColor(attrs.author)
        else attrs = { authorColor: '', message: '' }
      } else {
        try {
          if (m.value && m.value.length > 0) attrs = JSON.parse(m.value)
          if (!attrs) return

          if (m.type === 'insert' || m.type === 'delete') {
            //attrs['authorColor'] = upwell.getAuthorColor(attrs.author)
          }
        } catch {
          console.log(
            'we should really fix the thing where I stuffed mark attrs into a json string lol'
          )
        }
      }

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
    for (let b of doc.blocks) {
      if (['paragraph', 'heading'].indexOf(b.type) === -1) b.type = 'paragraph'
      b.type = `-automerge-${b.type}`
      marks.push(b)
    }

    return new this({
      content: doc.text,
      annotations: marks,
    })
  }
}
