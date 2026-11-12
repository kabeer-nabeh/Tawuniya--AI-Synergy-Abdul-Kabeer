import { ACCOUNTS, ROLES } from './demo-access.js';

const inFrame = window.parent !== window;
const intro = document.querySelector('#sso-intro-view');
const picker = document.querySelector('#sso-account-picker');
const continueButton = document.querySelector('#sso-continue');
const accounts = document.querySelector('#sso-account-options');

for (const account of ACCOUNTS) {
  const entry = document.createElement('a');
  const query = new URLSearchParams({demoAccount: account.id});
  if (inFrame) query.set('embed', 'synergy');
  entry.href = '/?' + query;
  entry.className = 'account-option sso-account-option';

  const avatar = document.createElement('span');
  avatar.className = 'account-avatar';
  avatar.textContent = account.initials;
  avatar.setAttribute('aria-hidden', 'true');

  const details = document.createElement('span');
  const name = document.createElement('strong');
  name.textContent = account.name[0];
  const context = document.createElement('small');
  context.textContent = ROLES[account.role].label[0] + ' · ' + account.scopeLabel[0];
  details.append(name, context);
  entry.append(avatar, details);
  accounts.append(entry);
}

continueButton.addEventListener('click', () => {
  intro.hidden = true;
  picker.hidden = false;
  document.querySelector('#sso-picker-title').focus();
});

document.querySelector('#sso-back').addEventListener('click', () => {
  picker.hidden = true;
  intro.hidden = false;
  continueButton.focus();
});

if (inFrame) {
  window.parent.postMessage({type:'synergy-sign-in-ready'}, location.origin);
}
