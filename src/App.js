import logo from './logo.svg';
import './App.css';
import { useState } from 'react'
import { useDocument, useRepo } from './hooks'

function TodoItem({documentId}) {
  const [doc, changeDoc] = useDocument(documentId)
  const toggleDone = (e) => {
    changeDoc((d) => {
      d.put('/', 'done', !(d.get('/', 'done')))
    })
  } 
  console.log(doc)
  if (!doc) return null
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
      const newItem = repo.create()
      d.push('/items', newItem.documentId)
      newItem.change(d => { 
        d.put('/', 'text', input)
        d.put('/', 'done', false)
      })
      setInput("")
    })
  }

  console.log(doc)
  if (!doc) return null
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
    changeDoc((d) => {
      d.increment('/', 'count', 1)
    })
  }
  
  console.log(doc)
  if (!doc) return "Document did not load..."

  const { message, count } = doc
  return (
    <div className="App">
      <header className="App-header">
        <TodoList documentId={rootDocumentId}/>
        <p>
          { message }
        </p>
        <button onClick={bumpCounter}>We smashed it {count} times!</button>
      </header>
    </div>
  );
}

export default App;

// 
// 
        