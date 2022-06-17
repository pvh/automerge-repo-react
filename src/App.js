import './App.css';
import { useDocument } from './hooks'
import { useHandle } from './hooks'
import { Editor } from './prosemirror/Editor';

function App({ rootDocumentId }) {
  const [doc, changeDoc] = useDocument(rootDocumentId)
  const [handle] = useHandle(rootDocumentId)
  
  if (!doc) return

  return (
    <div className="App">
      <header className="App-header">
        <Editor doc={doc} changeDoc={changeDoc} handle={handle} attribute={'message'}/>
      </header>
    </div>
  );
}

export default App;
