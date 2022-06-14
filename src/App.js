import logo from './logo.svg';
import './App.css';
import { useState } from 'react'
import { useDocument, useRepo } from './hooks'
import { Editor } from './prosemirror/Editor'

function TodoItem({documentId}) {
  const [doc, changeDoc] = useDocument(documentId)
  const toggleDone = (e) => {
    changeDoc((d) => {
      d.done = !d.done
    })
  } 
  const { text, done } = doc
  return <li style={done ? {'textDecoration': 'line-through'} : {}} onClick={toggleDone}>{text}</li>
}

function TodoList({documentId}) {
  const repo = useRepo()
  const [input, setInput] = useState("")
  const [doc, changeDoc] = useDocument(documentId)
  
  const addItem = (e) => {
    e.preventDefault()
    changeDoc( (d) => {
      if (!d.items) { d.items = [] }
      const newItem = repo.create()
      d.items.push(newItem.documentId)
      newItem.change(d => { 
        d.text = input
        d.done = false
      })
      setInput("")
    })
  }

  const items = (doc.items || []).map((i) => <TodoItem key={i} documentId={i}/>)

  return (
    <>
      <ul id="todo-list">{items}</ul>
      <form onSubmit={addItem}>
          <input
            type="text" 
            id="new-todo"
            value={input}
            onChange={e => setInput(e.target.value)} />
          <input type="submit" value=">"/>
      </form>
    </>
  )
}

function App({ rootDocumentId }) {
  const [doc, changeDoc] = useDocument(rootDocumentId)
  const bumpCounter = (ev) => {
    changeDoc((doc) => {
      doc.count = doc.count+1
    })
  }
  
  const { message, count } = doc
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          { message }
        </p>
        <Editor />
        <TodoList documentId={rootDocumentId}/>
        <button onClick={bumpCounter}>We smashed it {count} times!</button>
      </header>
    </div>
  );
}

export default App;
