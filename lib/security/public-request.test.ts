import assert from "node:assert/strict"
import { test } from "node:test"
import dns from "node:dns/promises"
import http from "node:http"
import { EventEmitter } from "node:events"
import { isPublicAddress, publicRequestStatus, publicUrl } from "./public-request.ts"

test("link checks reject private, reserved and mapped network addresses", () => {
  for (const address of ["127.0.0.1", "10.1.2.3", "0.0.0.0", "100.100.100.200", "169.254.169.254", "172.20.0.1", "192.168.1.1", "192.0.2.1", "224.0.0.1", "::1", "::ffff:127.0.0.1", "fd00::1", "fe80::1", "2002:7f00:1::", "2001:db8::1"]) {
    assert.equal(isPublicAddress(address), false, address)
  }
  for (const address of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"]) assert.equal(isPublicAddress(address), true, address)
})

test("link checks reject unsafe URLs and alternate representations of loopback", async () => {
  for (const url of ["file:///etc/passwd", "ftp://example.com", "http://user:pass@example.com", "http://localhost:8080", "http://127.1", "http://2130706433", "http://0x7f000001", "http://[::1]"]) {
    assert.throws(() => publicUrl(url), Error, url)
  }
  assert.equal(publicUrl("https://example.com/path").hostname, "example.com")
  await assert.rejects(publicRequestStatus("http://localhost/", "HEAD", AbortSignal.timeout(1000)), /Private addresses/)
})

test("link checks pin DNS and revalidate redirected destinations", async (t) => {
  t.mock.method(dns, "lookup", async () => [{ address: "8.8.8.8", family: 4 }])
  let requests = 0
  t.mock.method(http, "request", (_url: URL, options: http.RequestOptions, onResponse: (response: { statusCode: number; headers: { location: string }; destroy: () => void }) => void) => {
    requests++
    options.lookup!("public.example", { all: true }, (err, addresses) => {
      assert.equal(err, null)
      assert.deepEqual(addresses, [{ address: "8.8.8.8", family: 4 }])
    })
    const request = new EventEmitter() as EventEmitter & { end: () => void }
    request.end = () => onResponse({ statusCode: 302, headers: { location: "http://169.254.169.254/latest/meta-data" }, destroy() {} })
    return request
  })
  await assert.rejects(publicRequestStatus("http://public.example", "GET", AbortSignal.timeout(1000)), /Private addresses/)
  assert.equal(requests, 1, "redirect must be blocked before a second socket is opened")
})
