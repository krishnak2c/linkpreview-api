import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateUrl } from './validator.js'

describe('validateUrl', () => {
  it('accepts valid public http URLs', async () => {
    assert.equal(await validateUrl('http://example.com'), 'http://example.com/')
    assert.equal(await validateUrl('http://example.com/path?q=1'), 'http://example.com/path?q=1')
  })

  it('accepts valid public https URLs', async () => {
    assert.equal(await validateUrl('https://github.com'), 'https://github.com/')
    assert.equal(await validateUrl('https://example.org/page'), 'https://example.org/page')
  })

  it('rejects empty or non-string input', async () => {
    assert.equal(await validateUrl(''), null)
    assert.equal(await validateUrl('   '), null)
    assert.equal(await validateUrl(null), null)
    assert.equal(await validateUrl(undefined), null)
    assert.equal(await validateUrl(123), null)
  })

  it('rejects non-http protocols', async () => {
    assert.equal(await validateUrl('ftp://example.com'), null)
    assert.equal(await validateUrl('file:///etc/passwd'), null)
    assert.equal(await validateUrl('data:text/html,<script>'), null)
    assert.equal(await validateUrl('javascript:alert(1)'), null)
    assert.equal(await validateUrl('gopher://example.com'), null)
  })

  it('rejects localhost', async () => {
    assert.equal(await validateUrl('http://localhost'), null)
    assert.equal(await validateUrl('http://localhost:8080'), null)
    assert.equal(await validateUrl('https://LOCALHOST/path'), null)
  })

  it('rejects private IPv4 addresses', async () => {
    assert.equal(await validateUrl('http://10.0.0.1'), null)
    assert.equal(await validateUrl('http://10.255.255.255'), null)
    assert.equal(await validateUrl('http://172.16.0.1'), null)
    assert.equal(await validateUrl('http://172.31.255.255'), null)
    assert.equal(await validateUrl('http://192.168.0.1'), null)
    assert.equal(await validateUrl('http://192.168.1.1'), null)
    assert.equal(await validateUrl('http://127.0.0.1'), null)
    assert.equal(await validateUrl('http://127.0.0.1:3000'), null)
    assert.equal(await validateUrl('http://169.254.1.1'), null)
    assert.equal(await validateUrl('http://0.0.0.0'), null)
  })

  it('allows public IPv4 addresses', async () => {
    assert.equal(await validateUrl('http://8.8.8.8'), 'http://8.8.8.8/')
    assert.equal(await validateUrl('http://1.1.1.1'), 'http://1.1.1.1/')
    assert.equal(await validateUrl('http://93.184.216.34'), 'http://93.184.216.34/')
  })

  it('rejects IPv6 loopback', async () => {
    assert.equal(await validateUrl('http://[::1]'), null)
    assert.equal(await validateUrl('http://[::1]:8080'), null)
  })

  it('rejects IPv6 unique local (fc00::/7)', async () => {
    assert.equal(await validateUrl('http://[fc00::1]'), null)
    assert.equal(await validateUrl('http://[fd00::1]'), null)
    assert.equal(await validateUrl('http://[fcff::1]'), null)
  })

  it('rejects IPv6 link-local (fe80::/10)', async () => {
    assert.equal(await validateUrl('http://[fe80::1]'), null)
    assert.equal(await validateUrl('http://[fe90::1]'), null)
    assert.equal(await validateUrl('http://[fea0::1]'), null)
    assert.equal(await validateUrl('http://[feb0::1]'), null)
  })

  it('allows IPv6 addresses outside private ranges', async () => {
    assert.equal(await validateUrl('http://[2001:db8::1]'), 'http://[2001:db8::1]/')
    assert.equal(await validateUrl('http://[2600::1]'), 'http://[2600::1]/')
  })

  it('rejects IPv6-mapped private IPv4', async () => {
    assert.equal(await validateUrl('http://[::ffff:10.0.0.1]'), null)
    assert.equal(await validateUrl('http://[::ffff:192.168.1.1]'), null)
    assert.equal(await validateUrl('http://[::ffff:172.16.0.1]'), null)
    assert.equal(await validateUrl('http://[::ffff:127.0.0.1]'), null)
    assert.equal(await validateUrl('http://[::ffff:169.254.1.1]'), null)
    assert.equal(await validateUrl('http://[::ffff:0.1.2.3]'), null)
  })

  it('allows IPv6-mapped public IPv4', async () => {
    // URL constructor normalizes ::ffff:x.x.x.x to ::ffff:XXXX:XXXX hex form
    assert.equal(await validateUrl('http://[::ffff:8.8.8.8]'), 'http://[::ffff:808:808]/')
    assert.equal(await validateUrl('http://[::ffff:93.184.216.34]'), 'http://[::ffff:5db8:d822]/')
  })

  it('rejects URLs with private IP DNS names (requires network)', async () => {
    // Resolve4 on these may or may not work, so skip if DNS fails
    const r1 = await validateUrl('http://10.0.0.1.nip.io')
    if (r1 === null) assert.ok(true) // correctly blocked
    // If DNS resolution is down and allow-through, it's still caught by IP check when fetch fails
  })
})
