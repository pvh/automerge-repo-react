import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { RepoContext } from './hooks';

import {
  BrowserRepo, 
  LocalForageStorageAdapter,
  BroadcastChannelNetworkAdapter,
  LocalFirstRelayNetworkAdapter
 } from 'automerge-repo'

import localforage from 'localforage'

async function getRepo() {
  const repo = await BrowserRepo({
    storage: new LocalForageStorageAdapter(),
    network: [
      new BroadcastChannelNetworkAdapter(),
      new LocalFirstRelayNetworkAdapter('ws://localhost:8080')
    ]
  })
  return repo
}

async function getRootDocument(repo, initFunction) {
  let docId = window.location.hash.replace(/^#/, '')
  if (!docId) {
    docId = await localforage.getItem('root')
  }
  let rootHandle

  if (!docId) {
    rootHandle = repo.create()
    rootHandle.change(initFunction)
    localforage.setItem('root', rootHandle.documentId)
  } else {
    rootHandle = await repo.find(docId)
  }
  return rootHandle
}

const initFunction = (d) => {
  d.put('/', 'message', "Hello world.")
  d.put('/', 'count', 0, 'counter')
  d.putObject('/', 'items', [])
}

getRepo().then((repo) => { 
  getRootDocument(repo, initFunction).then((rootDoc) => {
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
      <React.StrictMode>
        <RepoContext.Provider value={repo}>
          <App rootDocumentId={rootDoc.documentId}/>
        </RepoContext.Provider>
      </React.StrictMode>
    );

    // If you want to start measuring performance in your app, pass a function
    // to log results (for example: reportWebVitals(console.log))
    // or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
    reportWebVitals();
  })
})