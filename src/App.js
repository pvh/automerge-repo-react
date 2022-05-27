import logo from './logo.svg';
import './App.css';
import { useDocument } from './hooks'

function App({ rootDocumentId }) {
  const [doc, changeDoc] = useDocument(rootDocumentId)
  const bumpCounter = (ev) => {
    changeDoc((doc) => {
      doc.count = doc.count+1
    })
  }
  
  const message = doc.message + " " + doc.count
  console.log('message', doc, message)
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          { message }
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <button onClick={bumpCounter} label="hey there"></button>
      </header>
    </div>
  );
}

export default App;
