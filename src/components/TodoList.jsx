import { useState } from "react"
import { useDocument, useRepo } from "../hooks"

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
  
export function TodoList({documentId}) {
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

  if (!doc) { return }

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
  