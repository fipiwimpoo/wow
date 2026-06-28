export type ActionFunction = () => void | Promise<void>;

export class ActionQueue {
  private queue: ActionFunction[] = [];
  private isProcessing = false;

  enqueue(action: ActionFunction) {
    this.queue.push(action);
    this.process();
  }

  private async process() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    while (this.queue.length > 0) {
      const action = this.queue.shift();
      if (action) {
        await action();
      }
    }
    this.isProcessing = false;
  }

  clear() {
    this.queue = [];
    this.isProcessing = false;
  }
}
