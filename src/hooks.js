import { useEffect, useState, createContext, useContext } from 'react'

export const RepoContext = createContext(null)

export function useRepo() {
  const repo = useContext(RepoContext)

  if (!repo) {
    throw new Error('Repo not available on RepoContext.')
  }

  return repo
}

export function useHandle(documentId) {
  const repo = useRepo()

  const [handle, setHandle] = useState(null)

  useEffect(() => {
    (async () => {
      const handle = await repo.find(documentId)
      setHandle(handle)
    })()
  })

  return [handle, setHandle]
}

export function useDocument(documentId) {
  const [doc, setDoc] = useState(null)
  const [handle] = useHandle(documentId)

  useEffect(() => {
    if (!handle) { return }
    handle.value().then((v) => setDoc(v.materialize('/')))
    handle.on('change', (h) => { setDoc(h.doc.materialize('/')) } )
  }, [handle])

  const changeDoc = (changeFunction) => {
    handle.change(changeFunction)
  }

  return [doc, changeDoc]
}

