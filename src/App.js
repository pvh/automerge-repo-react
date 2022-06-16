import logo from './logo.svg';
import './App.css';
import { useDocument } from './hooks'
import AutomergeProsemirror from './components/AutomergeProsemirror';
import { TodoList } from './components/TodoList';

function App({ rootDocumentId }) {
  const [doc, changeDoc] = useDocument(rootDocumentId)
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
        <AutomergeProsemirror doc={doc} changeDoc={changeDoc}/>
        <button onClick={bumpCounter}>We smashed it {count} times!</button>
      </header>
    </div>
  );
}

export default App;
