import * as Automerge from "automerge-js"
import { Doc } from "automerge-js"
import { DocHandle, DocHandleEventArg } from "automerge-repo"
import { PluginKey, Plugin, EditorState } from "prosemirror-state"
import { convertAutomergeTransactionToProsemirrorTransaction } from "./automerge/AutomergeToProsemirrorTransaction"
import { TextKeyOf } from "./automerge/AutomergeTypes"
import { prosemirrorTransactionToAutomerge } from "./automerge/ProsemirrorTransactionToAutomerge"
import { attributedTextChanges } from "./RichTextUtils"

export interface AutomergePluginState {
  heads: string[]
}

export const automergePluginKey = new PluginKey<AutomergePluginState>(
  "automergeProsemirror"
)

export const automergePlugin = <T>(
  handle: DocHandle<T>,
  attribute: TextKeyOf<T>
) => {
  const plugin = new Plugin<AutomergePluginState>({
    key: automergePluginKey,
    state: {
      init(config, instance) {
        console.log("init plugin state")
        return { heads: [] }
      },
      apply(tr, value, oldState) {
        console.log("applying", value)

        const meta = tr.getMeta(automergePluginKey)
        if (meta) {
          return { heads: meta.heads }
        }

        prosemirrorTransactionToAutomerge(
          tr.steps,
          handle.change.bind(handle),
          attribute,
          oldState
        )
        return value
      },

      toJSON(value) {
        console.log("tojson: implemented but never attempted")
        return value
      },
      fromJSON(_config, value, _state) {
        console.log("fromjson: implemented but never attempted")
        return value
      },
    },
  })

  return plugin
}

export const createProsemirrorTransactionOnChange = <T>(
  state: EditorState,
  attribute: TextKeyOf<T>,
  args: DocHandleEventArg<T>
) => {
  const pluginState = automergePluginKey.getState(state)
  const currentHeads = pluginState?.heads
  if (!currentHeads) {
    throw new Error("No heads found on plugin state")
  }

  // TODO: Don't do any of this if there's no change

  const attribution = attributedTextChanges(args.doc, currentHeads, attribute)

  const transaction = convertAutomergeTransactionToProsemirrorTransaction(
    args.doc,
    attribute,
    state,
    attribution
  )

  transaction.setMeta(automergePluginKey, {
    heads: Automerge.getBackend(args.doc as Doc<T>).getHeads(),
  })

  return transaction
}
