import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { RepoContext } from './hooks';

import LocalForageStorageAdapter from 'automerge-repo/src/storage/interfaces/LocalForageStorageAdapter'
import BroadcastChannelNetworkAdapter from 'automerge-repo/src/network/interfaces/BroadcastChannelNetworkAdapter'
import BrowserWebSocketClientAdapter from 'automerge-repo/src/network/interfaces/BrowserWebSocketClientAdapter'

import BrowserRepo from 'automerge-repo/src/BrowserRepo';
import * as Automerge from 'automerge-js'

import localforage from 'localforage'

async function getRepo() {
  return await BrowserRepo({
    storage: new LocalForageStorageAdapter(),
    network: [
      new BroadcastChannelNetworkAdapter(),
      new BrowserWebSocketClientAdapter('ws://localhost:3000')
    ]
  })
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
    await localforage.setItem('root', rootHandle.documentId)
  } else {
    rootHandle = await repo.find(docId)
  }
  return rootHandle
}


const initFunction = (d) => {
  d.message = new Automerge.Text("Hello World.")
  d.count = 0
  d.items = []
}

getRepo().then(repo => {
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