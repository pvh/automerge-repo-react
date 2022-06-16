
import 'prosemirror-view/style/prosemirror.css';

import React, { useState } from 'react';
import {schema} from 'prosemirror-schema-basic';
import { EditorState } from 'prosemirror-state';
import ProseMirror from './ProseMirror';
import * as Automerge from 'automerge-js'

export default function AutomergeProseMirror({ doc, changeDoc }) {
  if (!doc.text) {
    changeDoc(d => d.text = new Automerge.Text("hello"))
  }
  const [state, setState] = useState(() => EditorState.create({ schema, doc: schema.node("paragraph", null, [schema.text("One.")]) }));
  return <ProseMirror state={state} onChange={setState} />;
};