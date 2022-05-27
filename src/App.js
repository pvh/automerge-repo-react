import logo from './logo.svg';
import './App.css';
import { useState, useEffect } from 'react';

import { BrowserRepo } from 'automerge-repo'
const repo = BrowserRepo()
const handle = repo.create()
handle.change( (d) => {
  d.message = "Hello world."
})

function App() {
  const [doc, setDoc] = useState({})
  useEffect(() => {
    handle.value().then((v) => setDoc(v))
  })

  const message = doc.message
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
      </header>
    </div>
  );
}

export default App;
