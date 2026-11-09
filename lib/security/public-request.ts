import dns from "node:dns/promises"
import http from "node:http"
import https from "node:https"
import { BlockList, isIP } from "node:net"

const blocked = new BlockList()
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.168.0.0", 16], ["192.88.99.0", 24], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(address, prefix, "ipv4")

const globalV6 = new BlockList()
globalV6.addSubnet("2000::", 3, "ipv6")
blocked.addSubnet("2001::", 23, "ipv6")
blocked.addSubnet("2001:db8::", 32, "ipv6")
blocked.addSubnet("2002::", 16, "ipv6")
blocked.addSubnet("3fff::", 20, "ipv6")

export function isPublicAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 4) return !blocked.check(address, "ipv4")
  return family === 6 && globalV6.check(address, "ipv6") && !blocked.check(address, "ipv6")
}

export function publicUrl(input: string): URL {
  const url = new URL(input)
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || (url.port && !["80", "443"].includes(url.port))) {
    throw new Error("Only public HTTP(S) links on standard ports can be checked")
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "")
  if (isIP(hostname) && !isPublicAddress(hostname)) throw new Error("Private addresses cannot be checked")
  return url
}

export async function publicRequestStatus(input: string, method: "HEAD" | "GET", signal: AbortSignal, redirects = 0): Promise<number> {
  if (redirects > 4) throw new Error("Too many redirects")
  signal.throwIfAborted()
  const url = publicUrl(input)
  const hostname = url.hostname.replace(/^\[|\]$/g, "")
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await Promise.race([
        dns.lookup(hostname, { all: true }),
        new Promise<never>((_, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), { once: true })
        }),
      ])
  if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address))) throw new Error("Private addresses cannot be checked")
  signal.throwIfAborted()
  const address = addresses[0]
  const result = await new Promise<{ status: number; location?: string }>((resolve, reject) => {
    const request = (url.protocol === "https:" ? https : http).request(url, {
      method,
      signal,
      agent: false,
      headers: { "User-Agent": "Mozilla/5.0 DevProfile link check" },
      lookup: (_hostname, options, callback) => options.all
        ? callback(null, [{ address: address.address, family: address.family }])
        : callback(null, address.address, address.family),
    }, (response) => {
      resolve({ status: response.statusCode ?? 0, location: response.headers.location })
      response.destroy()
    })
    request.on("error", reject)
    request.end()
  })
  if ([301, 302, 303, 307, 308].includes(result.status) && result.location) {
    return publicRequestStatus(new URL(result.location, url).href, method, signal, redirects + 1)
  }
  return result.status
}
