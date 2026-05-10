import type { ExtensionMessage, MessageType } from '../types';

/**
 * Sends a message via chrome.runtime.sendMessage.
 * Returns the response from the message handler.
 */
export async function sendMessage<T>(message: ExtensionMessage<T>): Promise<unknown> {
  return chrome.runtime.sendMessage(message);
}

/**
 * Sends a message to a specific tab via chrome.tabs.sendMessage.
 */
export async function sendToTab<T>(tabId: number, message: ExtensionMessage<T>): Promise<unknown> {
  return chrome.tabs.sendMessage(tabId, message);
}

/**
 * Helper to create a properly structured ExtensionMessage with a timestamp.
 */
export function createMessage<T>(type: MessageType, payload: T): ExtensionMessage<T> {
  return {
    type,
    payload,
    timestamp: Date.now(),
  };
}

/**
 * Wrapper around chrome.runtime.onMessage.addListener.
 * Registers a handler for incoming extension messages.
 */
export function onMessage(
  handler: (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => void
): void {
  chrome.runtime.onMessage.addListener(handler);
}
