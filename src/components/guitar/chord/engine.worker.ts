import { createWorkerService } from '@/domain/chord/engine/workerService';
import type { OutputMessage } from '@/domain/chord/engine/workerProtocol';

const scope=self as unknown as {postMessage:(message:OutputMessage)=>void;onmessage:((event:MessageEvent<unknown>)=>void)|null};
const service=createWorkerService({send:message=>scope.postMessage(message)});
scope.onmessage=event=>service.receive(event.data);
