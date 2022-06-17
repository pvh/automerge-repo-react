import logo from './logo.svg';
import './App.css';
import { useDocument } from './hooks'
import { useHandle } from './hooks'
import { Editor } from './prosemirror/Editor';
import { TodoList } from './components/TodoList';

function App({ rootDocumentId }) {
  const [doc, changeDoc] = useDocument(rootDocumentId)
  const [handle] = useHandle(rootDocumentId)
  const bumpCounter = (ev) => {
    changeDoc((doc) => {
      doc.count = doc.count+1
    })
  }
  
  if (!doc) return
  
  const { message, count } = doc
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          { message }
        </p>
        <TodoList documentId={rootDocumentId}/>
        <Editor doc={doc} changeDoc={changeDoc} handle={handle} attribute={'text'}/>
        <button onClick={bumpCounter}>We smashed it {count} times!</button>
      </header>
    </div>
  );
}

export default App;
