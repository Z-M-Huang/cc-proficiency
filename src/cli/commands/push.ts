import { pushToGist } from "../services/publishing.js";

export function cmdPush(): void {
  pushToGist();
}
