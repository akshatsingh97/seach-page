import { TextEncoder, TextDecoder } from "util";
import fetchMock from "jest-fetch-mock";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Enable fetch mocks globally
fetchMock.enableMocks();

// Polyfill BroadcastChannel
global.BroadcastChannel = class {
  constructor(channelName) {
    this.name = channelName;
    this.listeners = new Set();
  }
  postMessage(message) {
    this.listeners.forEach((listener) => listener(message));
  }
  addEventListener(event, callback) {
    if (event === "message") {
      this.listeners.add(callback);
    }
  }
  removeEventListener(event, callback) {
    if (event === "message") {
      this.listeners.delete(callback);
    }
  }
  close() {
    this.listeners.clear();
  }
};
