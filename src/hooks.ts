import { DocHandle, Repo } from 'automerge-repo'
import { useEffect, useState, createContext, useContext } from 'react'

export const RepoContext = createContext(null)

export function useRepo(): Repo {
  const repo = useContext(RepoContext)

  if (!repo) {
    throw new Error('Repo not available on RepoContext.')
  }

  return repo
}

export function useHandle<T>(documentId: string): [DocHandle<T> | undefined, (d: DocHandle<T>) => void] {
  const repo = useRepo()

  const [handle, setHandle] = useState<DocHandle<T>>()

  useEffect(() => {
    (async () => {
      const handle: DocHandle<T> = await repo.find(documentId)
      setHandle(handle)
    })()
  })

  return [handle, setHandle]
}

export function useDocument<T>(documentId: string): [doc: T | undefined, changeFn: (cf: (d: T) => void) => void] {
  const [doc, setDoc] = useState<T>()
  const [handle, ] = useHandle<T>(documentId)

  useEffect(() => {
    if (!handle) { return }
    handle.value().then((v) => setDoc(v))
    handle.on('change', (h) => { setDoc(h.doc) } )
  })

  const changeDoc = (changeFunction: (d: T) => void) => {
    if (!handle) { return }
    handle.change(changeFunction)
  }

  return [doc, changeDoc]
}

