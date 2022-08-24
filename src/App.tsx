import * as Automerge from 'automerge-js';
import React from 'react';
import './App.css';
import { useDocument } from './hooks'
import { useHandle } from './hooks'
import { Editor } from './prosemirror/Editor';

export interface RootDocument {
  count: number
  message: Automerge.Text
  second: Automerge.Text
  details: { name: string, fun: boolean }
}

interface AppArgs {
  rootDocumentId: string
}

function App({ rootDocumentId }: AppArgs) {
  const [doc, changeDoc] = useDocument<RootDocument>(rootDocumentId)
  const [handle] = useHandle<RootDocument>(rootDocumentId)
  
  if (!doc || !handle) return

  return (
    <div className="App">
      <header className="App-header">
        <Editor doc={doc} changeDoc={changeDoc} handle={handle} attribute={'message'}/>
        <br></br>
        <Editor doc={doc} changeDoc={changeDoc} handle={handle} attribute={'second'}/>
      </header>
    </div>
  );
}

export default App;
