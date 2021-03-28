'use strict';

import ip from '../lib/ip.ts';
import { expect } from 'https://deno.land/x/expect@v0.2.6/mod.ts'

function describe(title: string, fn: () => void) {
  console.log(title);
  fn();
}

Deno.test('should convert to buffer IPv4 address', function() {
  var buf = ip.toBuffer('127.0.0.1');
  expect(ip.toHex(buf)).toBe('7f000001');
  expect(ip.toString(buf)).toBe('127.0.0.1');
});

Deno.test('should convert to buffer IPv4 address in-place', function() {
  var buf = new Uint8Array(128);
  var offset = 64;
  ip.toBuffer('127.0.0.1', buf, offset);
  expect(ip.toHex(buf, offset, offset + 4)).toBe('7f000001');
  expect(ip.toString(buf, offset, 4)).toBe('127.0.0.1');
});

Deno.test('should convert to buffer IPv6 address', function() {
  var buf = ip.toBuffer('::1');
  expect(/(00){15,15}01/.test(ip.toHex(buf))).toBe(true);
  expect(ip.toString(buf)).toBe('::1');
  expect(ip.toString(ip.toBuffer('1::'))).toBe('1::');
  debugger;
  expect(ip.toString(ip.toBuffer('abcd::dcba'))).toBe('abcd::dcba');
});

Deno.test('should convert to buffer IPv6 address in-place', function() {
  var buf = new Uint8Array(128);
  var offset = 64;
  ip.toBuffer('::1', buf, offset);
  expect(/(00){15,15}01/.test(ip.toHex(buf, offset, offset + 16)));
  expect(ip.toString(buf, offset, 16)).toBe('::1');
  expect(ip.toString(ip.toBuffer('1::', buf, offset), offset, 16)).toBe('1::');
  expect(ip.toString(ip.toBuffer('abcd::dcba', buf, offset), offset, 16)).toBe('abcd::dcba');
});

Deno.test('should convert to buffer IPv6 mapped IPv4 address', function() {
  var buf = ip.toBuffer('::ffff:127.0.0.1');
  expect(ip.toHex(buf)).toBe('00000000000000000000ffff7f000001');
  expect(ip.toString(buf)).toBe('::ffff:7f00:1');

  buf = ip.toBuffer('ffff::127.0.0.1');
  expect(ip.toHex(buf)).toBe('ffff000000000000000000007f000001');
  expect(ip.toString(buf)).toBe('ffff::7f00:1');

  buf = ip.toBuffer('0:0:0:0:0:ffff:127.0.0.1');
  expect(ip.toHex(buf)).toBe('00000000000000000000ffff7f000001');
  expect(ip.toString(buf)).toBe('::ffff:7f00:1');
});

Deno.test('should create IPv4 mask', function() {
  expect(ip.fromPrefixLen(24)).toBe('255.255.255.0');
});

Deno.test('should create IPv6 mask', function() {
  expect(ip.fromPrefixLen(64)).toBe('ffff:ffff:ffff:ffff::');
});

Deno.test('should create IPv6 mask explicitly', function() {
  expect(ip.fromPrefixLen(24, 'IPV6')).toBe('ffff:ff00::');
});

Deno.test('should reverse bits in address', function() {
  expect(ip.not('255.255.255.0')).toBe('0.0.0.255');
});

Deno.test('should or bits in ipv4 addresses', function() {
  expect(ip.or('0.0.0.255', '192.168.1.10')).toBe('192.168.1.255');
});

Deno.test('should or bits in ipv6 addresses', function() {
  expect(ip.or('::ff', '::abcd:dcba:abcd:dcba')).toBe('::abcd:dcba:abcd:dcff');
});

Deno.test('should or bits in mixed addresses', function() {
  expect(ip.or('0.0.0.255', '::abcd:dcba:abcd:dcba')).toBe('::abcd:dcba:abcd:dcff');
});

Deno.test('should mask bits in address', function() {
  expect(ip.mask('192.168.1.134', '255.255.255.0')).toBe('192.168.1.0');
  expect(ip.mask('192.168.1.134', '::ffff:ff00')).toBe('::ffff:c0a8:100');
});


Deno.test('should not leak data', function() {
  for (var i = 0; i < 10; i++)
    expect(ip.mask('::1', '0.0.0.0')).toBe('::');
});

// Test cases calculated with http://www.subnet-calculator.com/
const ipv4Subnet = ip.subnet('192.168.1.134', '255.255.255.192');

console.log(ipv4Subnet);

Deno.test('should compute ipv4 network address', function() {
  expect(ipv4Subnet.networkAddress).toBe('192.168.1.128');
});

Deno.test('should compute ipv4 network\'s first address', function() {
  expect(ipv4Subnet.firstAddress).toBe('192.168.1.129');
});

Deno.test('should compute ipv4 network\'s last address', function() {
  expect(ipv4Subnet.lastAddress).toBe('192.168.1.190');
});

Deno.test('should compute ipv4 broadcast address', function() {
  expect(ipv4Subnet.broadcastAddress).toBe('192.168.1.191');
});

Deno.test('should compute ipv4 subnet number of addresses', function() {
  expect(ipv4Subnet.length).toBe(64);
});

Deno.test('should compute ipv4 subnet number of addressable hosts', function() {
  expect(ipv4Subnet.numHosts).toBe(62);
});

Deno.test('should compute ipv4 subnet mask', function() {
  expect(ipv4Subnet.subnetMask).toBe('255.255.255.192');
});

Deno.test('should compute ipv4 subnet mask\'s length', function() {
  expect(ipv4Subnet.subnetMaskLength).toBe(26);
});

Deno.test('should know whether a subnet contains an address', function() {
  expect(ipv4Subnet.contains('192.168.1.180')).toBe(true);
});

Deno.test('should know whether a subnet does not contain an address', function() {
  expect(ipv4Subnet.contains('192.168.1.195')).toBe(false);
});

// Test cases calculated with http://www.subnet-calculator.com/
const ipv4Subnet2 = ip.subnet('192.168.1.134', '255.255.255.255');

Deno.test('should compute ipv4 network\'s first address', function() {
  expect(ipv4Subnet2.firstAddress).toBe('192.168.1.134');
});

Deno.test('should compute ipv4 network\'s last address', function() {
  expect(ipv4Subnet2.lastAddress).toBe('192.168.1.134');
});

Deno.test('should compute ipv4 subnet number of addressable hosts', function() {
  expect(ipv4Subnet2.numHosts).toBe(1);
});

// Test cases calculated with http://www.subnet-calculator.com/
var ipv4Subnet3 = ip.subnet('192.168.1.134', '255.255.255.254');
Deno.test('should compute ipv4 network\'s first address', function() {
  expect(ipv4Subnet3.firstAddress).toBe('192.168.1.134');
});

Deno.test('should compute ipv4 network\'s last address', function() {
  expect(ipv4Subnet3.lastAddress).toBe('192.168.1.135');
});

Deno.test('should compute ipv4 subnet number of addressable hosts', function() {
  expect(ipv4Subnet3.numHosts).toBe(2);
});

// Test cases calculated with http://www.subnet-calculator.com/
var ipv4Subnet4 = ip.cidrSubnet('192.168.1.134/26');

Deno.test('should compute an ipv4 network address', function() {
  expect(ipv4Subnet4.networkAddress).toBe('192.168.1.128');
});

Deno.test('should compute an ipv4 network\'s first address', function() {
  expect(ipv4Subnet4.firstAddress).toBe('192.168.1.129');
});

Deno.test('should compute an ipv4 network\'s last address', function() {
  expect(ipv4Subnet4.lastAddress).toBe('192.168.1.190');
});

Deno.test('should compute an ipv4 broadcast address', function() {
  expect(ipv4Subnet4.broadcastAddress).toBe('192.168.1.191');
});

Deno.test('should compute an ipv4 subnet number of addresses', function() {
  expect(ipv4Subnet4.length).toBe(64);
});

Deno.test('should compute an ipv4 subnet number of addressable hosts', function() {
  expect(ipv4Subnet4.numHosts).toBe(62);
});

Deno.test('should compute an ipv4 subnet mask', function() {
  expect(ipv4Subnet4.subnetMask).toBe('255.255.255.192');
});

Deno.test('should compute an ipv4 subnet mask\'s length', function() {
  expect(ipv4Subnet4.subnetMaskLength).toBe(26);
});

Deno.test('should know whether a subnet contains an address', function() {
  expect(ipv4Subnet4.contains('192.168.1.180')).toBe(true);
});

Deno.test('should know whether a subnet contains an address', function() {
  expect(ipv4Subnet4.contains('192.168.1.195')).toBe(false);
});

Deno.test('should mask address in CIDR notation', function() {
  expect(ip.cidr('192.168.1.134/26')).toBe('192.168.1.128');
  expect(ip.cidr('2607:f0d0:1002:51::4/56')).toBe('2607:f0d0:1002::');
});

Deno.test('should check if addresses are equal', function() {
  expect(ip.isEqual('127.0.0.1', '::7f00:1')).toBe(true);
  expect(!ip.isEqual('127.0.0.1', '::7f00:2')).toBe(true);
  expect(ip.isEqual('127.0.0.1', '::ffff:7f00:1')).toBe(true);
  expect(!ip.isEqual('127.0.0.1', '::ffaf:7f00:1')).toBe(true);
  expect(ip.isEqual('::ffff:127.0.0.1', '::ffff:127.0.0.1')).toBe(true);
  expect(ip.isEqual('::ffff:127.0.0.1', '127.0.0.1')).toBe(true);
});

Deno.test('should check if an address is localhost', function() {
  expect(ip.isPrivate('127.0.0.1')).toBe(true);
});

Deno.test('should check if an address is from a 192.168.x.x network', function() {
  expect(ip.isPrivate('192.168.0.123')).toBe(true);
  expect(ip.isPrivate('192.168.122.123')).toBe(true);
  expect(ip.isPrivate('192.162.1.2')).toBe(false);
});

Deno.test('should check if an address is from a 172.16.x.x network', function() {
  expect(ip.isPrivate('172.16.0.5')).toBe(true);
  expect(ip.isPrivate('172.16.123.254')).toBe(true);
  expect(ip.isPrivate('171.16.0.5')).toBe(false);
  expect(ip.isPrivate('172.25.232.15')).toBe(true);
  expect(ip.isPrivate('172.15.0.5')).toBe(false);
  expect(ip.isPrivate('172.32.0.5')).toBe(false);
});

Deno.test('should check if an address is from a 169.254.x.x network', function() {
  expect(ip.isPrivate('169.254.2.3')).toBe(true);
  expect(ip.isPrivate('169.254.221.9')).toBe(true);
  expect(ip.isPrivate('168.254.2.3')).toBe(false);
});

Deno.test('should check if an address is from a 10.x.x.x network', function() {
  expect(ip.isPrivate('10.0.2.3')).toBe(true);
  expect(ip.isPrivate('10.1.23.45')).toBe(true);
  expect(ip.isPrivate('12.1.2.3')).toBe(false);
});

Deno.test('should check if an address is from a private IPv6 network', function() {
  expect(ip.isPrivate('fd12:3456:789a:1::1')).toBe(true);
  expect(ip.isPrivate('fe80::f2de:f1ff:fe3f:307e')).toBe(true);
  expect(ip.isPrivate('::ffff:10.100.1.42')).toBe(true);
  expect(ip.isPrivate('::FFFF:172.16.200.1')).toBe(true);
  expect(ip.isPrivate('::ffff:192.168.0.1')).toBe(true);
});

Deno.test('should check if an address is from the internet', function() {
  expect(ip.isPrivate('165.225.132.33')).toBe(false); // joyent.com
});

Deno.test('should check if an address is a loopback IPv6 address', function() {
  expect(ip.isPrivate('::')).toBe(true);
  expect(ip.isPrivate('::1')).toBe(true);
  expect(ip.isPrivate('fe80::1')).toBe(true);
});


Deno.test('should respond with 127.0.0.1', function() {
  expect(ip.loopback()).toBe('127.0.0.1');
});

Deno.test('should respond with 127.0.0.1', function() {
  expect(ip.loopback('ipv4')).toBe('127.0.0.1');
});

Deno.test('should respond with fe80::1', function() {
  expect(ip.loopback('ipv6')).toBe('fe80::1');
});

Deno.test('should respond with true', function() {
  expect(ip.isLoopback('127.0.0.1')).toBe(true);
});

Deno.test('127.8.8.8 should respond with true', function () {
  expect(ip.isLoopback('127.8.8.8')).toBe(true);
});

Deno.test('8.8.8.8 should respond with false', function () {
  expect(ip.isLoopback('8.8.8.8')).toBe(false);
});

Deno.test('fe80::1 should respond with true', function() {
  expect(ip.isLoopback('fe80::1')).toBe(true);
});

Deno.test('::1 should respond with true', function() {
  expect(ip.isLoopback('::1')).toBe(true);
});

Deno.test(':: should respond with true', function() {
  expect(ip.isLoopback('::')).toBe(true);
});

Deno.test('address() method undefined should respond with a private ip', function() {
  expect(ip.isPrivate(ip.address())).toBe(true);
});

[ undefined, 'ipv4', 'ipv6' ].forEach(function(family) {
  Deno.test('private ' + family + ' should respond with a private ip', function() {
    expect(ip.isPrivate(ip.address('private', family))).toBe(true);
  });
});

/*
  // not supported
  var interfaces = os.networkInterfaces();

  Object.keys(interfaces).forEach(function(nic) {
    describe(nic, function() {
      [ undefined, 'ipv4' ].forEach(function(family) {
        describe(family, function() {
          Deno.test('should respond with an ipv4 address', function() {
            var addr = ip.address(nic, family);
            expect.ok(!addr || net.isIPv4(addr));
          });
        });
      });

      describe('ipv6', function() {
        Deno.test('should respond with an ipv6 address', function() {
          var addr = ip.address(nic, 'ipv6');
          expect.ok(!addr || net.isIPv6(addr));
        });
      })
    });
  });
});
*/

Deno.test('toLong() method should respond with a int', function() {
  expect(ip.toLong('127.0.0.1')).toBe(2130706433);
  expect(ip.toLong('255.255.255.255')).toBe(4294967295);
});

Deno.test('fromLong() method should repond with ipv4 address', function() {
  expect(ip.fromLong(2130706433)).toBe('127.0.0.1');
  expect(ip.fromLong(4294967295)).toBe('255.255.255.255');
});
