'use strict';

export default class IP {

  static toHex(buff: Uint8Array, offset: number = 0, end: number = buff.byteLength - offset) {
    let hex = '';
    for (let i = offset; i < end; i++) {
      hex += buff[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  static toBuffer(ip: string, buff?: Uint8Array, offset: number = 0) {
    offset = ~~offset;
    let result;

    if (IP.isV4Format(ip)) {
      result = buff || new Uint8Array(offset + 4);
      ip.split(/\./g).map(function(byte) {
        result[offset++] = parseInt(byte, 10) & 0xff;
      });
    } else if (this.isV6Format(ip)) {
      var sections = ip.split(':', 8);

      var i;
      for (i = 0; i < sections.length; i++) {
        var isv4 = this.isV4Format(sections[i]);
        var v4Buffer;

        if (isv4) {
          v4Buffer = IP.toBuffer(sections[i]);
          sections[i] = IP.toHex(v4Buffer.slice(0, 2));
        }

        if (v4Buffer && ++i < 8) {
          sections.splice(i, 0, IP.toHex(v4Buffer.slice(2, 4)));
        }
      }

      if (sections[0] === '') {
        while (sections.length < 8) sections.unshift('0');
      } else if (sections[sections.length - 1] === '') {
        while (sections.length < 8) sections.push('0');
      } else if (sections.length < 8) {
        for (i = 0; i < sections.length && sections[i] !== ''; i++);
        var argv: any = [ i, 1 ];
        for (i = 9 - sections.length; i > 0; i--) {
          argv.push('0');
        }
        sections.splice.apply(sections, argv);
      }

      result = buff || new Uint8Array(offset + 16);
      for (i = 0; i < sections.length; i++) {
        var word = parseInt(sections[i], 16);
        result[offset++] = (word >> 8) & 0xff;
        result[offset++] = word & 0xff;
      }
    }

    if (!result) {
      throw Error('Invalid ip address: ' + ip);
    }

    return result;
  }

  static toString(buff: Uint8Array, offset: number = 0, length: number = buff.byteLength - offset) {
    offset = ~~offset;

    const result: string[] = [];
    if (length === 4) {
      // IPv4
      for (var i = 0; i < length; i++) {
        result.push(buff[offset + i].toString());
      }
      return result.join('.');
    }

    if (length === 16) {
      // IPv6
      for (var i = 0; i < length; i += 2) {
        result.push(IP.readUInt16BE(buff, offset + i).toString(16));
      }
      return result.join(':').replace(/(^|:)0(:0)*:0(:|$)/, '$1::$3').replace(/:{3,4}/, '::');
    }

    return result.join('');
  }

  static readUInt16BE(buff: Uint8Array, offset: number) {
    return (buff[offset] << 8) + buff[offset + 1];
  }


  private static ipv4Regex = /^(\d{1,3}\.){3,3}\d{1,3}$/;
  private static ipv6Regex = /^(::)?(((\d{1,3}\.){3}(\d{1,3}){1})?([0-9a-f]){0,4}:{0,2}){1,8}(::)?$/i;

  static isV4Format(ip: string) {
    return IP.ipv4Regex.test(ip);
  }

  static isV6Format(ip: string) {
    return IP.ipv6Regex.test(ip);
  };

  static _normalizeFamily(family: string) {
    return family ? family.toLowerCase() : 'ipv4';
  }

  static fromPrefixLen(prefixlen: number, family: string = 'ipv4') {
    if (prefixlen > 32) {
      family = 'ipv6';
    } else {
      family = IP._normalizeFamily(family);
    }

    var len = 4;
    if (family === 'ipv6') {
      len = 16;
    }
    var buff = new Uint8Array(len);
    for (var i = 0, n = buff.length; i < n; ++i) {
      var bits = 8;
      if (prefixlen < 8) {
        bits = prefixlen;
      }
      prefixlen -= bits;
      buff[i] = ~(0xff >> bits) & 0xff;
    }

    return IP.toString(buff);
  }

  static mask(addrstr: string, maskstr: string) {
    const addr = IP.toBuffer(addrstr);
    const mask = IP.toBuffer(maskstr);

    var result = new Uint8Array(Math.max(addr.length, mask.length));

    var i = 0;
    // Same protocol - do bitwise and
    if (addr.length === mask.length) {
      for (i = 0; i < addr.length; i++) {
        result[i] = addr[i] & mask[i];
      }
    } else if (mask.length === 4) {
      // IPv6 address and IPv4 mask
      // (Mask low bits)
      for (i = 0; i < mask.length; i++) {
        result[i] = addr[addr.length - 4  + i] & mask[i];
      }
    } else {
      // IPv6 mask and IPv4 addr
      for (var i = 0; i < result.length - 6; i++) {
        result[i] = 0;
      }

      // ::ffff:ipv4
      result[10] = 0xff;
      result[11] = 0xff;
      for (i = 0; i < addr.length; i++) {
        result[i + 12] = addr[i] & mask[i + 12];
      }
      i = i + 12;
    }
    for (; i < result.length; i++)
      result[i] = 0;

    return IP.toString(result);
  }

  static cidr(cidrString: string) {
    const cidrParts = cidrString.split('/');

    const addr = cidrParts[0];
    if (cidrParts.length !== 2)
      throw new Error('invalid CIDR subnet: ' + addr);

    const mask = IP.fromPrefixLen(parseInt(cidrParts[1], 10));

    return IP.mask(addr, mask);
  }

  static subnet(addrstr: string, maskstr: string) {
      const networkAddress = IP.toLong(IP.mask(addrstr, maskstr));

    // Calculate the mask's length.
    var maskBuffer = IP.toBuffer(maskstr);
    var maskLength = 0;

    for (var i = 0; i < maskBuffer.length; i++) {
      if (maskBuffer[i] === 0xff) {
        maskLength += 8;
      } else {
        var octet = maskBuffer[i] & 0xff;
        while (octet) {
          octet = (octet << 1) & 0xff;
          maskLength++;
        }
      }
    }

    var numberOfAddresses = Math.pow(2, 32 - maskLength);

    return {
      networkAddress: IP.fromLong(networkAddress),
      firstAddress: numberOfAddresses <= 2 ?
                      IP.fromLong(networkAddress) :
                      IP.fromLong(networkAddress + 1),
      lastAddress: numberOfAddresses <= 2 ?
                      IP.fromLong(networkAddress + numberOfAddresses - 1) :
                      IP.fromLong(networkAddress + numberOfAddresses - 2),
      broadcastAddress: IP.fromLong(networkAddress + numberOfAddresses - 1),
      subnetMask: maskstr,
      subnetMaskLength: maskLength,
      numHosts: numberOfAddresses <= 2 ?
                  numberOfAddresses : numberOfAddresses - 2,
      length: numberOfAddresses,
      contains: function(other: string) {
        return networkAddress === IP.toLong(IP.mask(other, maskstr));
      }
    };
  }

  static cidrSubnet(cidrString: string) {
    var cidrParts = cidrString.split('/');

    var addr = cidrParts[0];
    if (cidrParts.length !== 2)
      throw new Error('invalid CIDR subnet: ' + addr);

    const mask = IP.fromPrefixLen(parseInt(cidrParts[1], 10));

    return IP.subnet(addr, mask);
  }

  static not(addr: string) {
    var buff = IP.toBuffer(addr);
    for (var i = 0; i < buff.length; i++) {
      buff[i] = 0xff ^ buff[i];
    }
    return IP.toString(buff);
  }

  static or(astr: string, bstr: string) {
    const a = IP.toBuffer(astr);
    const b = IP.toBuffer(bstr);

    // same protocol
    if (a.length === b.length) {
      for (var i = 0; i < a.length; ++i) {
        a[i] |= b[i];
      }
      return IP.toString(a);

    // mixed protocols
    } else {
      var buff = a;
      var other = b;
      if (b.length > a.length) {
        buff = b;
        other = a;
      }

      var offset = buff.length - other.length;
      for (var i = offset; i < buff.length; ++i) {
        buff[i] |= other[i - offset];
      }

      return IP.toString(buff);
    }
  };

  static isEqual(astr: string, bstr: string) {
    let a = IP.toBuffer(astr);
    let b = IP.toBuffer(bstr);

    // Same protocol
    if (a.length === b.length) {
      for (var i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    }

    // Swap
    if (b.length === 4) {
      var t = b;
      b = a;
      a = t;
    }

    // a - IPv4, b - IPv6
    for (var i = 0; i < 10; i++) {
      if (b[i] !== 0) return false;
    }

    var word = IP.readUInt16BE(b, 10);
    if (word !== 0 && word !== 0xffff) return false;

    for (var i = 0; i < 4; i++) {
      if (a[i] !== b[i + 12]) return false;
    }

    return true;
  }

  static isPrivate(addr: string) {
    return /^(::f{4}:)?10\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/i
        .test(addr) ||
      /^(::f{4}:)?192\.168\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr) ||
      /^(::f{4}:)?172\.(1[6-9]|2\d|30|31)\.([0-9]{1,3})\.([0-9]{1,3})$/i
        .test(addr) ||
      /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr) ||
      /^(::f{4}:)?169\.254\.([0-9]{1,3})\.([0-9]{1,3})$/i.test(addr) ||
      /^f[cd][0-9a-f]{2}:/i.test(addr) ||
      /^fe80:/i.test(addr) ||
      /^::1$/.test(addr) ||
      /^::$/.test(addr);
  }

  static isPublic(addr: string) {
    return !IP.isPrivate(addr);
  }

  static isLoopback(addr: string) {
    return /^(::f{4}:)?127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/
        .test(addr) ||
      /^fe80::1$/.test(addr) ||
      /^::1$/.test(addr) ||
      /^::$/.test(addr);
  }

  static loopback(family: string = 'ipv4') {
    //
    // Default to `ipv4`
    //
    family = IP._normalizeFamily(family);

    if (family !== 'ipv4' && family !== 'ipv6') {
      throw new Error('family must be ipv4 or ipv6');
    }

    return family === 'ipv4' ? '127.0.0.1' : 'fe80::1';
  }

  //
  // ### function address (name, family)
  // #### @name {string|'public'|'private'} **Optional** Name or security
  //      of the network interface.
  // #### @family {ipv4|ipv6} **Optional** IP family of the address (defaults
  //      to ipv4).
  //
  // Returns the address for the network interface on the current system with
  // the specified `name`:
  //   * String: First `family` address of the interface.
  //             If not found see `undefined`.
  //   * 'public': the first public ip address of family.
  //   * 'private': the first private ip address of family.
  //   * undefined: First address with `ipv4` or loopback address `127.0.0.1`.
  //
  static address (name: string = 'private', family: string = 'ipv4') {
    var interfaces: { [name: string]: any } = {}; // TODO: os.networkInterfaces();

    //
    // Default to `ipv4`
    //
    family = IP._normalizeFamily(family);

    //
    // If a specific network interface has been named,
    // return the address.
    //
    if (name && name !== 'private' && name !== 'public') {
      var res = interfaces[name].filter(function(details: any) {
        var itemFamily = details.family.toLowerCase();
        return itemFamily === family;
      });
      if (res.length === 0)
        return undefined;
      return res[0].address;
    }

    const all = Object.keys(interfaces).map(function (nic) {
      //
      // Note: name will only be `public` or `private`
      // when this is called.
      //
      var addresses = interfaces[nic].filter(function (details: any) {
        details.family = details.family.toLowerCase();
        if (details.family !== family || IP.isLoopback(details.address)) {
          return false;
        } else if (!name) {
          return true;
        }

        return name === 'public' ? IP.isPrivate(details.address) :
            IP.isPublic(details.address);
      });

      return addresses.length ? addresses[0].address : undefined;
    }).filter(Boolean);

    return !all.length ? IP.loopback(family) : all[0];
  };

  static toLong (ip: string) {
    var ipl = 0;
    ip.split('.').forEach(function(octet) {
      ipl <<= 8;
      ipl += parseInt(octet);
    });
    return(ipl >>> 0);
  }

  static fromLong(ipl: number) {
    return ((ipl >>> 24) + '.' +
        (ipl >> 16 & 255) + '.' +
        (ipl >> 8 & 255) + '.' +
        (ipl & 255) );
  }
}
