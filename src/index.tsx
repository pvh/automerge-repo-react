import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import localforage from "localforage";

import {
  // @ts-expect-error
  BrowserRepo,
  // @ts-expect-error
  LocalForageStorageAdapter,
  // BroadcastChannelNetworkAdapter,
  // @ts-expect-error
  BrowserWebSocketClientAdapter,
  Repo,
} from "automerge-repo"

import "./index.css";
import App, { RootDocument } from "./App";
import { RepoContext } from "./hooks";

async function getRepo() {
  return await BrowserRepo({
    storage: new LocalForageStorageAdapter(),
    network: [
      // new BroadcastChannelNetworkAdapter(),
      new BrowserWebSocketClientAdapter('ws://skillful-sandy-practice.glitch.me/')
    ],
  });
}

async function getRootDocument(repo: Repo, initFunction: any) {
  let docId: string | null = window.location.hash.replace(/^#/, "");
  if (!docId) {
    docId = await localforage.getItem("root");
  }
  let rootHandle;

  if (!docId) {
    rootHandle = repo.create();
    rootHandle.change(initFunction);
    await localforage.setItem("root", rootHandle.documentId);
  } else {
    rootHandle = await repo.find(docId);
    window.location.hash = docId;
  }
  return rootHandle;
}

const initFunction = (d: RootDocument) => {
  d.items = [];
};

getRepo().then((repo) => {
  getRootDocument(repo, initFunction).then((rootDoc) => {
    const rootElem = document.getElementById("root")
    if (!rootElem) { throw new Error("The 'root' element wasn't found in the host HTML doc.") }
    const root = ReactDOM.createRoot(rootElem);
    root.render(
      <StrictMode>
        <RepoContext.Provider value={repo}>
          <App rootDocumentId={rootDoc.documentId} />
        </RepoContext.Provider>
      </StrictMode>
    );
  });
});
