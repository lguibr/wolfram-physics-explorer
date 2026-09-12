import { processWorkerRequest, type WorkerRequest } from './workerProtocol';
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  self.postMessage(processWorkerRequest(event.data));
};
