import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getConversationText, getMediaCaption } from '../src/whatsapp/messageText.js';

test('getConversationText reads a plain conversation message', () => {
  assert.equal(getConversationText({ conversation: 'hi' }), 'hi');
});

test('getConversationText reads an extendedTextMessage', () => {
  assert.equal(getConversationText({ extendedTextMessage: { text: 'yo' } }), 'yo');
});

test('getConversationText returns null when neither shape is present', () => {
  assert.equal(getConversationText({}), null);
  assert.equal(getConversationText(undefined), null);
});

test('getMediaCaption reads an image or video caption', () => {
  assert.equal(getMediaCaption({ imageMessage: { caption: 'cap' } }), 'cap');
  assert.equal(getMediaCaption({ videoMessage: { caption: 'vcap' } }), 'vcap');
});

test('getMediaCaption returns null when there is no caption', () => {
  assert.equal(getMediaCaption({}), null);
  assert.equal(getMediaCaption({ imageMessage: {} }), null);
});
