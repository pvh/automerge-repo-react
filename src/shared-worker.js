import { Doc } from "automerge-js";
import {
  // @ts-expect-error
  BrowserRepo,
  // @ts-expect-error
  LocalForageStorageAdapter,
  // @ts-expect-error
  BroadcastChannelNetworkAdapter,
  // @ts-expect-error
  BrowserWebSocketClientAdapter,
  Repo,
} from "automerge-repo"

console.log('hello from the shared worker ')

// eslint-disable-next-line
self.onconnect = function (e) {
  var port = e.ports[0];

  port.onmessage = function (e) {
    var workerResult = "Result: " + e.data[0] * e.data[1];
    port.postMessage(workerResult);
  };
};

async function getRepo(url) {
  return await BrowserRepo({
    storage: new LocalForageStorageAdapter(),
    network: [
      new BroadcastChannelNetworkAdapter(),
      new BrowserWebSocketClientAdapter(url)
    ],
  });
}

(async () => {
  const repo = await getRepo("wss://automerge-storage-demo.glitch.me")

  repo.on('document', (doc) => console.log('got a doc in the sharedworker', doc))
  console.log(repo)
})()
