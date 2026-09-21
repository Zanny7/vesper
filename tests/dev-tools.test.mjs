import test from 'node:test';
import assert from 'node:assert/strict';
import { isLocalDevelopment } from '../src/dev-tools.js';

test('development link is limited to loopback hostnames', () => {
  for (const host of ['localhost', 'bat26.localhost', '127.0.0.1', '[::1]']) assert.equal(isLocalDevelopment(host), true);
  for (const host of ['example.com', 'localhost.example.com', 'notlocalhost', '192.168.1.2']) assert.equal(isLocalDevelopment(host), false);
});
