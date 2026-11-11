import test from 'node:test';
import assert from 'node:assert/strict';
import {freshAssistance} from '../src/assistance-chat.js';

test('demo identities receive separate assistance histories and drafts',()=>{
  const epmo=freshAssistance(),manager=freshAssistance();
  epmo.messages.push({role:'user',text:'My EPMO question'});
  epmo.draft='Unsent follow-up';epmo.busy=true;epmo.generation++;
  assert.deepEqual(manager.messages,[]);
  assert.equal(manager.draft,'');
  assert.equal(manager.busy,false);
  assert.equal(manager.generation,0);
});
test('a new assistance conversation cannot reuse the previous thread state',()=>{
  const previous=freshAssistance();previous.scroll=400;previous.unread=true;
  previous.messages.push({role:'assistant',kind:'project'});
  const next=freshAssistance();
  assert.notEqual(previous,next);
  assert.notEqual(previous.messages,next.messages);
  assert.equal(next.scroll,0);
  assert.equal(next.unread,false);
  assert.deepEqual(next.messages,[]);
});
