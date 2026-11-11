import test from 'node:test';
import assert from 'node:assert/strict';
import {ACCOUNTS,getAccount,can,viewsFor,projectsFor,documentIdsFor} from '../src/demo-access.js';

test('leadership, project manager and EPMO expose the agreed task boundaries',()=>{
  for(const id of ['executive','health','technology']){
    assert.deepEqual(viewsFor(getAccount(id)).map(view=>view.id),['assistant','forecasts','quality']);
    assert.equal(can(getAccount(id),'validate'),false);
    assert.equal(can(getAccount(id),'create'),false);
  }
  for(const id of ['renad','afnan']){
    assert.equal(can(getAccount(id),'create'),true);
    assert.equal(can(getAccount(id),'validate'),true);
    assert.equal(can(getAccount(id),'admin'),false);
  }
  assert.equal(can(getAccount('epmo'),'admin'),true);
  assert.equal(can(getAccount('epmo'),'create'),false);
});
test('equal all-project scopes do not grant equal capabilities',()=>{
  assert.deepEqual(projectsFor(getAccount('executive')),projectsFor(getAccount('epmo')));
  assert.notDeepEqual(viewsFor(getAccount('executive')),viewsFor(getAccount('epmo')));
});
test('sector, portfolio and assignment scopes select only their own records',()=>{
  assert.deepEqual(projectsFor(getAccount('health')).map(project=>project.id),['alpha','claims']);
  assert.deepEqual(projectsFor(getAccount('technology')).map(project=>project.id),['alpha','platform']);
  assert.deepEqual(projectsFor(getAccount('afnan')).map(project=>project.id),['alpha']);
  assert.deepEqual(projectsFor(getAccount('renad')),[]);
});
test('sample documents respect validation capability and project assignment',()=>{
  assert.deepEqual(documentIdsFor(getAccount('epmo')),['quarterly','project']);
  assert.deepEqual(documentIdsFor(getAccount('afnan')),['project']);
  assert.deepEqual(documentIdsFor(getAccount('renad')),[]);
  for(const id of ['executive','health','technology'])assert.deepEqual(documentIdsFor(getAccount(id)),[]);
});
test('unknown identities, roles, scopes and capabilities fail closed',()=>{
  assert.equal(ACCOUNTS.length,6);
  assert.equal(getAccount('missing'),undefined);
  assert.equal(can(undefined,'assistant'),false);
  assert.deepEqual(projectsFor(undefined),[]);
  assert.equal(can({role:'unknown'},'admin'),false);
  assert.deepEqual(projectsFor({...getAccount('executive'),scope:{type:'unknown'}}),[]);
  assert.equal(can(getAccount('epmo'),'unknown'),false);
});
