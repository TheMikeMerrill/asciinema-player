var AsciinemaPlayer = (function (exports) {
  'use strict';

  function parseNpt(time) {
    if (typeof time === "number") {
      return time;
    } else if (typeof time === "string") {
      return time.split(":").reverse().map(parseFloat).reduce((sum, n, i) => sum + n * Math.pow(60, i));
    } else {
      return undefined;
    }
  }
  function debounce(f, delay) {
    let timeout;
    return function () {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      clearTimeout(timeout);
      timeout = setTimeout(() => f.apply(this, args), delay);
    };
  }
  function throttle(f, interval) {
    let enableCall = true;
    return function () {
      if (!enableCall) return;
      enableCall = false;
      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }
      f.apply(this, args);
      setTimeout(() => enableCall = true, interval);
    };
  }

  class DummyLogger {
    log() {}
    debug() {}
    info() {}
    warn() {}
    error() {}
  }
  class PrefixedLogger {
    constructor(logger, prefix) {
      this.logger = logger;
      this.prefix = prefix;
    }
    log(message) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }
      this.logger.log(`${this.prefix}${message}`, ...args);
    }
    debug(message) {
      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }
      this.logger.debug(`${this.prefix}${message}`, ...args);
    }
    info(message) {
      for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        args[_key3 - 1] = arguments[_key3];
      }
      this.logger.info(`${this.prefix}${message}`, ...args);
    }
    warn(message) {
      for (var _len4 = arguments.length, args = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
        args[_key4 - 1] = arguments[_key4];
      }
      this.logger.warn(`${this.prefix}${message}`, ...args);
    }
    error(message) {
      for (var _len5 = arguments.length, args = new Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
        args[_key5 - 1] = arguments[_key5];
      }
      this.logger.error(`${this.prefix}${message}`, ...args);
    }
  }

  let wasm;
  const cachedTextDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', {
    ignoreBOM: true,
    fatal: true
  }) : {
    decode: () => {
      throw Error('TextDecoder not available');
    }
  };
  if (typeof TextDecoder !== 'undefined') {
    cachedTextDecoder.decode();
  }
  let cachedUint8Memory0 = null;
  function getUint8Memory0() {
    if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
      cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
  }
  function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
  }
  const heap = new Array(128).fill(undefined);
  heap.push(undefined, null, true, false);
  let heap_next = heap.length;
  function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];
    heap[idx] = obj;
    return idx;
  }
  function getObject(idx) {
    return heap[idx];
  }
  function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
  }
  function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
  }
  function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
      return `${val}`;
    }
    if (type == 'string') {
      return `"${val}"`;
    }
    if (type == 'symbol') {
      const description = val.description;
      if (description == null) {
        return 'Symbol';
      } else {
        return `Symbol(${description})`;
      }
    }
    if (type == 'function') {
      const name = val.name;
      if (typeof name == 'string' && name.length > 0) {
        return `Function(${name})`;
      } else {
        return 'Function';
      }
    }
    // objects
    if (Array.isArray(val)) {
      const length = val.length;
      let debug = '[';
      if (length > 0) {
        debug += debugString(val[0]);
      }
      for (let i = 1; i < length; i++) {
        debug += ', ' + debugString(val[i]);
      }
      debug += ']';
      return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
      className = builtInMatches[1];
    } else {
      // Failed to match the standard '[object ClassName]'
      return toString.call(val);
    }
    if (className == 'Object') {
      // we're a user defined class or Object
      // JSON.stringify avoids problems with cycles, and is generally much
      // easier than looping through ownProperties of `val`.
      try {
        return 'Object(' + JSON.stringify(val) + ')';
      } catch (_) {
        return 'Object';
      }
    }
    // errors
    if (val instanceof Error) {
      return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
  }
  let WASM_VECTOR_LEN = 0;
  const cachedTextEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder('utf-8') : {
    encode: () => {
      throw Error('TextEncoder not available');
    }
  };
  const encodeString = typeof cachedTextEncoder.encodeInto === 'function' ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
  } : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
      read: arg.length,
      written: buf.length
    };
  };
  function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
      const buf = cachedTextEncoder.encode(arg);
      const ptr = malloc(buf.length, 1) >>> 0;
      getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
      WASM_VECTOR_LEN = buf.length;
      return ptr;
    }
    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;
    const mem = getUint8Memory0();
    let offset = 0;
    for (; offset < len; offset++) {
      const code = arg.charCodeAt(offset);
      if (code > 0x7F) break;
      mem[ptr + offset] = code;
    }
    if (offset !== len) {
      if (offset !== 0) {
        arg = arg.slice(offset);
      }
      ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
      const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
      const ret = encodeString(arg, view);
      offset += ret.written;
      ptr = realloc(ptr, len, offset, 1) >>> 0;
    }
    WASM_VECTOR_LEN = offset;
    return ptr;
  }
  let cachedInt32Memory0 = null;
  function getInt32Memory0() {
    if (cachedInt32Memory0 === null || cachedInt32Memory0.byteLength === 0) {
      cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
  }
  /**
  * @param {number} cols
  * @param {number} rows
  * @param {number} scrollback_limit
  * @returns {Vt}
  */
  function create$1(cols, rows, scrollback_limit) {
    const ret = wasm.create(cols, rows, scrollback_limit);
    return Vt.__wrap(ret);
  }
  let cachedUint32Memory0 = null;
  function getUint32Memory0() {
    if (cachedUint32Memory0 === null || cachedUint32Memory0.byteLength === 0) {
      cachedUint32Memory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32Memory0;
  }
  function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32Memory0().subarray(ptr / 4, ptr / 4 + len);
  }
  const VtFinalization = typeof FinalizationRegistry === 'undefined' ? {
    register: () => {},
    unregister: () => {}
  } : new FinalizationRegistry(ptr => wasm.__wbg_vt_free(ptr >>> 0));
  /**
  */
  class Vt {
    static __wrap(ptr) {
      ptr = ptr >>> 0;
      const obj = Object.create(Vt.prototype);
      obj.__wbg_ptr = ptr;
      VtFinalization.register(obj, obj.__wbg_ptr, obj);
      return obj;
    }
    __destroy_into_raw() {
      const ptr = this.__wbg_ptr;
      this.__wbg_ptr = 0;
      VtFinalization.unregister(this);
      return ptr;
    }
    free() {
      const ptr = this.__destroy_into_raw();
      wasm.__wbg_vt_free(ptr);
    }
    /**
    * @param {string} s
    * @returns {any}
    */
    feed(s) {
      const ptr0 = passStringToWasm0(s, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len0 = WASM_VECTOR_LEN;
      const ret = wasm.vt_feed(this.__wbg_ptr, ptr0, len0);
      return takeObject(ret);
    }
    /**
    * @param {number} cols
    * @param {number} rows
    * @returns {any}
    */
    resize(cols, rows) {
      const ret = wasm.vt_resize(this.__wbg_ptr, cols, rows);
      return takeObject(ret);
    }
    /**
    * @returns {string}
    */
    inspect() {
      let deferred1_0;
      let deferred1_1;
      try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.vt_inspect(retptr, this.__wbg_ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
      } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
      }
    }
    /**
    * @returns {Uint32Array}
    */
    getSize() {
      try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.vt_getSize(retptr, this.__wbg_ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        var v1 = getArrayU32FromWasm0(r0, r1).slice();
        wasm.__wbindgen_free(r0, r1 * 4, 4);
        return v1;
      } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
      }
    }
    /**
    * @param {number} n
    * @returns {any}
    */
    getLine(n) {
      const ret = wasm.vt_getLine(this.__wbg_ptr, n);
      return takeObject(ret);
    }
    /**
    * @returns {any}
    */
    getCursor() {
      const ret = wasm.vt_getCursor(this.__wbg_ptr);
      return takeObject(ret);
    }
  }
  async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
      if (typeof WebAssembly.instantiateStreaming === 'function') {
        try {
          return await WebAssembly.instantiateStreaming(module, imports);
        } catch (e) {
          if (module.headers.get('Content-Type') != 'application/wasm') {
            console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
          } else {
            throw e;
          }
        }
      }
      const bytes = await module.arrayBuffer();
      return await WebAssembly.instantiate(bytes, imports);
    } else {
      const instance = await WebAssembly.instantiate(module, imports);
      if (instance instanceof WebAssembly.Instance) {
        return {
          instance,
          module
        };
      } else {
        return instance;
      }
    }
  }
  function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbindgen_error_new = function (arg0, arg1) {
      const ret = new Error(getStringFromWasm0(arg0, arg1));
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_drop_ref = function (arg0) {
      takeObject(arg0);
    };
    imports.wbg.__wbindgen_object_clone_ref = function (arg0) {
      const ret = getObject(arg0);
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_number_new = function (arg0) {
      const ret = arg0;
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_bigint_from_u64 = function (arg0) {
      const ret = BigInt.asUintN(64, arg0);
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_string_new = function (arg0, arg1) {
      const ret = getStringFromWasm0(arg0, arg1);
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_f975102236d3c502 = function (arg0, arg1, arg2) {
      getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
    };
    imports.wbg.__wbg_new_b525de17f44a8943 = function () {
      const ret = new Array();
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_f841cc6f2098f4b5 = function () {
      const ret = new Map();
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_f9876326328f45ed = function () {
      const ret = new Object();
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_string = function (arg0) {
      const ret = typeof getObject(arg0) === 'string';
      return ret;
    };
    imports.wbg.__wbg_set_17224bc548dd1d7b = function (arg0, arg1, arg2) {
      getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
    };
    imports.wbg.__wbg_set_388c4c6422704173 = function (arg0, arg1, arg2) {
      const ret = getObject(arg0).set(getObject(arg1), getObject(arg2));
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_debug_string = function (arg0, arg1) {
      const ret = debugString(getObject(arg1));
      const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len1 = WASM_VECTOR_LEN;
      getInt32Memory0()[arg0 / 4 + 1] = len1;
      getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbindgen_throw = function (arg0, arg1) {
      throw new Error(getStringFromWasm0(arg0, arg1));
    };
    return imports;
  }
  function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedInt32Memory0 = null;
    cachedUint32Memory0 = null;
    cachedUint8Memory0 = null;
    return wasm;
  }
  function initSync(module) {
    if (wasm !== undefined) return wasm;
    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
      module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
  }
  async function __wbg_init(input) {
    if (wasm !== undefined) return wasm;
    const imports = __wbg_get_imports();
    if (typeof input === 'string' || typeof Request === 'function' && input instanceof Request || typeof URL === 'function' && input instanceof URL) {
      input = fetch(input);
    }
    const {
      instance,
      module
    } = await __wbg_load(await input, imports);
    return __wbg_finalize_init(instance, module);
  }

  var exports$1 = /*#__PURE__*/Object.freeze({
      __proto__: null,
      Vt: Vt,
      create: create$1,
      default: __wbg_init,
      initSync: initSync
  });

  const base64codes = [62,0,0,0,63,52,53,54,55,56,57,58,59,60,61,0,0,0,0,0,0,0,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,0,0,0,0,0,0,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51];

          function getBase64Code(charCode) {
              return base64codes[charCode - 43];
          }

          function base64_decode(str) {
              let missingOctets = str.endsWith("==") ? 2 : str.endsWith("=") ? 1 : 0;
              let n = str.length;
              let result = new Uint8Array(3 * (n / 4));
              let buffer;

              for (let i = 0, j = 0; i < n; i += 4, j += 3) {
                  buffer =
                      getBase64Code(str.charCodeAt(i)) << 18 |
                      getBase64Code(str.charCodeAt(i + 1)) << 12 |
                      getBase64Code(str.charCodeAt(i + 2)) << 6 |
                      getBase64Code(str.charCodeAt(i + 3));
                  result[j] = buffer >> 16;
                  result[j + 1] = (buffer >> 8) & 0xFF;
                  result[j + 2] = buffer & 0xFF;
              }

              return result.subarray(0, result.length - missingOctets);
          }

          const wasm_code = base64_decode("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DGogBEEIaikCADcCACAHIAQpAgA3AgQMAQsgBC0ADEUEQCAEEFwLIAQoAggiCiAFTQRAIAggBCgCBCIFIAUgCkEEdGoQeEEAIQUCQCAELQAMDQAgCEEAOgAMQQEhBSAIKAIIIgogCU8NACACQQA7ARggAkECOgAUIAJBAjoAECACQSA2AgwgAiAJIAprNgIcIAggAkEMahAvCyAHQYCAgIB4NgIEIAcgBToAACAEQQRBEBBfDAELAkAgBCgCCCINIAVPBEAgBCgCBCENIAIgBTYCBCACIA02AgAMAQsgBSANQbymwAAQ5AEACyAIIAIoAgAiCCAIIAIoAgRBBHRqEHggBCgCACEIIAQoAgQiDSAKIAUQsAEgByAKIAogBWsiBSAFIApLGzYCDCAHIA02AgggByAINgIEIAdBAToAACAHIAQtAAw6ABALIAJBIGokACADLQAsRQRAIAEgAykCDDcCACABQQhqIANBFGopAgA3AgAgAygCMEGAgICAeEYNASALQQRBEBBfDAELCyADKAIwQYCAgIB4RwRAIAEgCykCADcCACABQQhqIAtBCGopAgA3AgALIAAgAykCDDcCACAAQQhqIANBFGopAgA3AgALIANBQGskAAvqBAEKfyMAQTBrIgMkACADIAE2AiwgAyAANgIoIANBAzoAJCADQiA3AhwgA0EANgIUIANBADYCDAJ/AkACQAJAIAIoAhAiCkUEQCACKAIMIgBFDQEgAigCCCIBIABBA3RqIQQgAEEBa0H/////AXFBAWohByACKAIAIQADQCAAQQRqKAIAIgUEQCADKAIoIAAoAgAgBSADKAIsKAIMEQEADQQLIAEoAgAgA0EMaiABQQRqKAIAEQAADQMgAEEIaiEAIAQgAUEIaiIBRw0ACwwBCyACKAIUIgBFDQAgAEEFdCELIABBAWtB////P3FBAWohByACKAIIIQUgAigCACEAA0AgAEEEaigCACIBBEAgAygCKCAAKAIAIAEgAygCLCgCDBEBAA0DCyADIAggCmoiAUEQaigCADYCHCADIAFBHGotAAA6ACQgAyABQRhqKAIANgIgIAFBDGooAgAhBEEAIQlBACEGAkACQAJAIAFBCGooAgBBAWsOAgACAQsgBSAEQQN0aiIMKAIADQEgDCgCBCEEC0EBIQYLIAMgBDYCECADIAY2AgwgAUEE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QAJAAkACQAJAAkACQAJAAkACQAJAIAFBCGsOCAECBgYGAwQFAAtBMiECIAFBhAFrDgoFBgkJBwkJCQkICQsMCAtBGyECDAcLQQYhAgwGC0EsIQIMBQtBKiECDAQLQR8hAgwDC0EgIQIMAgtBHCECDAELQSMhAgsgACACOgAAC2sBAn8jAEEQayIDJAACQCAAIAEoAggiBCABKAIASQR/IANBCGogASAEQQRBBBA2IAMoAggiBEGBgICAeEcNASABKAIIBSAECzYCBCAAIAEoAgQ2AgAgA0EQaiQADwsgBCADKAIMIAIQyAEAC2sBAn8jAEEQayIDJAACQCAAIAEoAggiBCABKAIASQR/IANBCGogASAEQQFBARA2IAMoAggiBEGBgICAeEcNASABKAIIBSAECzYCBCAAIAEoAgQ2AgAgA0EQaiQADwsgBCADKAIMIAIQyAEAC2sBAX8jAEEwayIDJAAgAyABNgIEIAMgADYCACADQQM2AgwgA0Gs+cAANgIIIANCAjcCFCADIANBBGqtQoCAgIDQCYQ3AyggAyADrUKAgICA0AmENwMgIAMgA0EgajYCECADQQhqIAIQswEAC2sBAX8jAEEwayIDJAAgAyABNgIEIAMgADYCACADQQI2AgwgA0GM+8AANgIIIANCAjcCFCADIAOtQoCAgIDQCYQ3AyggAyADQQRqrUKAgICA0AmENwMgIAMgA0EgajYCECADQQhqIAIQswEAC3EBAX8jAEEQayICJAAgAiAAQSBqNgIMIAFBzILAAEEGQdKCwABBBSAAQQxqQZyCwABB14LAAEEEIABBGGpB24LAAEEEIABBHGpB6IHAAEHfgsAAQRAgAEGsgsAAQe+CwABBCyACQQxqEDggAkEQaiQAC3EBAX8jAEEQayICJAAgAiAAQRNqNgIMIAFBuIPAAEEIQcCDwABBCiAAQeiBwABByoPAAEEKIABBBGpB1IPAAEEDIABBCGpBmIPAAEHXg8AAQQsgAEESakGog8AAQeKDwABBDiACQQxqEDggAkEQaiQAC2cAIwBBMGsiACQAQZCUwQAtAAAEQCAAQQI2AgwgAEHE9MAANgIIIABCATcCFCAAIAE2AiwgACAAQSxqrUKAgICA0AmENwMgIAAgAEEgajYCECAAQQhqQez0wAAQswEACyAAQTBqJAALZgECfyMAQRBr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CyACIABBBGo2AgwgAUHwiMAAQQQgAkEMakH0iMAAECoLIAJBEGokAAuMBAEFfyMAQeAFayIDJAAgA0HQBWoiBEEANgIAIARC0ICAgIADNwIIIAMgATYC3AUgAyAANgLYBSADIAI2AtQFIANBATYC0AUgA0HIAWpBAEGFBBAcGiADQYCAxAA2AsQBIAQoAgghACAEKAIMIQIgBCgCACEFIAQoAgQhBCMAQeAAayIBJAAgAUEMaiIGIAAgAiAFIARBABAsIAFBMGoiByAAIAJBAUEAQQAQLCABQdQAaiACEDQgA0HQAGogABA/IAMgAjYCoAEgAyAANgKcASADIAZBJBAWIgBBJGogB0EkEBYaIABBADsBugEgAEECOgC2ASAAQQI6ALIBIABBAToAcCAAQgA3AmggACAENgJMIAAgBTYCSCAAQQA7AbABIABBADoAwgEgAEEAOwHAASAAQYCAgAg2ArwBIABCADcCpAEgACACQQFrNgKsASAAQoCAgAg3AoQBIABCADcCdCAAQYCAgAg2ApgBIABBAjoAlAEgAEECOgCQASAAQQA2AowBIABBAjoAgAEgAEECOgB8IABBADoAwwEgAEHkAGogAUHcAGooAgA2AgAgACABKQJUNwJcIAFB4ABqJABBkZTBAC0AABpB1AVBBBDVASIARQRAQQRB1AVBzJTBACgCACIAQc4AIAAbEQIAAAsgAEEANgIAIABBBGogA0HQBRAWGiADQeAFaiQAIAALrBcBG38CQCAABEAgACgCACICQX9GDQEgACACQQFqNgIAIwBB4ABrIgUkACMAQRBrIgIkACACQQhqIABBBGoQmQECQCACKAIMIgQgAUsEQCACKAIIIAJBEGokACABQQR0aiEBDAELIAEgBEGAscAAEGkACyAFQQA2AiAgBUKAgICAwAA3AhggBSABKAIEIgI2AiQgBSACIAEoAghBBHRqNgIoIAVBADYCFCAFQoCAgIDAADcCDCAFQSxqIAVBGGoQEwJAAkAgBSgCLEGAgICAeEcEQANAIAVBQGsiECAFQTRqKAIAIgE2AgAgBSAFKQIsNwM4IAVBxABqIQ4gBSgCPCILIAFBBHRqIQEjAEEQayIIJAAgCEEANgIMIAhCgICAgBA3AgQgASALRwRAIAhBBGpBACABIAtrQQR2QQFBARCTAQsgCEEEaiEGIwBB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/wE6AAAgASAUaiIBQQhqIAtBCGooAAA2AAAgASALKQAANwAADAELIBUgDUEZdiIBOgAAIBAgAEEIayAFcWogAToAAAsgAEEBaiEBIANBDGshAyAAIAVHDQALCyAEIBMgCWs2AggLQYGAgIB4IQMMAQsQiQEgBigCBCEAIAYoAgAhAwsgFyAANgIEIBcgAzYCACAGQUBrJAALIAwgEjYCDCAMIA82AgggDCAbNwMACyAMIAQ2AhAgFkEQaiQAAkAgCigCGCICRQRAIAooAgghBAwBCyAKKQMIIRkgCikDECEaIAogDyASEAU2AhAgCiAaNwIIIApBCGohCSACKAIEIgMgGaciB3EiBCACKAIAIgFqKQAAQoCBgoSIkKDAgH+DIhlQBEBBCCEAA0AgACAEaiEEIABBCGohACABIAMgBHEiBGopAABCgIGChIiQoMCAf4MiGVANAAsLIAEgGXqnQQN2IARqIANxIgRqLAAAIgBBAE4EQCABIAEpAwBCgIGChIiQoMCAf4N6p0EDdiIEai0AACEACyABIARqIAdBGXYiBzoAACABIARBCGsgA3FqQQhqIAc6AAAgAiACKAIIIABBAXFrNgIIIAIgAigCDEEBajYCDCABIARBdGxqIgRBDGsiACAJKQIANwIAIABBCGogCUEIaigCADYCAAsgBEEEaygCABACIQAgDiAOKAIAQQFqNgIAIApBIGokAAwCCyMAQTBrIgAkACAAQQE2AgwgAEGY9MAANgIIIABCATcCFCAAIABBL2qtQoCAgIDACYQ3AyAgACAAQSBqNgIQIABBCGpBtJTAABCzAQALIwBBMGsiACQAIABBATYCDCAAQaT6wAA2AgggAEIBNwIUIAAgAEEvaq1CgICAgLAMhDcDICAAIABBIGo2AhAgAEEIakHolsAAELMBAAsgEUEQaiQAIAALOwEBfyADaUEBRkGAgICAeCADayABT3EhBAJAAkAgA0UNACAERQ0AIAAgASADIAIQzAEiAA0BCwALIAALtAEBAn8jAEEQayIAJAAgASgCHEHE88AAQQsgASgCICgCDBEBACEDIABBCGoiAkEAOgAFIAIgAzoABCACIAE2AgAgAiIBLQAEIQIgAS0ABQRAIAEiAwJ/QQEgAkEBcQ0AGiADKAIAIgEtABRBBHFFBEAgASgCHEH3/MAAQQIgASgCICgCDBEBAAwBCyABKAIcQfb8wABBASABKAIgKAIMEQEACyICOgAECyAAQRBqJAAgAkEBcQs4AQF/QQEhASAALQAERQRAIAAoAgAiASgCHEH+/MAAQQEgASgCICgCDBEBACEBCyAAIAE6AAQgAQsrACABIAJJBEBBgKLAAEEjQfCiwAAQnAEACyACIAAgAkEEdGogASACaxASCy8BAn8gACAAKAKoASICIAAoAqwBQQFqIgMgASAAQbIBahBdIABB3ABqIAIgAxB8Cy8BAn8gACAAKAKoASICIAAoAqwBQQFqIgMgASAAQbIBahAmIABB3ABqIAIgAxB8C/oBAgJ/AX4jAEEQayICJAAgAkEBOwEMIAIgATYCCCACIAA2AgQjAEEQayIBJAAgAkEEaiIAKQIAIQQgASAANgIMIAEgBDcCBCMAQRBrIgAkACABQQRqIgEoAgAiAigCDCEDAkACQAJAAkAgAigCBA4CAAECCyADDQFBASECQQAhAwwCCyADDQAgAigCACICKAIEIQMgAigCACECDAELIABBgICAgHg2AgAgACABNgIMIABBuPXAACABKAIEIAEoAggiAC0ACCAALQAJEEIACyAAIAM2AgQgACACNgIAIABBnPXAACABKAIEIAEoAggiAC0ACCAALQAJEEIACyUAIABBATYCBCAAIAEoAgQgASgCAGtBBHYiATYCCCAAIAE2AgALJQAgAEUEQEH8l8AAQTIQ9gEACyAAIAIgAyAEIAUgASgCEBEIAAswACABKAIcIAAtAABBAnQiAEH4icAAaigCACAAQeyJwABqKAIAIAEoAiAoAgwRAQALMAAgASgCHCAALQAAQQJ0IgBBnJDAAGooAgAgAEHkj8AAaigCACABKAIgKAIMEQEACyMAIABFBEBB/JfAAEEyEPYBAAsgACACIAMgBCABKAIQEQwACyMAIABFBEBB/JfAAEEyEPYBAAsgACACIAMgBCABKAIQEQYACyMAIABFBEBB/JfAAEEyEPYBAAsgACACIAMgBCABKAIQERcACyMAIABFBEBB/JfAAEEyEPYBAAsgACACIAMgBCABKAIQERkACyMAIABFBEBB/JfAAEEyEPYBAAsgACACIAMgBCABKAIQERsACyAAIABBEGoQNSAAKAIAQYCAgIB4RwRAIABBBEEQEF8LCygBAX8gACgCACIBQYCA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eXBlY3Vyc29yY2hhcnNldHNhY3RpdmVfY2hhcnNldHRhYnNpbnNlcnRfbW9kZW5ld19saW5lX21vZGVjdXJzb3Jfa2V5c19tb2RlbmV4dF9wcmludF93cmFwc3RvcF9tYXJnaW5ib3R0b21fbWFyZ2luc2F2ZWRfY3R4YWx0ZXJuYXRlX3NhdmVkX2N0eGRpcnR5X2xpbmVzeHR3aW5vcHMAAFcBEAAEAAAAWwEQAAQAAACAAhAABgAAAIYCEAAMAAAAkgIQABIAAABfARAAEAAAAKQCEAAGAAAA1AEQAAMAAACqAhAACAAAALICEAAOAAAAwAIQAAQAAADEAhAACwAAANcBEAALAAAA4gEQAA4AAADPAhAADQAAANwCEAAQAAAA7AIQABAAAAD8AhAACgAAAAYDEAANAAAAEwMQAAkAAAAcAxAAEwAAAC8DEAALAAAAOgMQAAgAAABUZXJtaW5hbFByaW1hcnlBbHRlcm5hdGUAAAAABAAAAAQAAAAbAAAAU2Nyb2xsYmFja0xpbWl0c29mdGhhcmRBcHBsaWNhdGlvbkN1cnNvcmNvbHJvd3Zpc2libGVOb25lAAAAAAAAAAQAAAAEAAAAHAAAAFNvbWUAAAAABAAAAAQAAAAdAAAAAAAAAAEAAAABAAAAHgAAAFJnYnJnYgAAAAAAAAQAAAAEAAAAHwAAAERpcnR5TGluZXNNYXAga2V5IGlzIG5vdCBhIHN0cmluZyBhbmQgY2Fubm90IGJlIGFuIG9iamVjdCBrZXkAAAAGAAAABAAAAAUAAAB6ARAAgAEQAIQBEAAvVXNlcnMvbWljaGFlbG1lcnJpbGwvLmNhcmdvL3JlZ2lzdHJ5L3NyYy9pbmRleC5jcmF0ZXMuaW8tMTk0OWNmOGM2YjViNTU3Zi93YXNtLWJpbmRnZW4tMC4yLjkyL3NyYy9jb252ZXJ0L3NsaWNlcy5ycwQFEAB0AAAAGQEAABIAAAAAAAAADAIAAAQAAAAiAAAAAAAAAAQAAAAEAAAAIwAAAFZ0cGFyc2VydGVybWluYWwkAAAABAAAAAQAAAAlAAAAY2FsbGVkIGBSZXN1bHQ6OnVud3JhcCgpYCBvbiBhbiBgRXJyYCB2YWx1ZUdyb3VuZEVzY2FwZUVzY2FwZUludGVybWVkaWF0ZUNzaUVudHJ5Q3NpUGFyYW1Dc2lJbnRlcm1lZGlhdGVDc2lJZ25vcmVEY3NFbnRyeURjc1BhcmFtRGNzSW50ZXJtZWRpYXRlRGNzUGFzc3Rocm91Z2hEY3NJZ25vcmVPc2NTdHJpbmdTb3NQbUFwY1N0cmluZwAAAAAAAAEAAAABAAAAJgAAAAAAAAAAAgAABAAAACcAAAAAAAAABAAAAAQAAAAoAAAAAAAAAAQAAAAEAAAAKQAAAFBhcnNlcnN0YXRlcGFyYW1zY3VyX3BhcmFtaW50ZXJtZWRpYXRlAAAAAAAABAAAAAQAAAAqAAAARXJyb3JmZ3NyYy9saWIucnNiZ2ZhaW50AWJvbGRpdGFsaWN1bmRlcmxpbmVzdHJpa2V0aHJvdWdoYmxpbmtpbnZlcnNlIwAARQcQAAEAAAABAAAAAAAAAAEAAAAAAAAABwcQAAoAAAAjAAAANgAAAAcHEAAKAAAAKAAAADYAAAABAAAAAAAAAAcHEAAKAAAATQAAADEAAAAHBxAACgAAAEUAAAAgAAAABwcQAAoAAABDAAAAFgAAAAcHEAAKAAAAVAAAAC8AAABTZWdtZW50dGV4dHBlbm9mZnNldHdpZHRoAAAABgAAAAYAAAASAAAACAAAAAgAAAAPAAAACQAAAAgAAAAIAAAADwAAAA4AAAAJAAAACQAAAA4AAADzBRAA+QUQAP8FEAARBhAAGQYQACEGEAAwBhAAOQYQAEEGEABJBhAAWAYQAGYGEABvBhAAeAYQAGB1bndyYXBfdGhyb3dgIGZhaWxlZAAAAAAAAAAEAAAABAAAACsAAAAAAAAABAAAAAQAAAAbAAAAAAAAAAQAAAAEAAAALAAAAAAAAAAEAAAABAAAAAwAAAAAAAAABAAAAAQAAAAtAAAAAAAAAAQAAAAEAAAALgAAAAAAAAAEAAAABAAAAC8AAAAwAAAADAAAAAQAAAAxAAAATGluZWNlbGxzd3JhcHBlZAAAAAAEAAAABAAAAAMAAABJbmRleGVkAAAAAAAEAAAABAAAADIAAABSR0JOb25lAAAAAAAEAAAABAAAADMAAABTb21lL1VzZXJzL21pY2hhZWxtZXJyaWxsLy5jYXJnby9yZWdpc3RyeS9zcmMvaW5kZXguY3JhdGVzLmlvLTE5NDljZjhjNmI1YjU1N2YvYXZ0LTAuMTUuMC9zcmMvbGluZS5ycwAAAEAJEABhAAAA0AAAADMAAABACRAAYQAAANUAAAAcAAAAQAkQAGEAAADSAAAAHAAAAEAJEABhAAAAzAAAABwAAAAvcnVzdGMvMDVmOTg0NmY4OTNiMDlhMWJlMWZjODU2MGUzM2ZjM2M4MTVjZmVjYi9saWJyYXJ5L3N0ZC9zcmMvdGhyZWFkL2xvY2FsLnJzAOQJEABPAAAAFAEAABkAAAAvcnVzdGMvMDVmOTg0NmY4OTNiMDlhMWJlMWZjODU2MGUzM2ZjM2M4MTVjZmVjYi9saWJyYXJ5L2FsbG9jL3NyYy9zbGljZS5ycwAARAoQAEoAAACiAAAAGQAAAP//////////oAoQAEG4lcAAC6UaIGNhbid0IGJlIHJlcHJlc2VudGVkIGFzIGEgSmF2YVNjcmlwdCBudW1iZXIBAAAAAAAAALgKEAAsAAAANQAAAC9Vc2Vycy9taWNoYWVsbWVycmlsbC8uY2FyZ28vcmVnaXN0cnkvc3JjL2luZGV4LmNyYXRlcy5pby0xOTQ5Y2Y4YzZiNWI1NTdmL3NlcmRlLXdhc20tYmluZGdlbi0wLjYuNS9zcmMvbGliLnJzAAD4ChAAbgAAADUAAAAOAAAAL1VzZXJzL21pY2hhZWxtZXJyaWxsLy5jYXJnby9yZWdpc3RyeS9zcmMvaW5kZXguY3JhdGVzLmlvLTE5NDljZjhjNmI1YjU1N2Yvd2FzbS1iaW5kZ2VuLTAuMi45Mi9zcmMvY29udmVydC9zbGljZXMucnN4CxAAdAAAABkBAAASAAAAY2xvc3VyZSBpbnZva2VkIHJlY3Vyc2l2ZWx5IG9yIGFmdGVyIGJlaW5nIGRyb3BwZWQvcnVzdGMvMDVmOTg0NmY4OTNiMDlhMWJlMWZjODU2MGUzM2ZjM2M4MTVjZmVjYi9saWJyYXJ5L2FsbG9jL3NyYy9zbGljZS5ycy4MEABKAAAAogAAABkAAAAvcnVzdGMvMDVmOTg0NmY4OTNiMDlhMWJlMWZjODU2MGUzM2ZjM2M4MTVjZmVjYi9saWJyYXJ5L2FsbG9jL3NyYy92ZWMvbW9kLnJziAwQAEwAAAA9CgAAJAAAAC9ydXN0Yy8wNWY5ODQ2Zjg5M2IwOWExYmUxZmM4NTYwZTMzZmMzYzgxNWNmZWNiL2xpYnJhcnkvY29yZS9zcmMvaXRlci90cmFpdHMvaXRlcmF0b3IucnPkDBAAWAAAALMHAAAJAAAAL1VzZXJzL21pY2hhZWxtZXJyaWxsLy5jYXJnby9yZWdpc3RyeS9zcmMvaW5kZXguY3JhdGVzLmlvLTE5NDljZjhjNmI1YjU1N2YvYXZ0LTAuMTUuMC9zcmMvcGFyc2VyLnJzAEwNEABjAAAAxgEAACIAAABMDRAAYwAAANoBAAANAAAATA0QAGMAAADcAQAADQAAAEwNEABjAAAATQIAACYAAABMDRAAYwAAAFICAAAmAAAATA0QAGMAAABYAgAAGAAAAEwNEABjAAAAcAIAABMAAABMDRAAYwAAAHQCAAATAAAATA0QAGMAAAAFAwAAJwAAAEwNEABjAAAACwMAACcAAABMDRAAYwAAABEDAAAnAAAATA0QAGMAAAAXAwAAJwAAAEwNEABjAAAAHQMAACcAAABMDRAAYwAAACMDAAAnAAAATA0QAGMAAAApAwAAJwAAAEwNEABjAAAALwMAACcAAABMDRAAYwAAADUDAAAnAAAATA0QAGMAAAA7AwAAJwAAAEwNEABjAAAAQQMAACcAAABMDRAAYwAAAEcDAAAnAAAATA0QAGMAAABNAwAAJwAAAEwNEABjAAAAUwMAACcAAABMDRAAYwAAAG4DAAArAAAATA0QAGMAAAB7AwAALwAAAEwNEABjAAAAhwMAAC8AAABMDRAAYwAAAIwDAAArAAAATA0QAGMAAACRAwAAJwAAAEwNEABjAAAArQMAACsAAABMDRAAYwAAALoDAAAvAAAATA0QAGMAAADGAwAALwAAAEwNEABjAAAAywMAACsAAABMDRAAYwAAANADAAAnAAAATA0QAGMAAADeAwAAJwAAAEwNEABjAAAA1wMAACcAAABMDRAAYwAAAJgDAAAnAAAATA0QAGMAAABaAwAAJwAAAEwNEABjAAAAYAMAACcAAABMDRAAYwAAAJ8DAAAnAAAATA0QAGMAAABnAwAAJwAAAEwNEABjAAAApgMAACcAAABMDRAAYwAAAOQDAAAnAAAATA0QAGMAAAAOBAAAEwAAAEwNEABjAAAAFwQAABsAAABMDRAAYwAAACAEAAAUAAAAL1VzZXJzL21pY2hhZWxtZXJyaWxsLy5jYXJnby9yZWdpc3RyeS9zcmMvaW5kZXguY3JhdGVzLmlvLTE5NDljZjhjNmI1YjU1N2YvdW5pY29kZS13aWR0aC0wLjEuMTQvc3JjL3RhYmxlcy5ycwAAAHAQEABtAAAAkQAAABUAAABwEBAAbQAAAJcAAAAZAAAAYXNzZXJ0aW9uIGZhaWxlZDogbWlkIDw9IHNlbGYubGVuKCkvcnVzdGMvMDVmOTg0NmY4OTNiMDlhMWJlMWZjODU2MGUzM2ZjM2M4MTVjZmVjYi9saWJyYXJ5L2NvcmUvc3JjL3NsaWNlL21vZC5ycyMREABNAAAArA0AAAkAAABhc3NlcnRpb24gZmFpbGVkOiBrIDw9IHNlbGYubGVuKCkAAAAjERAATQAAANkNAAAJAAAAYXNzZXJ0aW9uIGZhaWxlZDogbWlkIDw9IHNlbGYubGVuKCkvcnVzdGMvMDVmOTg0NmY4OTNiMDlhMWJlMWZjODU2MGUzM2ZjM2M4MTVjZmVjYi9saWJyYXJ5L2NvcmUvc3JjL3NsaWNlL21vZC5yc9cREABNAAAArA0AAAkAAABhc3NlcnRpb24gZmFpbGVkOiBrIDw9IHNlbGYubGVuKCkAAADXERAATQAAANkNAAAJAAAAL1VzZXJzL21pY2hhZWxtZXJyaWxsLy5jYXJnby9yZWdpc3RyeS9zcmMvaW5kZXguY3JhdGVzLmlvLTE5NDljZjhjNmI1YjU1N2YvYXZ0LTAuMTUuMC9zcmMvbGluZS5ycwAAAGgSEABhAAAADgAAABQAAABoEhAAYQAAABQAAAATAAAAaBIQAGEAAAAYAAAAEwAAAGgSEABhAAAAHAAAABMAAABoEhAAYQAAAB0AAAATAAAAaBIQAGEAAAAhAAAAEwAAAGgSEABhAAAAIwAAABMAAABoEhAAYQAAADgAAAAlAAAAaBIQAGEAAABjAAAAIwAAAGgSEABhAAAABQAAABEAAAAvcnVzdGMvMDVmOTg0NmY4OTNiMDlhMWJlMWZjODU2MGUzM2ZjM2M4MTVjZmVjYi9saWJyYXJ5L2FsbG9jL3NyYy9yYXdfdmVjLnJzbBMQAEwAAAAqAgAAEQAAAC9ydXN0Yy8wNWY5ODQ2Zjg5M2IwOWExYmUxZmM4NTYwZTMzZmMzYzgxNWNmZWNiL2xpYnJhcnkvY29yZS9zcmMvaXRlci90cmFpdHMvaXRlcmF0b3IucnPIExAAWAAAALMHAAAJAAAAL1VzZXJzL21p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OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OUA5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5QQICQkMCAkRFRkdISQJKOTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5SwICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAjk5OTlMAgICAgJNTk9QAgICUQJSUwICAgICAgICAgICAgJUVQICVgJXAgJYWVpbXF1eX2BhAmJjAmRlZmcCaAJpamtsAgJtbm9wAnFyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJzAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdHUCAgICAgICdnc5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OXg5OTk5OTk5OTl5egICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICezk5fDk5fQICAgICAgICAgICAgICAgICAgJ+AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfwICAoCBggICAgICAgICAgICAgICAoOEAgICAgICAgICAoWGdQIChwICAogCAgICAgICiYoCAgICAgICAgICAgICi4wCjY4Cj5CRkpOUlZYClwICmJmamwICAgICAgICAgI5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTmcHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCdAgICAp6fAgQCBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHQICHgICAgICAgIfICEiIwIkJSYnKCkCKgICAgKgoaKjpKWmLqeoqaqrrK0zAgICAgICrgICNTY3Ajg5Ojs8PT6vOTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5TAICAgICsE5PsYWGdQIChwICAogCAgICAgICiYoCAgICAgICAgICAgICi4yys44Cj5CRkpOUlZYClwICmJmamwICAgICAgICAgJVVXVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUAQbzCwAALKVVVVVUVAFBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUBAEHvwsAAC8QBEEEQVVVVVVVXVVVVVVVVVVVVUVVVAABAVPXdVVVVVVVVVVUVAAAAAABVVVVV/F1VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQUAFAAUBFBVVVVVVVVVFVFVVVVVVVVVAAAAAAAAQFVVVVVVVVVVVdVXVVVVVVVVVVVVVVUFAABUVVVVVVVVVVVVVVVVVRUAAFVVUVVVVVVVBRAAAAEBUFVVVVVVVVVVVVUBVVVVVVX/////f1VVVVBVAABVVVVVVVVVVVVVBQBBwMTAAAuYBEBVVVVVVVVVVVVVVVVVRVQBAFRRAQBVVQVVVVVVVVVVUVVVVVVVVVVVVVVVVVVVRAFUVVFVFVVVBVVVVVVVVUVBVVVVVVVVVVVVVVVVVVVUQRUUUFFVVVVVVVVVUFFVVUFVVVVVVVVVVVVVVVVVVVQBEFRRVVVVVQVVVVVVVQUAUVVVVVVVVVVVVVVVVVVVBAFUVVFVAVVVBVVVVVVVVVVFVVVVVVVVVVVVVVVVVVVFVFVVUVUVVVVVVVVVVVVVVVRUVVVVVVVVVVVVVVVVVQRUBQRQVUFVVQVVVVVVVVVVUVVVVVVVVVVVVVVVVVVVFEQFBFBVQVVVBVVVVVVVVVVQVVVVVVVVVVVVVVVVVRVEAVRVQVUVVVUFVVVVVVVVVVFVVVVVVVVVVVVVVVVVVVVVVUUVBURVFVVVVVVVVVVVVVVVVVVVVVVVVVVVUQBAVVUVAEBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVRAABUVVUAQFVVVVVVVVVVVVVVVVVVVVVVVVBVVVVVVVURUVVVVVVVVVVVVVVVVVUBAABAAARVAQAAAQAAAAAAAAAAVFVFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQEEAEFBVVVVVVVVUAVUVVVVAVRVVUVBVVFVVVVRVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqAEGAycAAC5ADVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUBVVVVVVVVVVVVVVVVBVRVVVVVVVUFVVVVVVVVVQVVVVVVVVVVBVVVVX///ff//ddfd9bV11UQAFBVRQEAAFVXUVVVVVVVVVVVVVUVAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQVVVVVVVVVVVUVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQBVUVUVVAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVcVFFVVVVVVVVVVVVVVVVVVRQBARAEAVBUAABRVVVVVVVVVVVVVVVUAAAAAAAAAQFVVVVVVVVVVVVVVVQBVVVVVVVVVVVVVVVUAAFAFVVVVVVVVVVVVFQAAVVVVUFVVVVVVVVUFUBBQVVVVVVVVVVVVVVVVVUVQEVBVVVVVVVVVVVVVVVVVVQAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQAAAAAQAVFFVVFBVVVVVVVVVVVVVVVVVVVVVVQBBoMzAAAuTCFVVFQBVVVVVVVUFQFVVVVVVVVVVVVVVVQAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUAAAAAAAAAAFRVVVVVVVVVVVX1VVVVaVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/VfXVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX1VVVVVVV9VVVVVVVVVVVVVVVX///9VVVVVVVVVVVVV1VVVVVXVVVVVXVX1VVVVVX1VX1V1VVdVVVVVdVX1XXVdVV31VVVVVVVVVVdVVVVVVVVVVXfV31VVVVVVVVVVVVVVVVVVVf1VVVVVVVVXVVXVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVdVXVVVVVVVVVVVVVVVVV11VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVFVBVVVVVVVVVVVVVVVVVVVX9////////////////X1XVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQAAAAAAAAAAqqqqqqqqmqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpVVVWqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqlpVVVVVVVWqqqqqqqqqqqqqqqqqqgoAqqqqaqmqqqqqqqqqqqqqqqqqqqqqqqqqqmqBqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqlWpqqqqqqqqqqqqqqmqqqqqqqqqqqqqqqqoqqqqqqqqqqqqaqqqqqqqqqqqqqqqqqqqqqqqqqqqqlVVlaqqqqqqqqqqqqqqaqqqqqqqqqqqqqpVVaqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpVVVVVVVVVVVVVVVVVVVVVqqqqVqqqqqqqqqqqqqqqqqpqVVVVVVVVVVVVVVVVVV9VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUVQAAAUFVVVVVVVVUFVVVVVVVVVVVVVVVVVVVVVVVVVVVQVVVVRUUVVVVVVVVVQVVUVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVBVVVVVVVUAAAAAUFVFFVVVVVVVVVVVVQUAUFVVVVVVFQAAUFVVVaqqqqqqqqpWQFVVVVVVVVVVVVVVFQVQUFVVVVVVVVVVVVFVVVVVVVVVVVVVVVVVVVVVAUBBQVVVFVVVVFVVVVVVVVVVVVVVVFVVVVVVVVVVVVVVVQQUVAVRVVVVVVVVVVVVVVBVRVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVFUUVVVVVWqqqqqqqqqqqpVVVUAAAAAAEAVAEG/1MAAC+EMVVVVVVVVVVVFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVAAAA8KqqWlUAAAAAqqqqqqqqqqpqqqqqqmqqVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVFamqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqlZVVVVVVVVVVVVVVVVVVQVUVVVVVVVVVVVVVVVVVVVVqmpVVQAAVFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVRVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUFQFUBQVUAVVVVVVVVVVVVVUAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVBVVVVVVVV1VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUVVFVVVVVVVVVVVVVVVVVVVVVVVVUBVVVVVVVVVVVVVVVVVVVVVVUFAABUVVVVVVVVVVVVVVUFUFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVFVVVVVVVVVVVVVVVVVAAAAQFVVVVVVVVVVVVUUVFUVUFVVVVVVVVVVVVVVFUBBVUVVVVVVVVVVVVVVVVVVVVVAVVVVVVVVVVUVAAEAVFVVVVVVVVVVVVVVVVVVFVVVVVBVVVVVVVVVVVVVVVUFAEAFVQEUVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUVUARVRVFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVRUVAEBVVVVVVVBVVVVVVVVVVVVVVVVVFURUVVVVVRVVVVUFAFQAVFVVVVVVVVVVVVVVVVVVVVUAAAVEVVVVVVVFVVVVVVVVVVVVVVVVVVVVVVVVVVUUAEQRBFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVFQVQVRBUVVVVVVVVUFVVVVVVVVVVVVVVVVVVVVVVVVVVFQBAEVRVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVFVEAEFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUBBRAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUVAABBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUVRUEEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQAFVVRVVVVVVVVVAQBAVVVVVVVVVVVVFQAEQFUVVVUBQAFVVVVVVVVVVVVVAAAAAEBQVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQBAABBVVVVVVVVVVVVVVVVVVVVVVVVVVQUAAAAAAAUABEFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUBQEUQAABVVVVVVVVVVVVVVVVVVVVVVVVQEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVRVUVVVAVVVVVVVVVVVVVVVVBUBVRFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUFQAAAFBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQBUVVVVVVVVVVVVVVVVVVUAQFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUVVVVVVVVVVVVVVVVVVVVVFUBVVVVVVVVVVVVVVVVVVVVVVVVVqlRVVVpVVVWqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpVVaqqqqqqqqqqqqqqqqqqqqqqqqqqqlpVVVVVVVVVVVVVqqpWVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVqqmqaaqqqqqqqqqqalVVVWVVVVVVVVVVallVVVWqVVWqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqlVVVVVVVVVVQQBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQBBq+HAAAt1UAAAAAAAQFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVRFQBQAAAABAAQBVVVVVVVVVBVBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUFVFVVVVVVVVVVVVVVVVVVAEGt4sAACwJAFQBBu+LAAAvFBlRVUVVVVVRVVVVVFQABAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVUAQAAAAAAUABAEQFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVRVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVFVVVVVVVVVVVVVVVVVVVVAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVAEBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUAQFVVVVVVVVVVVVVVVVVVV1VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVXVVVVVVVVVVVVVVVVVVVVVdf3/f1VVVVVVVVVVVVVVVVVVVVVVVfX///////9uVVVVqqq6qqqqqur6v79VqqpWVV9VVVWqWlVVVVVVVf//////////V1VV/f/f///////////////////////3//////9VVVX/////////////f9X/VVVV/////1dX//////////////////////9/9//////////////////////////////////////////////////////////////X////////////////////X1VV1X////////9VVVVVdVVVVVVVVX1VVVVXVVVVVVVVVVVVVVVVVVVVVVVVVVXV////////////////////////////VVVVVVVVVVVVVVVV//////////////////////9fVVd//VX/VVXVV1X//1dVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX///9VV1VVVVVVVf//////////////f///3/////////////////////////////////////////////////////////////9VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV////V///V1X//////////////9//X1X1////Vf//V1X//1dVqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqlpVVVVVVVVVVVmWVWGqpVmqVVVVVVWVVVVVVVVVVZVVVQBBjunAAAsBAwBBnOnAAAupDlVVVVVVlVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVFQCWalpaaqoFQKZZlWVVVVVVVVVVVQAAAABVVlVVqVZVVVVVVVVVVVVWVVVVVVVVVVUAAAAAAAAAAFRVVVWVWVlVVWVVVWlVVVVVVVVVVVVVVZVWlWqqqqpVqqpaVVVVWVWqqqpVVVVVZVVVWlVVVVWlZVZVVVWVVVVVVVVVppaalllZZamWqqpmVapVWllVWlZlVVVVaqqlpVpVVVWlqlpVVVlZVVVZVVVVVVWVVVVVVVVVVVVVVVVVVVVVVVVVVVVlVfVVVVVpVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpVqqqqqqqqqqqqVVVVqqqqqqVaVVWaqlpVpaVVWlqllqVaVVVVpVpVlVVVVX1VaVmlVV9VZlVVVVVVVVVVZlX///9VVVWammqaVVVV1VVVVVXVVVWlXVX1VVVVVb1Vr6q6qquqqppVuqr6rrquVV31VVVVVVVVVVdVVVVVWVVVVXfV31VVVVVVVVWlqqpVVVVVVVXVV1VVVVVVVVVVVVVVVVetWlVVVVVVVVVVVaqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqAAAAwKqqWlUAAAAAqqqqqqqqqqpqqqqqqmqqVVVVVVVVVVVVVVVVBVRVVVVVVVVVVVVVVVVVVVWqalVVAABUWaqqalWqqqqqqqqqWqqqqqqqqqqqqqqqqqqqWlWqqqqqqqqquv7/v6qqqqpWVVVVVVVVVVVVVVVVVfX///////9Kc1ZhbHVlKCkAAABANxAACAAAAEg3EAABAAAAbnVsbCBwb2ludGVyIHBhc3NlZCB0byBydXN0cmVjdXJzaXZlIHVzZSBvZiBhbiBvYmplY3QgZGV0ZWN0ZWQgd2hpY2ggd291bGQgbGVhZCB0byB1bnNhZmUgYWxpYXNpbmcgaW4gcnVzdC9Vc2Vycy9taWNoYWVsbWVycmlsbC8uY2FyZ28vcmVnaXN0cnkvc3JjL2luZGV4LmNyYXRlcy5pby0xOTQ5Y2Y4YzZiNWI1NTdmL3dhc20tYmluZGdlbi0wLjIuOTIvc3JjL2NvbnZlcnQvc2xpY2VzLnJzAADGNxAAdAAAAN4AAAABAAAAL3J1c3RjLzA1Zjk4NDZmODkzYjA5YTFiZTFmYzg1NjBlMzNmYzNjODE1Y2ZlY2IvbGlicmFyeS9hbGxvYy9zcmMvc3RyaW5nLnJzAEw4EABLAAAAjQUAABsAAAAvcnVzdGMvMDVmOTg0NmY4OTNiMDlhMWJlMWZjODU2MGUzM2ZjM2M4MTVjZmVjYi9saWJyYXJ5L2FsbG9jL3NyYy9yYXdfdmVjLnJzqDgQAEwAAAAqAgAAEQAAAE8AAAAMAAAABAAAAFAAAABRAAAAUgAAAC9ydXN0L2RlcHMvZGxtYWxsb2MtMC4yLjcvc3JjL2RsbWFsbG9jLnJzYXNzZXJ0aW9uIGZhaWxlZDogcHNpemUgPj0gc2l6ZSArIG1pbl9vdmVyaGVhZAAcORAAKQAAAKgEAAAJAAAAYXNzZXJ0aW9uIGZhaWxlZDogcHNpemUgPD0gc2l6ZSArIG1heF9vdmVyaGVhZAAAHDkQACkAAACuBAAADQAAAEFjY2Vzc0Vycm9yY2Fubm90IGFjY2VzcyBhIFRocmVhZCBMb2NhbCBTdG9yYWdlIHZhbHVlIGR1cmluZyBvciBhZnRlciBkZXN0cnVjdGlvbjogAM85EABIAAAAbWVtb3J5IGFsbG9jYXRpb24gb2YgIGJ5dGVzIGZhaWxlZAAAIDoQABUAAAA1OhAADQAAAGxpYnJhcnkvc3RkL3NyYy9hbGxvYy5yc1Q6EAAYAAAAYwEAAAkAAABPAAAADAAAAAQAAABTAAAAAAAAAAgAAAAEAAAAVAAAAAAAAAAIAAAABAAAAFUAAABWAAAAVwAAAFgAAABZAAAAEAAAAAQAAABaAAAAWwAAAFwAAABdAAAASGFzaCB0YWJsZSBjYXBhY2l0eSBvdmVyZmxvd9Q6EAAcAAAAL3J1c3QvZGVwcy9oYXNoYnJvd24tMC4xNS4yL3NyYy9yYXcvbW9kLnJzAAD4OhAAKgAAACMAAAAoAAAARXJyb3IAAABeAAAADAAAAAQAAABfAAAAYAAAAGEAAABjYXBhY2l0eSBvdmVyZmxvdwAAAFQ7EAARAAAAbGlicmFyeS9hbGxvYy9zcmMvcmF3X3ZlYy5yc3A7EAAcAAAAKgIAABEAAABsaWJyYXJ5L2FsbG9jL3NyYy9zdHJpbmcucnMAnDsQABsAAADqAQAAFwBB0PfAAAu+HAEAAABiAAAAYSBmb3JtYXR0aW5nIHRyYWl0IGltcGxlbWVudGF0aW9uIHJldHVybmVkIGFuIGVycm9yIHdoZW4gdGhlIHVuZGVybHlpbmcgc3RyZWFtIGRpZCBub3RsaWJyYXJ5L2FsbG9jL3NyYy9mbXQucnMAAC48EAAYAAAAigIAAA4AAACcOxAAGwAAAI0FAAAbAAAAKSBzaG91bGQgYmUgPCBsZW4gKGlzIClpbnNlcnRpb24gaW5kZXggKGlzICkgc2hvdWxkIGJlIDw9IGxlbiAoaXMgAAB/PBAAFAAAAJM8EAAXAAAAfjwQAAEAAAByZW1vdmFsIGluZGV4IChpcyAAAMQ8EAASAAAAaDwQABYAAAB+PBAAAQAAACkwMTIzNDU2Nzg5YWJjZGVmQm9ycm93TXV0RXJyb3JhbHJlYWR5IGJvcnJvd2VkOiAAAAAPPRAAEgAAAFtjYWxsZWQgYE9wdGlvbjo6dW53cmFwKClgIG9uIGEgYE5vbmVgIHZhbHVlaW5kZXggb3V0IG9mIGJvdW5kczogdGhlIGxlbiBpcyAgYnV0IHRoZSBpbmRleCBpcyAAAFg9EAAgAAAAeD0QABIAAAAAAAAABAAAAAQAAABnAAAAPT0hPW1hdGNoZXNhc3NlcnRpb24gYGxlZnQgIHJpZ2h0YCBmYWlsZWQKICBsZWZ0OiAKIHJpZ2h0OiAAtz0QABAAAADHPRAAFwAAAN49EAAJAAAAIHJpZ2h0YCBmYWlsZWQ6IAogIGxlZnQ6IAAAALc9EAAQAAAAAD4QABAAAAAQPhAACQAAAN49EAAJAAAAOiAAAAEAAAAAAAAAPD4QAAIAAAAAAAAADAAAAAQAAABoAAAAaQAAAGoAAAAgICAgIHsgLCAgewosCn0gfSgoCiwKXTB4MDAwMTAyMDMwNDA1MDYwNzA4MDkxMDExMTIxMzE0MTUxNjE3MTgxOTIwMjEyMjIzMjQyNTI2MjcyODI5MzAzMTMyMzMzNDM1MzYzNzM4Mzk0MDQxNDI0MzQ0NDU0NjQ3NDg0OTUwNTE1MjUzNTQ1NTU2NTc1ODU5NjA2MTYyNjM2NDY1NjY2NzY4Njk3MDcxNzI3Mzc0NzU3Njc3Nzg3OTgwODE4MjgzODQ4NTg2ODc4ODg5OTA5MTkyOTM5NDk1OTY5Nzk4OTlsaWJyYXJ5L2NvcmUvc3JjL2ZtdC9tb2QucnNJPxAAGwAAADAJAAAJAAAAAAAA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ZW5kcyBhdCAAZEYQABYAAAB6RhAADQAAAAADAACDBCAAkQVgAF0ToAASFyAfDCBgH+8sICsqMKArb6ZgLAKo4Cwe++AtAP4gNp7/YDb9AeE2AQohNyQN4TerDmE5LxjhOTAc4UrzHuFOQDShUh5h4VPwamFUT2/hVJ28YVUAz2FWZdGhVgDaIVcA4KFYruIhWuzk4VvQ6GFcIADuXPABf10AcAAHAC0BAQECAQIBAUgLMBUQAWUHAgYCAgEEIwEeG1sLOgkJARgEAQkBAwEFKwM7CSoYASA3AQEBBAgEAQMHCgIdAToBAQECBAgBCQEKAhoBAgI5AQQCBAICAwMBHgIDAQsCOQEEBQECBAEUAhYGAQE6AQECAQQIAQcDCgIeATsBAQEMAQkBKAEDATcBAQMFAwEEBwILAh0BOgECAgEBAwMBBAcCCwIcAjkCAQECBAgBCQEKAh0BSAEEAQIDAQEIAVEBAgcMCGIBAgkLB0kCGwEBAQEBNw4BBQECBQsBJAkBZgQBBgECAgIZAgQDEAQNAQICBgEPAQADAAQcAx0CHgJAAgEHCAECCwkBLQMBAXUCIgF2AwQCCQEGA9sCAgE6AQEHAQEBAQIIBgoCATAfMQQwCgQDJgkMAiAEAgY4AQECAwEBBTgIAgKYAwENAQcEAQYBAwLGQAABwyEAA40BYCAABmkCAAQBCiACUAIAAQMBBAEZAgUBlwIaEg0BJggZCwEBLAMwAQIEAgICASQBQwYCAgICDAEIAS8BMwEBAwICBQIBASoCCAHuAQIBBAEAAQAQEBAAAgAB4gGVBQADAQIFBCgDBAGlAgAEQQUAAk8ERgsxBHsBNg8pAQICCgMxBAICBwE9AyQFAQg+AQwCNAkBAQgEAgFfAwIEBgECAZ0BAwgVAjkCAQEBAQwBCQEOBwMFQwECBgEBAgEBAwQDAQEOAlUIAgMBARcBUQECBgEBAgEBAgEC6wECBAYCAQIbAlUIAgEBAmoBAQECCGUBAQECBAEFAAkBAvUBCgQEAZAEAgIEASAKKAYCBAgBCQYCAy4NAQIABwEGAQFSFgIHAQIBAnoGAwEBAgEHAQFIAgMBAQEAAgsCNAUFAxcBAAEGDwAMAwMABTsHAAE/BFEBCwIAAgAuAhcABQMGCAgCBx4ElAMANwQyCAEOARYFAQ8ABwERAgcBAgEFZAGgBwABPQQABP4CAAdtBwBggPAAewlwcm9kdWNlcnMCCGxhbmd1YWdlAQRSdXN0AAxwcm9jZXNzZWQtYnkDBXJ1c3RjHTEuODYuMCAoMDVmOTg0NmY4IDIwMjUtMDMtMzEpBndhbHJ1cwYwLjIwLjMMd2FzbS1iaW5kZ2VuEjAuMi45MiAoMmE0YTQ5MzYyKQBJD3RhcmdldF9mZWF0dXJlcwQrD211dGFibGUtZ2xvYmFscysIc2lnbi1leHQrD3JlZmVyZW5jZS10eXBlcysKbXVsdGl2YWx1ZQ==");

          var loadVt = async () => {
                  await __wbg_init(wasm_code);
                  return exports$1;
              };

  class Clock {
    constructor() {
      let speed = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1.0;
      this.speed = speed;
      this.startTime = performance.now();
    }
    getTime() {
      return this.speed * (performance.now() - this.startTime) / 1000.0;
    }
    setTime(time) {
      this.startTime = performance.now() - time / this.speed * 1000.0;
    }
  }
  class NullClock {
    constructor() {}
    getTime(_speed) {}
    setTime(_time) {}
  }

  // Efficient array transformations without intermediate array objects.
  // Inspired by Elixir's streams and Rust's iterator adapters.

  class Stream {
    constructor(input, xfs) {
      this.input = typeof input.next === "function" ? input : input[Symbol.iterator]();
      this.xfs = xfs ?? [];
    }
    map(f) {
      return this.transform(Map$1(f));
    }
    flatMap(f) {
      return this.transform(FlatMap(f));
    }
    filter(f) {
      return this.transform(Filter(f));
    }
    take(n) {
      return this.transform(Take(n));
    }
    drop(n) {
      return this.transform(Drop(n));
    }
    transform(f) {
      return new Stream(this.input, this.xfs.concat([f]));
    }
    multiplex(other, comparator) {
      return new Stream(new Multiplexer(this[Symbol.iterator](), other[Symbol.iterator](), comparator));
    }
    toArray() {
      return Array.from(this);
    }
    [Symbol.iterator]() {
      let v = 0;
      let values = [];
      let flushed = false;
      const xf = compose(this.xfs, val => values.push(val));
      return {
        next: () => {
          if (v === values.length) {
            values = [];
            v = 0;
          }
          while (values.length === 0) {
            const next = this.input.next();
            if (next.done) {
              break;
            } else {
              xf.step(next.value);
            }
          }
          if (values.length === 0 && !flushed) {
            xf.flush();
            flushed = true;
          }
          if (values.length > 0) {
            return {
              done: false,
              value: values[v++]
            };
          } else {
            return {
              done: true
            };
          }
        }
      };
    }
  }
  function Map$1(f) {
    return emit => {
      return input => {
        emit(f(input));
      };
    };
  }
  function FlatMap(f) {
    return emit => {
      return input => {
        f(input).forEach(emit);
      };
    };
  }
  function Filter(f) {
    return emit => {
      return input => {
        if (f(input)) {
          emit(input);
        }
      };
    };
  }
  function Take(n) {
    let c = 0;
    return emit => {
      return input => {
        if (c < n) {
          emit(input);
        }
        c += 1;
      };
    };
  }
  function Drop(n) {
    let c = 0;
    return emit => {
      return input => {
        c += 1;
        if (c > n) {
          emit(input);
        }
      };
    };
  }
  function compose(xfs, push) {
    return xfs.reverse().reduce((next, curr) => {
      const xf = toXf(curr(next.step));
      return {
        step: xf.step,
        flush: () => {
          xf.flush();
          next.flush();
        }
      };
    }, toXf(push));
  }
  function toXf(xf) {
    if (typeof xf === "function") {
      return {
        step: xf,
        flush: () => {}
      };
    } else {
      return xf;
    }
  }
  class Multiplexer {
    constructor(left, right, comparator) {
      this.left = left;
      this.right = right;
      this.comparator = comparator;
    }
    [Symbol.iterator]() {
      let leftItem;
      let rightItem;
      return {
        next: () => {
          if (leftItem === undefined && this.left !== undefined) {
            const result = this.left.next();
            if (result.done) {
              this.left = undefined;
            } else {
              leftItem = result.value;
            }
          }
          if (rightItem === undefined && this.right !== undefined) {
            const result = this.right.next();
            if (result.done) {
              this.right = undefined;
            } else {
              rightItem = result.value;
            }
          }
          if (leftItem === undefined && rightItem === undefined) {
            return {
              done: true
            };
          } else if (leftItem === undefined) {
            const value = rightItem;
            rightItem = undefined;
            return {
              done: false,
              value: value
            };
          } else if (rightItem === undefined) {
            const value = leftItem;
            leftItem = undefined;
            return {
              done: false,
              value: value
            };
          } else if (this.comparator(leftItem, rightItem)) {
            const value = leftItem;
            leftItem = undefined;
            return {
              done: false,
              value: value
            };
          } else {
            const value = rightItem;
            rightItem = undefined;
            return {
              done: false,
              value: value
            };
          }
        }
      };
    }
  }

  async function parse$2(data) {
    let header;
    let events;
    if (data instanceof Response) {
      const text = await data.text();
      const result = parseJsonl(text);
      if (result !== undefined) {
        header = result.header;
        events = result.events;
      } else {
        header = JSON.parse(text);
      }
    } else if (typeof data === "object" && typeof data.version === "number") {
      header = data;
    } else if (Array.isArray(data)) {
      header = data[0];
      events = data.slice(1, data.length);
    } else {
      throw "invalid data";
    }
    if (header.version === 1) {
      return parseAsciicastV1(header);
    } else if (header.version === 2) {
      return parseAsciicastV2(header, events);
    } else {
      throw `asciicast v${header.version} format not supported`;
    }
  }
  function parseJsonl(jsonl) {
    const lines = jsonl.split("\n");
    let header;
    try {
      header = JSON.parse(lines[0]);
    } catch (_error) {
      return;
    }
    const events = new Stream(lines).drop(1).filter(l => l[0] === "[").map(JSON.parse).toArray();
    return {
      header,
      events
    };
  }
  function parseAsciicastV1(data) {
    let time = 0;
    const events = new Stream(data.stdout).map(e => {
      time += e[0];
      return [time, "o", e[1]];
    });
    return {
      cols: data.width,
      rows: data.height,
      events
    };
  }
  function parseAsciicastV2(header, events) {
    return {
      cols: header.width,
      rows: header.height,
      theme: parseTheme$1(header.theme),
      events,
      idleTimeLimit: header.idle_time_limit
    };
  }
  function parseTheme$1(theme) {
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    const paletteRegex = /^(#[0-9A-Fa-f]{6}:){7,}#[0-9A-Fa-f]{6}$/;
    const fg = theme?.fg;
    const bg = theme?.bg;
    const palette = theme?.palette;
    if (colorRegex.test(fg) && colorRegex.test(bg) && paletteRegex.test(palette)) {
      return {
        foreground: fg,
        background: bg,
        palette: palette.split(":")
      };
    }
  }
  function unparseAsciicastV2(recording) {
    const header = JSON.stringify({
      version: 2,
      width: recording.cols,
      height: recording.rows
    });
    const events = recording.events.map(JSON.stringify).join("\n");
    return `${header}\n${events}\n`;
  }

  function recording(src, _ref, _ref2) {
    let {
      feed,
      resize,
      onInput,
      onMarker,
      now,
      setTimeout,
      setState,
      logger
    } = _ref;
    let {
      idleTimeLimit,
      startAt,
      loop,
      posterTime,
      markers: markers_,
      pauseOnMarkers,
      cols: initialCols,
      rows: initialRows
    } = _ref2;
    let cols;
    let rows;
    let events;
    let markers;
    let duration;
    let effectiveStartAt;
    let eventTimeoutId;
    let nextEventIndex = 0;
    let lastEventTime = 0;
    let startTime;
    let pauseElapsedTime;
    let playCount = 0;
    async function init() {
      const {
        parser,
        minFrameTime,
        inputOffset,
        dumpFilename,
        encoding = "utf-8"
      } = src;
      const recording = prepare(await parser(await doFetch(src), {
        encoding
      }), logger, {
        idleTimeLimit,
        startAt,
        minFrameTime,
        inputOffset,
        markers_
      });
      ({
        cols,
        rows,
        events,
        duration,
        effectiveStartAt
      } = recording);
      initialCols = initialCols ?? cols;
      initialRows = initialRows ?? rows;
      if (events.length === 0) {
        throw "recording is missing events";
      }
      if (dumpFilename !== undefined) {
        dump(recording, dumpFilename);
      }
      const poster = posterTime !== undefined ? getPoster(posterTime) : undefined;

      // Process markers to handle JSON content
      markers = events.filter(e => e[1] === "m").map(e => {
        // If the marker has a label that looks like JSON, keep it as is
        if (typeof e[2] === 'string' && e[2].startsWith('{')) {
          return [e[0], e[2]];
        } else {
          // Otherwise, use the label property
          return [e[0], e[2].label || ""];
        }
      });
      return {
        cols,
        rows,
        duration,
        theme: recording.theme,
        poster,
        markers
      };
    }
    function doFetch(_ref3) {
      let {
        url,
        data,
        fetchOpts = {}
      } = _ref3;
      if (typeof url === "string") {
        return doFetchOne(url, fetchOpts);
      } else if (Array.isArray(url)) {
        return Promise.all(url.map(url => doFetchOne(url, fetchOpts)));
      } else if (data !== undefined) {
        if (typeof data === "function") {
          data = data();
        }
        if (!(data instanceof Promise)) {
          data = Promise.resolve(data);
        }
        return data.then(value => {
          if (typeof value === "string" || value instanceof ArrayBuffer) {
            return new Response(value);
          } else {
            return value;
          }
        });
      } else {
        throw "failed fetching recording file: url/data missing in src";
      }
    }
    async function doFetchOne(url, fetchOpts) {
      const response = await fetch(url, fetchOpts);
      if (!response.ok) {
        throw `failed fetching recording from ${url}: ${response.status} ${response.statusText}`;
      }
      return response;
    }
    function delay(targetTime) {
      let delay = targetTime * 1000 - (now() - startTime);
      if (delay < 0) {
        delay = 0;
      }
      return delay;
    }
    function scheduleNextEvent() {
      const nextEvent = events[nextEventIndex];
      if (nextEvent) {
        eventTimeoutId = setTimeout(runNextEvent, delay(nextEvent[0]));
      } else {
        onEnd();
      }
    }
    function runNextEvent() {
      let event = events[nextEventIndex];
      let elapsedWallTime;
      do {
        lastEventTime = event[0];
        nextEventIndex++;
        const stop = executeEvent(event);
        if (stop) {
          return;
        }
        event = events[nextEventIndex];
        elapsedWallTime = now() - startTime;
      } while (event && elapsedWallTime > event[0] * 1000);
      scheduleNextEvent();
    }
    function cancelNextEvent() {
      clearTimeout(eventTimeoutId);
      eventTimeoutId = null;
    }
    function executeEvent(event) {
      const [time, type, data] = event;
      if (type === "o") {
        feed(data);
      } else if (type === "i") {
        onInput(data);
      } else if (type === "r") {
        const [cols, rows] = data.split("x");
        resize(cols, rows);
      } else if (type === "m") {
        onMarker(data);
        if (pauseOnMarkers) {
          pause();
          pauseElapsedTime = time * 1000;
          setState("idle", {
            reason: "paused"
          });
          return true;
        }
      }
      return false;
    }
    function onEnd() {
      cancelNextEvent();
      playCount++;
      if (loop === true || typeof loop === "number" && playCount < loop) {
        nextEventIndex = 0;
        startTime = now();
        feed("\x1bc"); // reset terminal
        resizeTerminalToInitialSize();
        scheduleNextEvent();
      } else {
        pauseElapsedTime = duration * 1000;
        setState("ended");
      }
    }
    function play() {
      if (eventTimeoutId) throw "already playing";
      if (events[nextEventIndex] === undefined) throw "already ended";
      if (effectiveStartAt !== null) {
        seek(effectiveStartAt);
      }
      resume();
      return true;
    }
    function pause() {
      if (!eventTimeoutId) return true;
      cancelNextEvent();
      pauseElapsedTime = now() - startTime;
      return true;
    }
    function resume() {
      startTime = now() - pauseElapsedTime;
      pauseElapsedTime = null;
      scheduleNextEvent();
    }
    function seek(where) {
      const isPlaying = !!eventTimeoutId;
      pause();
      const currentTime = (pauseElapsedTime ?? 0) / 1000;
      if (typeof where === "string") {
        if (where === "<<") {
          where = currentTime - 5;
        } else if (where === ">>") {
          where = currentTime + 5;
        } else if (where === "<<<") {
          where = currentTime - 0.1 * duration;
        } else if (where === ">>>") {
          where = currentTime + 0.1 * duration;
        } else if (where[where.length - 1] === "%") {
          where = parseFloat(where.substring(0, where.length - 1)) / 100 * duration;
        }
      } else if (typeof where === "object") {
        if (where.marker === "prev") {
          where = findMarkerTimeBefore(currentTime) ?? 0;
          if (isPlaying && currentTime - where < 1) {
            where = findMarkerTimeBefore(where) ?? 0;
          }
        } else if (where.marker === "next") {
          where = findMarkerTimeAfter(currentTime) ?? duration;
        } else if (typeof where.marker === "number") {
          const marker = markers[where.marker];
          if (marker === undefined) {
            throw `invalid marker index: ${where.marker}`;
          } else {
            where = marker[0];
          }
        }
      }
      const targetTime = Math.min(Math.max(where, 0), duration);
      if (targetTime < lastEventTime) {
        feed("\x1bc"); // reset terminal
        resizeTerminalToInitialSize();
        nextEventIndex = 0;
        lastEventTime = 0;
      }
      let event = events[nextEventIndex];
      while (event && event[0] <= targetTime) {
        if (event[1] === "o") {
          executeEvent(event);
        }
        lastEventTime = event[0];
        event = events[++nextEventIndex];
      }
      pauseElapsedTime = targetTime * 1000;
      effectiveStartAt = null;
      if (isPlaying) {
        resume();
      }
      return true;
    }
    function findMarkerTimeBefore(time) {
      if (markers.length == 0) return;
      let i = 0;
      let marker = markers[i];
      let lastMarkerTimeBefore;
      while (marker && marker[0] < time) {
        lastMarkerTimeBefore = marker[0];
        marker = markers[++i];
      }
      return lastMarkerTimeBefore;
    }
    function findMarkerTimeAfter(time) {
      if (markers.length == 0) return;
      let i = markers.length - 1;
      let marker = markers[i];
      let firstMarkerTimeAfter;
      while (marker && marker[0] > time) {
        firstMarkerTimeAfter = marker[0];
        marker = markers[--i];
      }
      return firstMarkerTimeAfter;
    }
    function step(n) {
      if (n === undefined) {
        n = 1;
      }
      let nextEvent;
      let targetIndex;
      if (n > 0) {
        let index = nextEventIndex;
        nextEvent = events[index];
        for (let i = 0; i < n; i++) {
          while (nextEvent !== undefined && nextEvent[1] !== "o") {
            nextEvent = events[++index];
          }
          if (nextEvent !== undefined && nextEvent[1] === "o") {
            targetIndex = index;
          }
        }
      } else {
        let index = Math.max(nextEventIndex - 2, 0);
        nextEvent = events[index];
        for (let i = n; i < 0; i++) {
          while (nextEvent !== undefined && nextEvent[1] !== "o") {
            nextEvent = events[--index];
          }
          if (nextEvent !== undefined && nextEvent[1] === "o") {
            targetIndex = index;
          }
        }
        if (targetIndex !== undefined) {
          feed("\x1bc"); // reset terminal
          resizeTerminalToInitialSize();
          nextEventIndex = 0;
        }
      }
      if (targetIndex === undefined) return;
      while (nextEventIndex <= targetIndex) {
        nextEvent = events[nextEventIndex++];
        if (nextEvent[1] === "o") {
          executeEvent(nextEvent);
        }
      }
      lastEventTime = nextEvent[0];
      pauseElapsedTime = lastEventTime * 1000;
      effectiveStartAt = null;
      if (events[targetIndex + 1] === undefined) {
        onEnd();
      }
    }
    function restart() {
      if (eventTimeoutId) throw "still playing";
      if (events[nextEventIndex] !== undefined) throw "not ended";
      seek(0);
      resume();
      return true;
    }
    function getPoster(time) {
      return events.filter(e => e[0] < time && e[1] === "o").map(e => e[2]);
    }
    function getCurrentTime() {
      if (eventTimeoutId) {
        return (now() - startTime) / 1000;
      } else {
        return (pauseElapsedTime ?? 0) / 1000;
      }
    }
    function resizeTerminalToInitialSize() {
      resize(initialCols, initialRows);
    }
    return {
      init,
      play,
      pause,
      seek,
      step,
      restart,
      stop: pause,
      getCurrentTime
    };
  }
  function batcher(logger) {
    let minFrameTime = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1.0 / 60;
    let prevEvent;
    return emit => {
      let ic = 0;
      let oc = 0;
      return {
        step: event => {
          ic++;
          if (prevEvent === undefined) {
            prevEvent = event;
            return;
          }
          if (event[1] === "o" && prevEvent[1] === "o" && event[0] - prevEvent[0] < minFrameTime) {
            prevEvent[2] += event[2];
          } else {
            emit(prevEvent);
            prevEvent = event;
            oc++;
          }
        },
        flush: () => {
          if (prevEvent !== undefined) {
            emit(prevEvent);
            oc++;
          }
          logger.debug(`batched ${ic} frames to ${oc} frames`);
        }
      };
    };
  }
  function prepare(recording, logger, _ref4) {
    let {
      startAt = 0,
      idleTimeLimit,
      minFrameTime,
      inputOffset,
      markers_
    } = _ref4;
    let {
      events
    } = recording;
    if (!(events instanceof Stream)) {
      events = new Stream(events);
    }
    idleTimeLimit = idleTimeLimit ?? recording.idleTimeLimit ?? Infinity;
    const limiterOutput = {
      offset: 0
    };
    events = events.transform(batcher(logger, minFrameTime)).map(timeLimiter(idleTimeLimit, startAt, limiterOutput)).map(markerWrapper());
    if (markers_ !== undefined) {
      markers_ = new Stream(markers_).map(normalizeMarker);
      events = events.filter(e => e[1] !== "m").multiplex(markers_, (a, b) => a[0] < b[0]).map(markerWrapper());
    }
    events = events.toArray();
    if (inputOffset !== undefined) {
      events = events.map(e => e[1] === "i" ? [e[0] + inputOffset, e[1], e[2]] : e);
      events.sort((a, b) => a[0] - b[0]);
    }
    const duration = events[events.length - 1][0];
    const effectiveStartAt = startAt - limiterOutput.offset;
    return {
      ...recording,
      events,
      duration,
      effectiveStartAt
    };
  }
  function normalizeMarker(m) {
    return typeof m === "number" ? [m, "m", ""] : [m[0], "m", m[1]];
  }
  function timeLimiter(idleTimeLimit, startAt, output) {
    let prevT = 0;
    let shift = 0;
    return function (e) {
      const delay = e[0] - prevT;
      const delta = delay - idleTimeLimit;
      prevT = e[0];
      if (delta > 0) {
        shift += delta;
        if (e[0] < startAt) {
          output.offset += delta;
        }
      }
      return [e[0] - shift, e[1], e[2]];
    };
  }
  function markerWrapper() {
    let i = 0;
    return function (e) {
      if (e[1] === "m") {
        // If the marker has a label that looks like JSON, keep it as is
        if (typeof e[2] === 'string' && e[2].startsWith('{')) {
          return [e[0], e[1], e[2]];
        } else {
          return [e[0], e[1], {
            index: i++,
            time: e[0],
            label: e[2]
          }];
        }
      } else {
        return e;
      }
    };
  }
  function dump(recording, filename) {
    const link = document.createElement("a");
    const events = recording.events.map(e => e[1] === "m" ? [e[0], e[1], e[2].label] : e);
    const asciicast = unparseAsciicastV2({
      ...recording,
      events
    });
    link.href = URL.createObjectURL(new Blob([asciicast], {
      type: "text/plain"
    }));
    link.download = filename;
    link.click();
  }

  function clock(_ref, _ref2, _ref3) {
    let {
      hourColor = 3,
      minuteColor = 4,
      separatorColor = 9
    } = _ref;
    let {
      feed
    } = _ref2;
    let {
      cols = 5,
      rows = 1
    } = _ref3;
    const middleRow = Math.floor(rows / 2);
    const leftPad = Math.floor(cols / 2) - 2;
    const setupCursor = `\x1b[?25l\x1b[1m\x1b[${middleRow}B`;
    let intervalId;
    const getCurrentTime = () => {
      const d = new Date();
      const h = d.getHours();
      const m = d.getMinutes();
      const seqs = [];
      seqs.push("\r");
      for (let i = 0; i < leftPad; i++) {
        seqs.push(" ");
      }
      seqs.push(`\x1b[3${hourColor}m`);
      if (h < 10) {
        seqs.push("0");
      }
      seqs.push(`${h}`);
      seqs.push(`\x1b[3${separatorColor};5m:\x1b[25m`);
      seqs.push(`\x1b[3${minuteColor}m`);
      if (m < 10) {
        seqs.push("0");
      }
      seqs.push(`${m}`);
      return seqs;
    };
    const updateTime = () => {
      getCurrentTime().forEach(feed);
    };
    return {
      init: () => {
        const duration = 24 * 60;
        const poster = [setupCursor].concat(getCurrentTime());
        return {
          cols,
          rows,
          duration,
          poster
        };
      },
      play: () => {
        feed(setupCursor);
        updateTime();
        intervalId = setInterval(updateTime, 1000);
        return true;
      },
      stop: () => {
        clearInterval(intervalId);
      },
      getCurrentTime: () => {
        const d = new Date();
        return d.getHours() * 60 + d.getMinutes();
      }
    };
  }

  function random(src, _ref) {
    let {
      feed,
      setTimeout
    } = _ref;
    const base = " ".charCodeAt(0);
    const range = "~".charCodeAt(0) - base;
    let timeoutId;
    const schedule = () => {
      const t = Math.pow(5, Math.random() * 4);
      timeoutId = setTimeout(print, t);
    };
    const print = () => {
      schedule();
      const char = String.fromCharCode(base + Math.floor(Math.random() * range));
      feed(char);
    };
    return () => {
      schedule();
      return () => clearInterval(timeoutId);
    };
  }

  function benchmark(_ref, _ref2) {
    let {
      url,
      iterations = 10
    } = _ref;
    let {
      feed,
      setState,
      now
    } = _ref2;
    let data;
    let byteCount = 0;
    return {
      async init() {
        const recording = await parse$2(await fetch(url));
        const {
          cols,
          rows,
          events
        } = recording;
        data = Array.from(events).filter(_ref3 => {
          let [_time, type, _text] = _ref3;
          return type === "o";
        }).map(_ref4 => {
          let [time, _type, text] = _ref4;
          return [time, text];
        });
        const duration = data[data.length - 1][0];
        for (const [_, text] of data) {
          byteCount += new Blob([text]).size;
        }
        return {
          cols,
          rows,
          duration
        };
      },
      play() {
        const startTime = now();
        for (let i = 0; i < iterations; i++) {
          for (const [_, text] of data) {
            feed(text);
          }
          feed("\x1bc"); // reset terminal
        }

        const endTime = now();
        const duration = (endTime - startTime) / 1000;
        const throughput = byteCount * iterations / duration;
        const throughputMbs = byteCount / (1024 * 1024) * iterations / duration;
        console.info("benchmark: result", {
          byteCount,
          iterations,
          duration,
          throughput,
          throughputMbs
        });
        setTimeout(() => {
          setState("stopped", {
            reason: "ended"
          });
        }, 0);
        return true;
      }
    };
  }

  class Queue {
    constructor() {
      this.items = [];
      this.onPush = undefined;
    }
    push(item) {
      this.items.push(item);
      if (this.onPush !== undefined) {
        this.onPush(this.popAll());
        this.onPush = undefined;
      }
    }
    popAll() {
      if (this.items.length > 0) {
        const items = this.items;
        this.items = [];
        return items;
      } else {
        const thiz = this;
        return new Promise(resolve => {
          thiz.onPush = resolve;
        });
      }
    }
  }

  function getBuffer(bufferTime, feed, resize, setTime, baseStreamTime, minFrameTime, logger) {
    const execute = executeEvent(feed, resize);
    if (bufferTime === 0) {
      logger.debug("using no buffer");
      return nullBuffer(execute);
    } else {
      bufferTime = bufferTime ?? {};
      let getBufferTime;
      if (typeof bufferTime === "number") {
        logger.debug(`using fixed time buffer (${bufferTime} ms)`);
        getBufferTime = _latency => bufferTime;
      } else if (typeof bufferTime === "function") {
        logger.debug("using custom dynamic buffer");
        getBufferTime = bufferTime({
          logger
        });
      } else {
        logger.debug("using adaptive buffer", bufferTime);
        getBufferTime = adaptiveBufferTimeProvider({
          logger
        }, bufferTime);
      }
      return buffer(getBufferTime, execute, setTime, logger, baseStreamTime ?? 0.0, minFrameTime);
    }
  }
  function nullBuffer(execute) {
    return {
      pushEvent(event) {
        execute(event[1], event[2]);
      },
      pushText(text) {
        execute("o", text);
      },
      stop() {}
    };
  }
  function executeEvent(feed, resize) {
    return function (code, data) {
      if (code === "o") {
        feed(data);
      } else if (code === "r") {
        resize(data.cols, data.rows);
      }
    };
  }
  function buffer(getBufferTime, execute, setTime, logger, baseStreamTime) {
    let minFrameTime = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 1.0 / 60;
    let epoch = performance.now() - baseStreamTime * 1000;
    let bufferTime = getBufferTime(0);
    const queue = new Queue();
    minFrameTime *= 1000;
    let prevElapsedStreamTime = -minFrameTime;
    let stop = false;
    function elapsedWallTime() {
      return performance.now() - epoch;
    }
    setTimeout(async () => {
      while (!stop) {
        const events = await queue.popAll();
        if (stop) return;
        for (const event of events) {
          const elapsedStreamTime = event[0] * 1000 + bufferTime;
          if (elapsedStreamTime - prevElapsedStreamTime < minFrameTime) {
            execute(event[1], event[2]);
            continue;
          }
          const delay = elapsedStreamTime - elapsedWallTime();
          if (delay > 0) {
            await sleep(delay);
            if (stop) return;
          }
          setTime(event[0]);
          execute(event[1], event[2]);
          prevElapsedStreamTime = elapsedStreamTime;
        }
      }
    }, 0);
    return {
      pushEvent(event) {
        let latency = elapsedWallTime() - event[0] * 1000;
        if (latency < 0) {
          logger.debug(`correcting epoch by ${latency} ms`);
          epoch += latency;
          latency = 0;
        }
        bufferTime = getBufferTime(latency);
        queue.push(event);
      },
      pushText(text) {
        queue.push([elapsedWallTime() / 1000, "o", text]);
      },
      stop() {
        stop = true;
        queue.push(undefined);
      }
    };
  }
  function sleep(t) {
    return new Promise(resolve => {
      setTimeout(resolve, t);
    });
  }
  function adaptiveBufferTimeProvider(_ref, _ref2) {
    let {
      logger
    } = _ref;
    let {
      minTime = 25,
      maxLevel = 100,
      interval = 50,
      windowSize = 20,
      smoothingFactor = 0.2,
      minImprovementDuration = 1000
    } = _ref2;
    let bufferLevel = 0;
    let bufferTime = calcBufferTime(bufferLevel);
    let latencies = [];
    let maxJitter = 0;
    let jitterRange = 0;
    let improvementTs = null;
    function calcBufferTime(level) {
      if (level === 0) {
        return minTime;
      } else {
        return interval * level;
      }
    }
    return latency => {
      latencies.push(latency);
      if (latencies.length < windowSize) {
        return bufferTime;
      }
      latencies = latencies.slice(-windowSize);
      const currentMinJitter = min(latencies);
      const currentMaxJitter = max(latencies);
      const currentJitterRange = currentMaxJitter - currentMinJitter;
      maxJitter = currentMaxJitter * smoothingFactor + maxJitter * (1 - smoothingFactor);
      jitterRange = currentJitterRange * smoothingFactor + jitterRange * (1 - smoothingFactor);
      const minBufferTime = maxJitter + jitterRange;
      if (latency > bufferTime) {
        logger.debug('buffer underrun', {
          latency,
          maxJitter,
          jitterRange,
          bufferTime
        });
      }
      if (bufferLevel < maxLevel && minBufferTime > bufferTime) {
        bufferTime = calcBufferTime(bufferLevel += 1);
        logger.debug(`jitter increased, raising bufferTime`, {
          latency,
          maxJitter,
          jitterRange,
          bufferTime
        });
      } else if (bufferLevel > 1 && minBufferTime < calcBufferTime(bufferLevel - 2) || bufferLevel == 1 && minBufferTime < calcBufferTime(bufferLevel - 1)) {
        if (improvementTs === null) {
          improvementTs = performance.now();
        } else if (performance.now() - improvementTs > minImprovementDuration) {
          improvementTs = performance.now();
          bufferTime = calcBufferTime(bufferLevel -= 1);
          logger.debug(`jitter decreased, lowering bufferTime`, {
            latency,
            maxJitter,
            jitterRange,
            bufferTime
          });
        }
        return bufferTime;
      }
      improvementTs = null;
      return bufferTime;
    };
  }
  function min(numbers) {
    return numbers.reduce((prev, cur) => cur < prev ? cur : prev);
  }
  function max(numbers) {
    return numbers.reduce((prev, cur) => cur > prev ? cur : prev);
  }

  const ONE_SEC_IN_USEC = 1000000;
  function alisHandler(logger) {
    const outputDecoder = new TextDecoder();
    const inputDecoder = new TextDecoder();
    let handler = parseMagicString;
    let lastEventTime;
    function parseMagicString(buffer) {
      const text = new TextDecoder().decode(buffer);
      if (text === "ALiS\x01") {
        handler = parseFirstFrame;
      } else {
        throw "not an ALiS v1 live stream";
      }
    }
    function parseFirstFrame(buffer) {
      const view = new BinaryReader(new DataView(buffer));
      const type = view.getUint8();
      if (type !== 0x01) throw `expected reset (0x01) frame, got ${type}`;
      return parseResetFrame(view, buffer);
    }
    function parseResetFrame(view, buffer) {
      view.decodeVarUint();
      let time = view.decodeVarUint();
      lastEventTime = time;
      time = time / ONE_SEC_IN_USEC;
      const cols = view.decodeVarUint();
      const rows = view.decodeVarUint();
      const themeFormat = view.getUint8();
      let theme;
      if (themeFormat === 8) {
        const len = (2 + 8) * 3;
        theme = parseTheme(new Uint8Array(buffer, view.offset, len));
        view.forward(len);
      } else if (themeFormat === 16) {
        const len = (2 + 16) * 3;
        theme = parseTheme(new Uint8Array(buffer, view.offset, len));
        view.forward(len);
      } else if (themeFormat !== 0) {
        throw `alis: invalid theme format (${themeFormat})`;
      }
      const initLen = view.decodeVarUint();
      let init;
      if (initLen > 0) {
        init = outputDecoder.decode(new Uint8Array(buffer, view.offset, initLen));
      }
      handler = parseFrame;
      return {
        time,
        term: {
          size: {
            cols,
            rows
          },
          theme,
          init
        }
      };
    }
    function parseFrame(buffer) {
      const view = new BinaryReader(new DataView(buffer));
      const type = view.getUint8();
      if (type === 0x01) {
        return parseResetFrame(view, buffer);
      } else if (type === 0x6f) {
        return parseOutputFrame(view, buffer);
      } else if (type === 0x69) {
        return parseInputFrame(view, buffer);
      } else if (type === 0x72) {
        return parseResizeFrame(view);
      } else if (type === 0x6d) {
        return parseMarkerFrame(view, buffer);
      } else if (type === 0x04) {
        // EOT
        handler = parseFirstFrame;
        return false;
      } else {
        logger.debug(`alis: unknown frame type: ${type}`);
      }
    }
    function parseOutputFrame(view, buffer) {
      view.decodeVarUint();
      const relTime = view.decodeVarUint();
      lastEventTime += relTime;
      const len = view.decodeVarUint();
      const text = outputDecoder.decode(new Uint8Array(buffer, view.offset, len));
      return [lastEventTime / ONE_SEC_IN_USEC, "o", text];
    }
    function parseInputFrame(view, buffer) {
      view.decodeVarUint();
      const relTime = view.decodeVarUint();
      lastEventTime += relTime;
      const len = view.decodeVarUint();
      const text = inputDecoder.decode(new Uint8Array(buffer, view.offset, len));
      return [lastEventTime / ONE_SEC_IN_USEC, "i", text];
    }
    function parseResizeFrame(view) {
      view.decodeVarUint();
      const relTime = view.decodeVarUint();
      lastEventTime += relTime;
      const cols = view.decodeVarUint();
      const rows = view.decodeVarUint();
      return [lastEventTime / ONE_SEC_IN_USEC, "r", {
        cols,
        rows
      }];
    }
    function parseMarkerFrame(view, buffer) {
      view.decodeVarUint();
      const relTime = view.decodeVarUint();
      lastEventTime += relTime;
      const len = view.decodeVarUint();
      const decoder = new TextDecoder();
      const text = decoder.decode(new Uint8Array(buffer, view.offset, len));
      return [lastEventTime / ONE_SEC_IN_USEC, "m", text];
    }
    return function (buffer) {
      return handler(buffer);
    };
  }
  function parseTheme(arr) {
    const colorCount = arr.length / 3;
    const foreground = hexColor(arr[0], arr[1], arr[2]);
    const background = hexColor(arr[3], arr[4], arr[5]);
    const palette = [];
    for (let i = 2; i < colorCount; i++) {
      palette.push(hexColor(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]));
    }
    return {
      foreground,
      background,
      palette
    };
  }
  function hexColor(r, g, b) {
    return `#${byteToHex(r)}${byteToHex(g)}${byteToHex(b)}`;
  }
  function byteToHex(value) {
    return value.toString(16).padStart(2, "0");
  }
  class BinaryReader {
    constructor(inner) {
      let offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      this.inner = inner;
      this.offset = offset;
    }
    forward(delta) {
      this.offset += delta;
    }
    getUint8() {
      const value = this.inner.getUint8(this.offset);
      this.offset += 1;
      return value;
    }
    decodeVarUint() {
      let number = BigInt(0);
      let shift = BigInt(0);
      let byte = this.getUint8();
      while (byte > 127) {
        byte &= 127;
        number += BigInt(byte) << shift;
        shift += BigInt(7);
        byte = this.getUint8();
      }
      number = number + (BigInt(byte) << shift);
      return Number(number);
    }
  }

  function jsonHandler() {
    let parse = parseHeader;
    function parseHeader(buffer) {
      const header = JSON.parse(buffer);
      if (header.version !== 2) {
        throw "not an asciicast v2 stream";
      }
      parse = parseEvent;
      return {
        time: 0.0,
        term: {
          size: {
            cols: header.width,
            rows: header.height
          }
        }
      };
    }
    function parseEvent(buffer) {
      const event = JSON.parse(buffer);
      if (event[1] === "r") {
        const [cols, rows] = event[2].split("x");
        return [event[0], "r", {
          cols,
          rows
        }];
      } else {
        return event;
      }
    }
    return function (buffer) {
      return parse(buffer);
    };
  }

  function rawHandler() {
    const outputDecoder = new TextDecoder();
    let parse = parseSize;
    function parseSize(buffer) {
      const text = outputDecoder.decode(buffer, {
        stream: true
      });
      const [cols, rows] = sizeFromResizeSeq(text) ?? sizeFromScriptStartMessage(text) ?? [80, 24];
      parse = parseOutput;
      return {
        time: 0.0,
        term: {
          size: {
            cols,
            rows
          },
          init: text
        }
      };
    }
    function parseOutput(buffer) {
      return outputDecoder.decode(buffer, {
        stream: true
      });
    }
    return function (buffer) {
      return parse(buffer);
    };
  }
  function sizeFromResizeSeq(text) {
    const match = text.match(/\x1b\[8;(\d+);(\d+)t/);
    if (match !== null) {
      return [parseInt(match[2], 10), parseInt(match[1], 10)];
    }
  }
  function sizeFromScriptStartMessage(text) {
    const match = text.match(/\[.*COLUMNS="(\d{1,3})" LINES="(\d{1,3})".*\]/);
    if (match !== null) {
      return [parseInt(match[1], 10), parseInt(match[2], 10)];
    }
  }

  function exponentialDelay(attempt) {
    return Math.min(500 * Math.pow(2, attempt), 5000);
  }
  function websocket(_ref, _ref2) {
    let {
      url,
      bufferTime,
      reconnectDelay = exponentialDelay,
      minFrameTime
    } = _ref;
    let {
      feed,
      reset,
      resize,
      setState,
      logger
    } = _ref2;
    logger = new PrefixedLogger(logger, "websocket: ");
    let socket;
    let buf;
    let clock = new NullClock();
    let reconnectAttempt = 0;
    let successfulConnectionTimeout;
    let stop = false;
    let wasOnline = false;
    let initTimeout;
    function connect() {
      socket = new WebSocket(url, ["v1.alis", "v2.asciicast", "raw"]);
      socket.binaryType = "arraybuffer";
      socket.onopen = () => {
        const proto = socket.protocol || "raw";
        logger.info("opened");
        logger.info(`activating ${proto} protocol handler`);
        if (proto === "v1.alis") {
          socket.onmessage = onMessage(alisHandler(logger));
        } else if (proto === "v2.asciicast") {
          socket.onmessage = onMessage(jsonHandler());
        } else if (proto === "raw") {
          socket.onmessage = onMessage(rawHandler());
        }
        successfulConnectionTimeout = setTimeout(() => {
          reconnectAttempt = 0;
        }, 1000);
      };
      socket.onclose = event => {
        clearTimeout(initTimeout);
        stopBuffer();
        if (stop || event.code === 1000 || event.code === 1005) {
          logger.info("closed");
          setState("ended", {
            message: "Stream ended"
          });
        } else if (event.code === 1002) {
          logger.debug(`close reason: ${event.reason}`);
          setState("ended", {
            message: "Err: Player not compatible with the server"
          });
        } else {
          clearTimeout(successfulConnectionTimeout);
          const delay = reconnectDelay(reconnectAttempt++);
          logger.info(`unclean close, reconnecting in ${delay}...`);
          setState("loading");
          setTimeout(connect, delay);
        }
      };
      wasOnline = false;
    }
    function onMessage(handler) {
      initTimeout = setTimeout(onStreamEnd, 5000);
      return function (event) {
        try {
          const result = handler(event.data);
          if (buf) {
            if (Array.isArray(result)) {
              buf.pushEvent(result);
            } else if (typeof result === "string") {
              buf.pushText(result);
            } else if (typeof result === "object" && !Array.isArray(result)) {
              // TODO: check last event ID from the parser, don't reset if we didn't miss anything
              onStreamReset(result);
            } else if (result === false) {
              // EOT
              onStreamEnd();
            } else if (result !== undefined) {
              throw `unexpected value from protocol handler: ${result}`;
            }
          } else {
            if (typeof result === "object" && !Array.isArray(result)) {
              onStreamReset(result);
              clearTimeout(initTimeout);
            } else if (result === undefined) {
              clearTimeout(initTimeout);
              initTimeout = setTimeout(onStreamEnd, 1000);
            } else {
              clearTimeout(initTimeout);
              throw `unexpected value from protocol handler: ${result}`;
            }
          }
        } catch (e) {
          socket.close();
          throw e;
        }
      };
    }
    function onStreamReset(_ref3) {
      let {
        time,
        term
      } = _ref3;
      const {
        size,
        init,
        theme
      } = term;
      const {
        cols,
        rows
      } = size;
      logger.info(`stream reset (${cols}x${rows} @${time})`);
      setState("playing");
      stopBuffer();
      buf = getBuffer(bufferTime, feed, resize, t => clock.setTime(t), time, minFrameTime, logger);
      reset(cols, rows, init, theme);
      clock = new Clock();
      wasOnline = true;
      if (typeof time === "number") {
        clock.setTime(time);
      }
    }
    function onStreamEnd() {
      stopBuffer();
      if (wasOnline) {
        logger.info("stream ended");
        setState("offline", {
          message: "Stream ended"
        });
      } else {
        logger.info("stream offline");
        setState("offline", {
          message: "Stream offline"
        });
      }
      clock = new NullClock();
    }
    function stopBuffer() {
      if (buf) buf.stop();
      buf = null;
    }
    return {
      play: () => {
        connect();
      },
      stop: () => {
        stop = true;
        stopBuffer();
        if (socket !== undefined) socket.close();
      },
      getCurrentTime: () => clock.getTime()
    };
  }

  function eventsource(_ref, _ref2) {
    let {
      url,
      bufferTime,
      minFrameTime
    } = _ref;
    let {
      feed,
      reset,
      setState,
      logger
    } = _ref2;
    logger = new PrefixedLogger(logger, "eventsource: ");
    let es;
    let buf;
    let clock = new NullClock();
    function initBuffer(baseStreamTime) {
      if (buf !== undefined) buf.stop();
      buf = getBuffer(bufferTime, feed, t => clock.setTime(t), baseStreamTime, minFrameTime, logger);
    }
    return {
      play: () => {
        es = new EventSource(url);
        es.addEventListener("open", () => {
          logger.info("opened");
          initBuffer();
        });
        es.addEventListener("error", e => {
          logger.info("errored");
          logger.debug({
            e
          });
          setState("loading");
        });
        es.addEventListener("message", event => {
          const e = JSON.parse(event.data);
          if (Array.isArray(e)) {
            buf.pushEvent(e);
          } else if (e.cols !== undefined || e.width !== undefined) {
            const cols = e.cols ?? e.width;
            const rows = e.rows ?? e.height;
            logger.debug(`vt reset (${cols}x${rows})`);
            setState("playing");
            initBuffer(e.time);
            reset(cols, rows, e.init ?? undefined);
            clock = new Clock();
            if (typeof e.time === "number") {
              clock.setTime(e.time);
            }
          } else if (e.state === "offline") {
            logger.info("stream offline");
            setState("offline", {
              message: "Stream offline"
            });
            clock = new NullClock();
          }
        });
        es.addEventListener("done", () => {
          logger.info("closed");
          es.close();
          setState("ended", {
            message: "Stream ended"
          });
        });
      },
      stop: () => {
        if (buf !== undefined) buf.stop();
        if (es !== undefined) es.close();
      },
      getCurrentTime: () => clock.getTime()
    };
  }

  async function parse$1(responses, _ref) {
    let {
      encoding
    } = _ref;
    const textDecoder = new TextDecoder(encoding);
    let cols;
    let rows;
    let timing = (await responses[0].text()).split("\n").filter(line => line.length > 0).map(line => line.split(" "));
    if (timing[0].length < 3) {
      timing = timing.map(entry => ["O", entry[0], entry[1]]);
    }
    const buffer = await responses[1].arrayBuffer();
    const array = new Uint8Array(buffer);
    const dataOffset = array.findIndex(byte => byte == 0x0a) + 1;
    const header = textDecoder.decode(array.subarray(0, dataOffset));
    const sizeMatch = header.match(/COLUMNS="(\d+)" LINES="(\d+)"/);
    if (sizeMatch !== null) {
      cols = parseInt(sizeMatch[1], 10);
      rows = parseInt(sizeMatch[2], 10);
    }
    const stdout = {
      array,
      cursor: dataOffset
    };
    let stdin = stdout;
    if (responses[2] !== undefined) {
      const buffer = await responses[2].arrayBuffer();
      const array = new Uint8Array(buffer);
      stdin = {
        array,
        cursor: dataOffset
      };
    }
    const events = [];
    let time = 0;
    for (const entry of timing) {
      time += parseFloat(entry[1]);
      if (entry[0] === "O") {
        const count = parseInt(entry[2], 10);
        const bytes = stdout.array.subarray(stdout.cursor, stdout.cursor + count);
        const text = textDecoder.decode(bytes);
        events.push([time, "o", text]);
        stdout.cursor += count;
      } else if (entry[0] === "I") {
        const count = parseInt(entry[2], 10);
        const bytes = stdin.array.subarray(stdin.cursor, stdin.cursor + count);
        const text = textDecoder.decode(bytes);
        events.push([time, "i", text]);
        stdin.cursor += count;
      } else if (entry[0] === "S" && entry[2] === "SIGWINCH") {
        const cols = parseInt(entry[4].slice(5), 10);
        const rows = parseInt(entry[3].slice(5), 10);
        events.push([time, "r", `${cols}x${rows}`]);
      } else if (entry[0] === "H" && entry[2] === "COLUMNS") {
        cols = parseInt(entry[3], 10);
      } else if (entry[0] === "H" && entry[2] === "LINES") {
        rows = parseInt(entry[3], 10);
      }
    }
    cols = cols ?? 80;
    rows = rows ?? 24;
    return {
      cols,
      rows,
      events
    };
  }

  async function parse(response, _ref) {
    let {
      encoding
    } = _ref;
    const textDecoder = new TextDecoder(encoding);
    const buffer = await response.arrayBuffer();
    const array = new Uint8Array(buffer);
    const firstFrame = parseFrame(array);
    const baseTime = firstFrame.time;
    const firstFrameText = textDecoder.decode(firstFrame.data);
    const sizeMatch = firstFrameText.match(/\x1b\[8;(\d+);(\d+)t/);
    const events = [];
    let cols = 80;
    let rows = 24;
    if (sizeMatch !== null) {
      cols = parseInt(sizeMatch[2], 10);
      rows = parseInt(sizeMatch[1], 10);
    }
    let cursor = 0;
    let frame = parseFrame(array);
    while (frame !== undefined) {
      const time = frame.time - baseTime;
      const text = textDecoder.decode(frame.data);
      events.push([time, "o", text]);
      cursor += frame.len;
      frame = parseFrame(array.subarray(cursor));
    }
    return {
      cols,
      rows,
      events
    };
  }
  function parseFrame(array) {
    if (array.length < 13) return;
    const time = parseTimestamp(array.subarray(0, 8));
    const len = parseNumber(array.subarray(8, 12));
    const data = array.subarray(12, 12 + len);
    return {
      time,
      data,
      len: len + 12
    };
  }
  function parseNumber(array) {
    return array[0] + array[1] * 256 + array[2] * 256 * 256 + array[3] * 256 * 256 * 256;
  }
  function parseTimestamp(array) {
    const sec = parseNumber(array.subarray(0, 4));
    const usec = parseNumber(array.subarray(4, 8));
    return sec + usec / 1000000;
  }

  const vt = loadVt(); // trigger async loading of wasm

  class State {
    constructor(core) {
      this.core = core;
      this.driver = core.driver;
    }
    onEnter(data) {}
    init() {}
    play() {}
    pause() {}
    togglePlay() {}
    seek(where) {
      return false;
    }
    step(n) {}
    stop() {
      this.driver.stop();
    }
  }
  class UninitializedState extends State {
    async init() {
      try {
        await this.core._initializeDriver();
        return this.core._setState("idle");
      } catch (e) {
        this.core._setState("errored");
        throw e;
      }
    }
    async play() {
      this.core._dispatchEvent("play");
      const idleState = await this.init();
      await idleState.doPlay();
    }
    async togglePlay() {
      await this.play();
    }
    async seek(where) {
      const idleState = await this.init();
      return await idleState.seek(where);
    }
    async step(n) {
      const idleState = await this.init();
      await idleState.step(n);
    }
    stop() {}
  }
  class Idle extends State {
    onEnter(_ref) {
      let {
        reason,
        message
      } = _ref;
      this.core._dispatchEvent("idle", {
        message
      });
      if (reason === "paused") {
        this.core._dispatchEvent("pause");
      }
    }
    async play() {
      this.core._dispatchEvent("play");
      await this.doPlay();
    }
    async doPlay() {
      const stop = await this.driver.play();
      if (stop === true) {
        this.core._setState("playing");
      } else if (typeof stop === "function") {
        this.core._setState("playing");
        this.driver.stop = stop;
      }
    }
    async togglePlay() {
      await this.play();
    }
    seek(where) {
      return this.driver.seek(where);
    }
    step(n) {
      this.driver.step(n);
    }
  }
  class PlayingState extends State {
    onEnter() {
      this.core._dispatchEvent("playing");
    }
    pause() {
      if (this.driver.pause() === true) {
        this.core._setState("idle", {
          reason: "paused"
        });
      }
    }
    togglePlay() {
      this.pause();
    }
    seek(where) {
      return this.driver.seek(where);
    }
  }
  class LoadingState extends State {
    onEnter() {
      this.core._dispatchEvent("loading");
    }
  }
  class OfflineState extends State {
    onEnter(_ref2) {
      let {
        message
      } = _ref2;
      this.core._dispatchEvent("offline", {
        message
      });
    }
  }
  class EndedState extends State {
    onEnter(_ref3) {
      let {
        message
      } = _ref3;
      this.core._dispatchEvent("ended", {
        message
      });
    }
    async play() {
      this.core._dispatchEvent("play");
      if (await this.driver.restart()) {
        this.core._setState('playing');
      }
    }
    async togglePlay() {
      await this.play();
    }
    seek(where) {
      if (this.driver.seek(where) === true) {
        this.core._setState('idle');
        return true;
      }
      return false;
    }
  }
  class ErroredState extends State {
    onEnter() {
      this.core._dispatchEvent("errored");
    }
  }
  class Core {
    constructor(src, opts) {
      this.logger = opts.logger;
      this.state = new UninitializedState(this);
      this.stateName = "uninitialized";
      this.driver = getDriver(src);
      this.changedLines = new Set();
      this.cursor = undefined;
      this.duration = undefined;
      this.cols = opts.cols;
      this.rows = opts.rows;
      this.speed = opts.speed;
      this.loop = opts.loop;
      this.autoPlay = opts.autoPlay;
      this.idleTimeLimit = opts.idleTimeLimit;
      this.preload = opts.preload;
      this.startAt = parseNpt(opts.startAt);
      this.poster = this._parsePoster(opts.poster);
      this.markers = this._normalizeMarkers(opts.markers);
      this.pauseOnMarkers = opts.pauseOnMarkers;
      this.commandQueue = Promise.resolve();
      this.eventHandlers = new Map([["ended", []], ["errored", []], ["idle", []], ["input", []], ["loading", []], ["marker", []], ["metadata", []], ["offline", []], ["pause", []], ["play", []], ["playing", []], ["ready", []], ["reset", []], ["resize", []], ["seeked", []], ["terminalUpdate", []]]);
    }
    async init() {
      this.wasm = await vt;
      const feed = this._feed.bind(this);
      const onInput = data => {
        this._dispatchEvent("input", {
          data
        });
      };
      const onMarker = _ref4 => {
        let {
          index,
          time,
          label
        } = _ref4;
        this._dispatchEvent("marker", {
          index,
          time,
          label
        });
      };
      const now = this._now.bind(this);
      const reset = this._resetVt.bind(this);
      const resize = this._resizeVt.bind(this);
      const setState = this._setState.bind(this);
      const posterTime = this.poster.type === "npt" ? this.poster.value : undefined;
      this.driver = this.driver({
        feed,
        onInput,
        onMarker,
        reset,
        resize,
        now,
        setTimeout: (f, t) => setTimeout(f, t / this.speed),
        setInterval: (f, t) => setInterval(f, t / this.speed),
        setState,
        logger: this.logger
      }, {
        cols: this.cols,
        rows: this.rows,
        idleTimeLimit: this.idleTimeLimit,
        startAt: this.startAt,
        loop: this.loop,
        posterTime: posterTime,
        markers: this.markers,
        pauseOnMarkers: this.pauseOnMarkers
      });
      if (typeof this.driver === "function") {
        this.driver = {
          play: this.driver
        };
      }
      if (this.preload || posterTime !== undefined) {
        this._withState(state => state.init());
      }
      const poster = this.poster.type === "text" ? this._renderPoster(this.poster.value) : null;
      const config = {
        isPausable: !!this.driver.pause,
        isSeekable: !!this.driver.seek,
        poster
      };
      if (this.driver.init === undefined) {
        this.driver.init = () => {
          return {};
        };
      }
      if (this.driver.pause === undefined) {
        this.driver.pause = () => {};
      }
      if (this.driver.seek === undefined) {
        this.driver.seek = where => false;
      }
      if (this.driver.step === undefined) {
        this.driver.step = n => {};
      }
      if (this.driver.stop === undefined) {
        this.driver.stop = () => {};
      }
      if (this.driver.restart === undefined) {
        this.driver.restart = () => {};
      }
      if (this.driver.getCurrentTime === undefined) {
        const play = this.driver.play;
        let clock = new NullClock();
        this.driver.play = () => {
          clock = new Clock(this.speed);
          return play();
        };
        this.driver.getCurrentTime = () => clock.getTime();
      }
      this._dispatchEvent("ready", config);
      if (this.autoPlay) {
        this.play();
      }
    }
    play() {
      return this._withState(state => state.play());
    }
    pause() {
      return this._withState(state => state.pause());
    }
    togglePlay() {
      return this._withState(state => state.togglePlay());
    }
    seek(where) {
      return this._withState(async state => {
        if (await state.seek(where)) {
          this._dispatchEvent("seeked");
        }
      });
    }
    step(n) {
      return this._withState(state => state.step(n));
    }
    stop() {
      return this._withState(state => state.stop());
    }
    getChanges() {
      const changes = {};
      if (this.changedLines.size > 0) {
        const lines = new Map();
        const rows = this.vt.rows;
        for (const i of this.changedLines) {
          if (i < rows) {
            lines.set(i, {
              id: i,
              segments: this.vt.getLine(i)
            });
          }
        }
        this.changedLines.clear();
        changes.lines = lines;
      }
      if (this.cursor === undefined && this.vt) {
        this.cursor = this.vt.getCursor() ?? false;
        changes.cursor = this.cursor;
      }
      return changes;
    }
    getCurrentTime() {
      return this.driver.getCurrentTime();
    }
    getRemainingTime() {
      if (typeof this.duration === "number") {
        return this.duration - Math.min(this.getCurrentTime(), this.duration);
      }
    }
    getProgress() {
      if (typeof this.duration === "number") {
        return Math.min(this.getCurrentTime(), this.duration) / this.duration;
      }
    }
    getDuration() {
      return this.duration;
    }
    addEventListener(eventName, handler) {
      this.eventHandlers.get(eventName).push(handler);
    }
    _dispatchEvent(eventName) {
      let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      for (const h of this.eventHandlers.get(eventName)) {
        h(data);
      }
    }
    _withState(f) {
      return this._enqueueCommand(() => f(this.state));
    }
    _enqueueCommand(f) {
      this.commandQueue = this.commandQueue.then(f);
      return this.commandQueue;
    }
    _setState(newState) {
      let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      if (this.stateName === newState) return this.state;
      this.stateName = newState;
      if (newState === "playing") {
        this.state = new PlayingState(this);
      } else if (newState === "idle") {
        this.state = new Idle(this);
      } else if (newState === "loading") {
        this.state = new LoadingState(this);
      } else if (newState === "ended") {
        this.state = new EndedState(this);
      } else if (newState === "offline") {
        this.state = new OfflineState(this);
      } else if (newState === "errored") {
        this.state = new ErroredState(this);
      } else {
        throw `invalid state: ${newState}`;
      }
      this.state.onEnter(data);
      return this.state;
    }
    _feed(data) {
      this._doFeed(data);
      this._dispatchEvent("terminalUpdate");
    }
    _doFeed(data) {
      const affectedLines = this.vt.feed(data);
      affectedLines.forEach(i => this.changedLines.add(i));
      this.cursor = undefined;
    }
    _now() {
      return performance.now() * this.speed;
    }
    async _initializeDriver() {
      const meta = await this.driver.init();
      this.cols = this.cols ?? meta.cols ?? 80;
      this.rows = this.rows ?? meta.rows ?? 24;
      this.duration = this.duration ?? meta.duration;
      this.markers = this._normalizeMarkers(meta.markers) ?? this.markers ?? [];
      if (this.cols === 0) {
        this.cols = 80;
      }
      if (this.rows === 0) {
        this.rows = 24;
      }
      this._initializeVt(this.cols, this.rows);
      const poster = meta.poster !== undefined ? this._renderPoster(meta.poster) : null;
      this._dispatchEvent("metadata", {
        cols: this.cols,
        rows: this.rows,
        duration: this.duration,
        markers: this.markers,
        theme: meta.theme,
        poster
      });
    }
    _resetVt(cols, rows) {
      let init = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;
      let theme = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : undefined;
      this.logger.debug(`core: vt reset (${cols}x${rows})`);
      this.cols = cols;
      this.rows = rows;
      this.cursor = undefined;
      this._initializeVt(cols, rows);
      if (init !== undefined && init !== "") {
        this._doFeed(init);
      }
      this._dispatchEvent("reset", {
        cols,
        rows,
        theme
      });
    }
    _resizeVt(cols, rows) {
      if (cols === this.vt.cols && rows === this.vt.rows) return;
      const affectedLines = this.vt.resize(cols, rows);
      affectedLines.forEach(i => this.changedLines.add(i));
      this.cursor = undefined;
      this.vt.cols = cols;
      this.vt.rows = rows;
      this.logger.debug(`core: vt resize (${cols}x${rows})`);
      this._dispatchEvent("resize", {
        cols,
        rows
      });
    }
    _initializeVt(cols, rows) {
      this.vt = this.wasm.create(cols, rows, true, 100);
      this.vt.cols = cols;
      this.vt.rows = rows;
      this.changedLines.clear();
      for (let i = 0; i < rows; i++) {
        this.changedLines.add(i);
      }
    }
    _parsePoster(poster) {
      if (typeof poster !== "string") return {};
      if (poster.substring(0, 16) == "data:text/plain,") {
        return {
          type: "text",
          value: [poster.substring(16)]
        };
      } else if (poster.substring(0, 4) == "npt:") {
        return {
          type: "npt",
          value: parseNpt(poster.substring(4))
        };
      }
      return {};
    }
    _renderPoster(poster) {
      const cols = this.cols ?? 80;
      const rows = this.rows ?? 24;
      this.logger.debug(`core: poster init (${cols}x${rows})`);
      const vt = this.wasm.create(cols, rows, false, 0);
      poster.forEach(text => vt.feed(text));
      const cursor = vt.getCursor() ?? false;
      const lines = [];
      for (let i = 0; i < rows; i++) {
        lines.push({
          id: i,
          segments: vt.getLine(i)
        });
      }
      return {
        cursor,
        lines
      };
    }
    _normalizeMarkers(markers) {
      if (Array.isArray(markers)) {
        return markers.map(m => typeof m === "number" ? [m, ""] : m);
      }
    }
  }
  const DRIVERS = new Map([["benchmark", benchmark], ["clock", clock], ["eventsource", eventsource], ["random", random], ["recording", recording], ["websocket", websocket]]);
  const PARSERS = new Map([["asciicast", parse$2], ["typescript", parse$1], ["ttyrec", parse]]);
  function getDriver(src) {
    if (typeof src === "function") return src;
    if (typeof src === "string") {
      if (src.substring(0, 5) == "ws://" || src.substring(0, 6) == "wss://") {
        src = {
          driver: "websocket",
          url: src
        };
      } else if (src.substring(0, 6) == "clock:") {
        src = {
          driver: "clock"
        };
      } else if (src.substring(0, 7) == "random:") {
        src = {
          driver: "random"
        };
      } else if (src.substring(0, 10) == "benchmark:") {
        src = {
          driver: "benchmark",
          url: src.substring(10)
        };
      } else {
        src = {
          driver: "recording",
          url: src
        };
      }
    }
    if (src.driver === undefined) {
      src.driver = "recording";
    }
    if (src.driver == "recording") {
      if (src.parser === undefined) {
        src.parser = "asciicast";
      }
      if (typeof src.parser === "string") {
        if (PARSERS.has(src.parser)) {
          src.parser = PARSERS.get(src.parser);
        } else {
          throw `unknown parser: ${src.parser}`;
        }
      }
    }
    if (DRIVERS.has(src.driver)) {
      const driver = DRIVERS.get(src.driver);
      return (callbacks, opts) => driver(src, callbacks, opts);
    } else {
      throw `unsupported driver: ${JSON.stringify(src)}`;
    }
  }

  const sharedConfig = {};
  function setHydrateContext(context) {
    sharedConfig.context = context;
  }

  const equalFn = (a, b) => a === b;
  const $PROXY = Symbol("solid-proxy");
  const $TRACK = Symbol("solid-track");
  const signalOptions = {
    equals: equalFn
  };
  let runEffects = runQueue;
  const STALE = 1;
  const PENDING = 2;
  const UNOWNED = {
    owned: null,
    cleanups: null,
    context: null,
    owner: null
  };
  var Owner = null;
  let Transition = null;
  let Listener = null;
  let Updates = null;
  let Effects = null;
  let ExecCount = 0;
  function createRoot(fn, detachedOwner) {
    const listener = Listener,
      owner = Owner,
      unowned = fn.length === 0,
      root = unowned ? UNOWNED : {
        owned: null,
        cleanups: null,
        context: null,
        owner: detachedOwner === undefined ? owner : detachedOwner
      },
      updateFn = unowned ? fn : () => fn(() => untrack(() => cleanNode(root)));
    Owner = root;
    Listener = null;
    try {
      return runUpdates(updateFn, true);
    } finally {
      Listener = listener;
      Owner = owner;
    }
  }
  function createSignal(value, options) {
    options = options ? Object.assign({}, signalOptions, options) : signalOptions;
    const s = {
      value,
      observers: null,
      observerSlots: null,
      comparator: options.equals || undefined
    };
    const setter = value => {
      if (typeof value === "function") {
        value = value(s.value);
      }
      return writeSignal(s, value);
    };
    return [readSignal.bind(s), setter];
  }
  function createRenderEffect(fn, value, options) {
    const c = createComputation(fn, value, false, STALE);
    updateComputation(c);
  }
  function createEffect(fn, value, options) {
    runEffects = runUserEffects;
    const c = createComputation(fn, value, false, STALE);
    c.user = true;
    Effects ? Effects.push(c) : updateComputation(c);
  }
  function createMemo(fn, value, options) {
    options = options ? Object.assign({}, signalOptions, options) : signalOptions;
    const c = createComputation(fn, value, true, 0);
    c.observers = null;
    c.observerSlots = null;
    c.comparator = options.equals || undefined;
    updateComputation(c);
    return readSignal.bind(c);
  }
  function batch(fn) {
    return runUpdates(fn, false);
  }
  function untrack(fn) {
    if (Listener === null) return fn();
    const listener = Listener;
    Listener = null;
    try {
      return fn();
    } finally {
      Listener = listener;
    }
  }
  function onMount(fn) {
    createEffect(() => untrack(fn));
  }
  function onCleanup(fn) {
    if (Owner === null) ;else if (Owner.cleanups === null) Owner.cleanups = [fn];else Owner.cleanups.push(fn);
    return fn;
  }
  function getListener() {
    return Listener;
  }
  function children(fn) {
    const children = createMemo(fn);
    const memo = createMemo(() => resolveChildren(children()));
    memo.toArray = () => {
      const c = memo();
      return Array.isArray(c) ? c : c != null ? [c] : [];
    };
    return memo;
  }
  function readSignal() {
    const runningTransition = Transition ;
    if (this.sources && (this.state || runningTransition )) {
      if (this.state === STALE || runningTransition ) updateComputation(this);else {
        const updates = Updates;
        Updates = null;
        runUpdates(() => lookUpstream(this), false);
        Updates = updates;
      }
    }
    if (Listener) {
      const sSlot = this.observers ? this.observers.length : 0;
      if (!Listener.sources) {
        Listener.sources = [this];
        Listener.sourceSlots = [sSlot];
      } else {
        Listener.sources.push(this);
        Listener.sourceSlots.push(sSlot);
      }
      if (!this.observers) {
        this.observers = [Listener];
        this.observerSlots = [Listener.sources.length - 1];
      } else {
        this.observers.push(Listener);
        this.observerSlots.push(Listener.sources.length - 1);
      }
    }
    return this.value;
  }
  function writeSignal(node, value, isComp) {
    let current = node.value;
    if (!node.comparator || !node.comparator(current, value)) {
      node.value = value;
      if (node.observers && node.observers.length) {
        runUpdates(() => {
          for (let i = 0; i < node.observers.length; i += 1) {
            const o = node.observers[i];
            const TransitionRunning = Transition && Transition.running;
            if (TransitionRunning && Transition.disposed.has(o)) ;
            if (TransitionRunning && !o.tState || !TransitionRunning && !o.state) {
              if (o.pure) Updates.push(o);else Effects.push(o);
              if (o.observers) markDownstream(o);
            }
            if (TransitionRunning) ;else o.state = STALE;
          }
          if (Updates.length > 10e5) {
            Updates = [];
            if (false) ;
            throw new Error();
          }
        }, false);
      }
    }
    return value;
  }
  function updateComputation(node) {
    if (!node.fn) return;
    cleanNode(node);
    const owner = Owner,
      listener = Listener,
      time = ExecCount;
    Listener = Owner = node;
    runComputation(node, node.value, time);
    Listener = listener;
    Owner = owner;
  }
  function runComputation(node, value, time) {
    let nextValue;
    try {
      nextValue = node.fn(value);
    } catch (err) {
      if (node.pure) {
        {
          node.state = STALE;
          node.owned && node.owned.forEach(cleanNode);
          node.owned = null;
        }
      }
      handleError(err);
    }
    if (!node.updatedAt || node.updatedAt <= time) {
      if (node.updatedAt != null && "observers" in node) {
        writeSignal(node, nextValue);
      } else node.value = nextValue;
      node.updatedAt = time;
    }
  }
  function createComputation(fn, init, pure, state = STALE, options) {
    const c = {
      fn,
      state: state,
      updatedAt: null,
      owned: null,
      sources: null,
      sourceSlots: null,
      cleanups: null,
      value: init,
      owner: Owner,
      context: null,
      pure
    };
    if (Owner === null) ;else if (Owner !== UNOWNED) {
      {
        if (!Owner.owned) Owner.owned = [c];else Owner.owned.push(c);
      }
    }
    return c;
  }
  function runTop(node) {
    const runningTransition = Transition ;
    if (node.state === 0 || runningTransition ) return;
    if (node.state === PENDING || runningTransition ) return lookUpstream(node);
    if (node.suspense && untrack(node.suspense.inFallback)) return node.suspense.effects.push(node);
    const ancestors = [node];
    while ((node = node.owner) && (!node.updatedAt || node.updatedAt < ExecCount)) {
      if (node.state || runningTransition ) ancestors.push(node);
    }
    for (let i = ancestors.length - 1; i >= 0; i--) {
      node = ancestors[i];
      if (node.state === STALE || runningTransition ) {
        updateComputation(node);
      } else if (node.state === PENDING || runningTransition ) {
        const updates = Updates;
        Updates = null;
        runUpdates(() => lookUpstream(node, ancestors[0]), false);
        Updates = updates;
      }
    }
  }
  function runUpdates(fn, init) {
    if (Updates) return fn();
    let wait = false;
    if (!init) Updates = [];
    if (Effects) wait = true;else Effects = [];
    ExecCount++;
    try {
      const res = fn();
      completeUpdates(wait);
      return res;
    } catch (err) {
      if (!wait) Effects = null;
      Updates = null;
      handleError(err);
    }
  }
  function completeUpdates(wait) {
    if (Updates) {
      runQueue(Updates);
      Updates = null;
    }
    if (wait) return;
    const e = Effects;
    Effects = null;
    if (e.length) runUpdates(() => runEffects(e), false);
  }
  function runQueue(queue) {
    for (let i = 0; i < queue.length; i++) runTop(queue[i]);
  }
  function runUserEffects(queue) {
    let i,
      userLength = 0;
    for (i = 0; i < queue.length; i++) {
      const e = queue[i];
      if (!e.user) runTop(e);else queue[userLength++] = e;
    }
    if (sharedConfig.context) setHydrateContext();
    for (i = 0; i < userLength; i++) runTop(queue[i]);
  }
  function lookUpstream(node, ignore) {
    const runningTransition = Transition ;
    node.state = 0;
    for (let i = 0; i < node.sources.length; i += 1) {
      const source = node.sources[i];
      if (source.sources) {
        if (source.state === STALE || runningTransition ) {
          if (source !== ignore) runTop(source);
        } else if (source.state === PENDING || runningTransition ) lookUpstream(source, ignore);
      }
    }
  }
  function markDownstream(node) {
    const runningTransition = Transition ;
    for (let i = 0; i < node.observers.length; i += 1) {
      const o = node.observers[i];
      if (!o.state || runningTransition ) {
        o.state = PENDING;
        if (o.pure) Updates.push(o);else Effects.push(o);
        o.observers && markDownstream(o);
      }
    }
  }
  function cleanNode(node) {
    let i;
    if (node.sources) {
      while (node.sources.length) {
        const source = node.sources.pop(),
          index = node.sourceSlots.pop(),
          obs = source.observers;
        if (obs && obs.length) {
          const n = obs.pop(),
            s = source.observerSlots.pop();
          if (index < obs.length) {
            n.sourceSlots[s] = index;
            obs[index] = n;
            source.observerSlots[index] = s;
          }
        }
      }
    }
    if (node.owned) {
      for (i = 0; i < node.owned.length; i++) cleanNode(node.owned[i]);
      node.owned = null;
    }
    if (node.cleanups) {
      for (i = 0; i < node.cleanups.length; i++) node.cleanups[i]();
      node.cleanups = null;
    }
    node.state = 0;
    node.context = null;
  }
  function castError(err) {
    if (err instanceof Error || typeof err === "string") return err;
    return new Error("Unknown error");
  }
  function handleError(err) {
    err = castError(err);
    throw err;
  }
  function resolveChildren(children) {
    if (typeof children === "function" && !children.length) return resolveChildren(children());
    if (Array.isArray(children)) {
      const results = [];
      for (let i = 0; i < children.length; i++) {
        const result = resolveChildren(children[i]);
        Array.isArray(result) ? results.push.apply(results, result) : results.push(result);
      }
      return results;
    }
    return children;
  }

  const FALLBACK = Symbol("fallback");
  function dispose(d) {
    for (let i = 0; i < d.length; i++) d[i]();
  }
  function mapArray(list, mapFn, options = {}) {
    let items = [],
      mapped = [],
      disposers = [],
      len = 0,
      indexes = mapFn.length > 1 ? [] : null;
    onCleanup(() => dispose(disposers));
    return () => {
      let newItems = list() || [],
        i,
        j;
      newItems[$TRACK];
      return untrack(() => {
        let newLen = newItems.length,
          newIndices,
          newIndicesNext,
          temp,
          tempdisposers,
          tempIndexes,
          start,
          end,
          newEnd,
          item;
        if (newLen === 0) {
          if (len !== 0) {
            dispose(disposers);
            disposers = [];
            items = [];
            mapped = [];
            len = 0;
            indexes && (indexes = []);
          }
          if (options.fallback) {
            items = [FALLBACK];
            mapped[0] = createRoot(disposer => {
              disposers[0] = disposer;
              return options.fallback();
            });
            len = 1;
          }
        }
        else if (len === 0) {
          mapped = new Array(newLen);
          for (j = 0; j < newLen; j++) {
            items[j] = newItems[j];
            mapped[j] = createRoot(mapper);
          }
          len = newLen;
        } else {
          temp = new Array(newLen);
          tempdisposers = new Array(newLen);
          indexes && (tempIndexes = new Array(newLen));
          for (start = 0, end = Math.min(len, newLen); start < end && items[start] === newItems[start]; start++);
          for (end = len - 1, newEnd = newLen - 1; end >= start && newEnd >= start && items[end] === newItems[newEnd]; end--, newEnd--) {
            temp[newEnd] = mapped[end];
            tempdisposers[newEnd] = disposers[end];
            indexes && (tempIndexes[newEnd] = indexes[end]);
          }
          newIndices = new Map();
          newIndicesNext = new Array(newEnd + 1);
          for (j = newEnd; j >= start; j--) {
            item = newItems[j];
            i = newIndices.get(item);
            newIndicesNext[j] = i === undefined ? -1 : i;
            newIndices.set(item, j);
          }
          for (i = start; i <= end; i++) {
            item = items[i];
            j = newIndices.get(item);
            if (j !== undefined && j !== -1) {
              temp[j] = mapped[i];
              tempdisposers[j] = disposers[i];
              indexes && (tempIndexes[j] = indexes[i]);
              j = newIndicesNext[j];
              newIndices.set(item, j);
            } else disposers[i]();
          }
          for (j = start; j < newLen; j++) {
            if (j in temp) {
              mapped[j] = temp[j];
              disposers[j] = tempdisposers[j];
              if (indexes) {
                indexes[j] = tempIndexes[j];
                indexes[j](j);
              }
            } else mapped[j] = createRoot(mapper);
          }
          mapped = mapped.slice(0, len = newLen);
          items = newItems.slice(0);
        }
        return mapped;
      });
      function mapper(disposer) {
        disposers[j] = disposer;
        if (indexes) {
          const [s, set] = createSignal(j);
          indexes[j] = set;
          return mapFn(newItems[j], s);
        }
        return mapFn(newItems[j]);
      }
    };
  }
  function indexArray(list, mapFn, options = {}) {
    let items = [],
      mapped = [],
      disposers = [],
      signals = [],
      len = 0,
      i;
    onCleanup(() => dispose(disposers));
    return () => {
      const newItems = list() || [];
      newItems[$TRACK];
      return untrack(() => {
        if (newItems.length === 0) {
          if (len !== 0) {
            dispose(disposers);
            disposers = [];
            items = [];
            mapped = [];
            len = 0;
            signals = [];
          }
          if (options.fallback) {
            items = [FALLBACK];
            mapped[0] = createRoot(disposer => {
              disposers[0] = disposer;
              return options.fallback();
            });
            len = 1;
          }
          return mapped;
        }
        if (items[0] === FALLBACK) {
          disposers[0]();
          disposers = [];
          items = [];
          mapped = [];
          len = 0;
        }
        for (i = 0; i < newItems.length; i++) {
          if (i < items.length && items[i] !== newItems[i]) {
            signals[i](() => newItems[i]);
          } else if (i >= items.length) {
            mapped[i] = createRoot(mapper);
          }
        }
        for (; i < items.length; i++) {
          disposers[i]();
        }
        len = signals.length = disposers.length = newItems.length;
        items = newItems.slice(0);
        return mapped = mapped.slice(0, len);
      });
      function mapper(disposer) {
        disposers[i] = disposer;
        const [s, set] = createSignal(newItems[i]);
        signals[i] = set;
        return mapFn(s, i);
      }
    };
  }
  function createComponent(Comp, props) {
    return untrack(() => Comp(props || {}));
  }
  function trueFn() {
    return true;
  }
  const propTraps = {
    get(_, property, receiver) {
      if (property === $PROXY) return receiver;
      return _.get(property);
    },
    has(_, property) {
      if (property === $PROXY) return true;
      return _.has(property);
    },
    set: trueFn,
    deleteProperty: trueFn,
    getOwnPropertyDescriptor(_, property) {
      return {
        configurable: true,
        enumerable: true,
        get() {
          return _.get(property);
        },
        set: trueFn,
        deleteProperty: trueFn
      };
    },
    ownKeys(_) {
      return _.keys();
    }
  };
  function resolveSource(s) {
    return !(s = typeof s === "function" ? s() : s) ? {} : s;
  }
  function mergeProps(...sources) {
    let proxy = false;
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      proxy = proxy || !!s && $PROXY in s;
      sources[i] = typeof s === "function" ? (proxy = true, createMemo(s)) : s;
    }
    if (proxy) {
      return new Proxy({
        get(property) {
          for (let i = sources.length - 1; i >= 0; i--) {
            const v = resolveSource(sources[i])[property];
            if (v !== undefined) return v;
          }
        },
        has(property) {
          for (let i = sources.length - 1; i >= 0; i--) {
            if (property in resolveSource(sources[i])) return true;
          }
          return false;
        },
        keys() {
          const keys = [];
          for (let i = 0; i < sources.length; i++) keys.push(...Object.keys(resolveSource(sources[i])));
          return [...new Set(keys)];
        }
      }, propTraps);
    }
    const target = {};
    for (let i = sources.length - 1; i >= 0; i--) {
      if (sources[i]) {
        const descriptors = Object.getOwnPropertyDescriptors(sources[i]);
        for (const key in descriptors) {
          if (key in target) continue;
          Object.defineProperty(target, key, {
            enumerable: true,
            get() {
              for (let i = sources.length - 1; i >= 0; i--) {
                const v = (sources[i] || {})[key];
                if (v !== undefined) return v;
              }
            }
          });
        }
      }
    }
    return target;
  }

  function For(props) {
    const fallback = "fallback" in props && {
      fallback: () => props.fallback
    };
    return createMemo(mapArray(() => props.each, props.children, fallback || undefined));
  }
  function Index(props) {
    const fallback = "fallback" in props && {
      fallback: () => props.fallback
    };
    return createMemo(indexArray(() => props.each, props.children, fallback || undefined));
  }
  function Show(props) {
    let strictEqual = false;
    const keyed = props.keyed;
    const condition = createMemo(() => props.when, undefined, {
      equals: (a, b) => strictEqual ? a === b : !a === !b
    });
    return createMemo(() => {
      const c = condition();
      if (c) {
        const child = props.children;
        const fn = typeof child === "function" && child.length > 0;
        strictEqual = keyed || fn;
        return fn ? untrack(() => child(c)) : child;
      }
      return props.fallback;
    }, undefined, undefined);
  }
  function Switch(props) {
    let strictEqual = false;
    let keyed = false;
    const equals = (a, b) => a[0] === b[0] && (strictEqual ? a[1] === b[1] : !a[1] === !b[1]) && a[2] === b[2];
    const conditions = children(() => props.children),
      evalConditions = createMemo(() => {
        let conds = conditions();
        if (!Array.isArray(conds)) conds = [conds];
        for (let i = 0; i < conds.length; i++) {
          const c = conds[i].when;
          if (c) {
            keyed = !!conds[i].keyed;
            return [i, c, conds[i]];
          }
        }
        return [-1];
      }, undefined, {
        equals
      });
    return createMemo(() => {
      const [index, when, cond] = evalConditions();
      if (index < 0) return props.fallback;
      const c = cond.children;
      const fn = typeof c === "function" && c.length > 0;
      strictEqual = keyed || fn;
      return fn ? untrack(() => c(when)) : c;
    }, undefined, undefined);
  }
  function Match(props) {
    return props;
  }

  function reconcileArrays(parentNode, a, b) {
    let bLength = b.length,
      aEnd = a.length,
      bEnd = bLength,
      aStart = 0,
      bStart = 0,
      after = a[aEnd - 1].nextSibling,
      map = null;
    while (aStart < aEnd || bStart < bEnd) {
      if (a[aStart] === b[bStart]) {
        aStart++;
        bStart++;
        continue;
      }
      while (a[aEnd - 1] === b[bEnd - 1]) {
        aEnd--;
        bEnd--;
      }
      if (aEnd === aStart) {
        const node = bEnd < bLength ? bStart ? b[bStart - 1].nextSibling : b[bEnd - bStart] : after;
        while (bStart < bEnd) parentNode.insertBefore(b[bStart++], node);
      } else if (bEnd === bStart) {
        while (aStart < aEnd) {
          if (!map || !map.has(a[aStart])) a[aStart].remove();
          aStart++;
        }
      } else if (a[aStart] === b[bEnd - 1] && b[bStart] === a[aEnd - 1]) {
        const node = a[--aEnd].nextSibling;
        parentNode.insertBefore(b[bStart++], a[aStart++].nextSibling);
        parentNode.insertBefore(b[--bEnd], node);
        a[aEnd] = b[bEnd];
      } else {
        if (!map) {
          map = new Map();
          let i = bStart;
          while (i < bEnd) map.set(b[i], i++);
        }
        const index = map.get(a[aStart]);
        if (index != null) {
          if (bStart < index && index < bEnd) {
            let i = aStart,
              sequence = 1,
              t;
            while (++i < aEnd && i < bEnd) {
              if ((t = map.get(a[i])) == null || t !== index + sequence) break;
              sequence++;
            }
            if (sequence > index - bStart) {
              const node = a[aStart];
              while (bStart < index) parentNode.insertBefore(b[bStart++], node);
            } else parentNode.replaceChild(b[bStart++], a[aStart++]);
          } else aStart++;
        } else a[aStart++].remove();
      }
    }
  }

  const $$EVENTS = "_$DX_DELEGATE";
  function render(code, element, init, options = {}) {
    let disposer;
    createRoot(dispose => {
      disposer = dispose;
      element === document ? code() : insert(element, code(), element.firstChild ? null : undefined, init);
    }, options.owner);
    return () => {
      disposer();
      element.textContent = "";
    };
  }
  function template(html, check, isSVG) {
    const t = document.createElement("template");
    t.innerHTML = html;
    let node = t.content.firstChild;
    if (isSVG) node = node.firstChild;
    return node;
  }
  function delegateEvents(eventNames, document = window.document) {
    const e = document[$$EVENTS] || (document[$$EVENTS] = new Set());
    for (let i = 0, l = eventNames.length; i < l; i++) {
      const name = eventNames[i];
      if (!e.has(name)) {
        e.add(name);
        document.addEventListener(name, eventHandler);
      }
    }
  }
  function setAttribute(node, name, value) {
    if (value == null) node.removeAttribute(name);else node.setAttribute(name, value);
  }
  function className(node, value) {
    if (value == null) node.removeAttribute("class");else node.className = value;
  }
  function addEventListener(node, name, handler, delegate) {
    if (delegate) {
      if (Array.isArray(handler)) {
        node[`$$${name}`] = handler[0];
        node[`$$${name}Data`] = handler[1];
      } else node[`$$${name}`] = handler;
    } else if (Array.isArray(handler)) {
      const handlerFn = handler[0];
      node.addEventListener(name, handler[0] = e => handlerFn.call(node, handler[1], e));
    } else node.addEventListener(name, handler);
  }
  function style(node, value, prev) {
    if (!value) return prev ? setAttribute(node, "style") : value;
    const nodeStyle = node.style;
    if (typeof value === "string") return nodeStyle.cssText = value;
    typeof prev === "string" && (nodeStyle.cssText = prev = undefined);
    prev || (prev = {});
    value || (value = {});
    let v, s;
    for (s in prev) {
      value[s] == null && nodeStyle.removeProperty(s);
      delete prev[s];
    }
    for (s in value) {
      v = value[s];
      if (v !== prev[s]) {
        nodeStyle.setProperty(s, v);
        prev[s] = v;
      }
    }
    return prev;
  }
  function use(fn, element, arg) {
    return untrack(() => fn(element, arg));
  }
  function insert(parent, accessor, marker, initial) {
    if (marker !== undefined && !initial) initial = [];
    if (typeof accessor !== "function") return insertExpression(parent, accessor, initial, marker);
    createRenderEffect(current => insertExpression(parent, accessor(), current, marker), initial);
  }
  function eventHandler(e) {
    const key = `$$${e.type}`;
    let node = e.composedPath && e.composedPath()[0] || e.target;
    if (e.target !== node) {
      Object.defineProperty(e, "target", {
        configurable: true,
        value: node
      });
    }
    Object.defineProperty(e, "currentTarget", {
      configurable: true,
      get() {
        return node || document;
      }
    });
    if (sharedConfig.registry && !sharedConfig.done) {
      sharedConfig.done = true;
      document.querySelectorAll("[id^=pl-]").forEach(elem => {
        while (elem && elem.nodeType !== 8 && elem.nodeValue !== "pl-" + e) {
          let x = elem.nextSibling;
          elem.remove();
          elem = x;
        }
        elem && elem.remove();
      });
    }
    while (node) {
      const handler = node[key];
      if (handler && !node.disabled) {
        const data = node[`${key}Data`];
        data !== undefined ? handler.call(node, data, e) : handler.call(node, e);
        if (e.cancelBubble) return;
      }
      node = node._$host || node.parentNode || node.host;
    }
  }
  function insertExpression(parent, value, current, marker, unwrapArray) {
    if (sharedConfig.context && !current) current = [...parent.childNodes];
    while (typeof current === "function") current = current();
    if (value === current) return current;
    const t = typeof value,
      multi = marker !== undefined;
    parent = multi && current[0] && current[0].parentNode || parent;
    if (t === "string" || t === "number") {
      if (sharedConfig.context) return current;
      if (t === "number") value = value.toString();
      if (multi) {
        let node = current[0];
        if (node && node.nodeType === 3) {
          node.data = value;
        } else node = document.createTextNode(value);
        current = cleanChildren(parent, current, marker, node);
      } else {
        if (current !== "" && typeof current === "string") {
          current = parent.firstChild.data = value;
        } else current = parent.textContent = value;
      }
    } else if (value == null || t === "boolean") {
      if (sharedConfig.context) return current;
      current = cleanChildren(parent, current, marker);
    } else if (t === "function") {
      createRenderEffect(() => {
        let v = value();
        while (typeof v === "function") v = v();
        current = insertExpression(parent, v, current, marker);
      });
      return () => current;
    } else if (Array.isArray(value)) {
      const array = [];
      const currentArray = current && Array.isArray(current);
      if (normalizeIncomingArray(array, value, current, unwrapArray)) {
        createRenderEffect(() => current = insertExpression(parent, array, current, marker, true));
        return () => current;
      }
      if (sharedConfig.context) {
        if (!array.length) return current;
        for (let i = 0; i < array.length; i++) {
          if (array[i].parentNode) return current = array;
        }
      }
      if (array.length === 0) {
        current = cleanChildren(parent, current, marker);
        if (multi) return current;
      } else if (currentArray) {
        if (current.length === 0) {
          appendNodes(parent, array, marker);
        } else reconcileArrays(parent, current, array);
      } else {
        current && cleanChildren(parent);
        appendNodes(parent, array);
      }
      current = array;
    } else if (value instanceof Node) {
      if (sharedConfig.context && value.parentNode) return current = multi ? [value] : value;
      if (Array.isArray(current)) {
        if (multi) return current = cleanChildren(parent, current, marker, value);
        cleanChildren(parent, current, null, value);
      } else if (current == null || current === "" || !parent.firstChild) {
        parent.appendChild(value);
      } else parent.replaceChild(value, parent.firstChild);
      current = value;
    } else ;
    return current;
  }
  function normalizeIncomingArray(normalized, array, current, unwrap) {
    let dynamic = false;
    for (let i = 0, len = array.length; i < len; i++) {
      let item = array[i],
        prev = current && current[i];
      if (item instanceof Node) {
        normalized.push(item);
      } else if (item == null || item === true || item === false) ; else if (Array.isArray(item)) {
        dynamic = normalizeIncomingArray(normalized, item, prev) || dynamic;
      } else if ((typeof item) === "function") {
        if (unwrap) {
          while (typeof item === "function") item = item();
          dynamic = normalizeIncomingArray(normalized, Array.isArray(item) ? item : [item], Array.isArray(prev) ? prev : [prev]) || dynamic;
        } else {
          normalized.push(item);
          dynamic = true;
        }
      } else {
        const value = String(item);
        if (prev && prev.nodeType === 3 && prev.data === value) {
          normalized.push(prev);
        } else normalized.push(document.createTextNode(value));
      }
    }
    return dynamic;
  }
  function appendNodes(parent, array, marker = null) {
    for (let i = 0, len = array.length; i < len; i++) parent.insertBefore(array[i], marker);
  }
  function cleanChildren(parent, current, marker, replacement) {
    if (marker === undefined) return parent.textContent = "";
    const node = replacement || document.createTextNode("");
    if (current.length) {
      let inserted = false;
      for (let i = current.length - 1; i >= 0; i--) {
        const el = current[i];
        if (node !== el) {
          const isParent = el.parentNode === parent;
          if (!inserted && !i) isParent ? parent.replaceChild(node, el) : parent.insertBefore(node, marker);else isParent && el.remove();
        } else inserted = true;
      }
    } else parent.insertBefore(node, marker);
    return [node];
  }

  const $RAW = Symbol("store-raw"),
    $NODE = Symbol("store-node"),
    $NAME = Symbol("store-name");
  function wrap$1(value, name) {
    let p = value[$PROXY];
    if (!p) {
      Object.defineProperty(value, $PROXY, {
        value: p = new Proxy(value, proxyTraps$1)
      });
      if (!Array.isArray(value)) {
        const keys = Object.keys(value),
          desc = Object.getOwnPropertyDescriptors(value);
        for (let i = 0, l = keys.length; i < l; i++) {
          const prop = keys[i];
          if (desc[prop].get) {
            Object.defineProperty(value, prop, {
              enumerable: desc[prop].enumerable,
              get: desc[prop].get.bind(p)
            });
          }
        }
      }
    }
    return p;
  }
  function isWrappable(obj) {
    let proto;
    return obj != null && typeof obj === "object" && (obj[$PROXY] || !(proto = Object.getPrototypeOf(obj)) || proto === Object.prototype || Array.isArray(obj));
  }
  function unwrap(item, set = new Set()) {
    let result, unwrapped, v, prop;
    if (result = item != null && item[$RAW]) return result;
    if (!isWrappable(item) || set.has(item)) return item;
    if (Array.isArray(item)) {
      if (Object.isFrozen(item)) item = item.slice(0);else set.add(item);
      for (let i = 0, l = item.length; i < l; i++) {
        v = item[i];
        if ((unwrapped = unwrap(v, set)) !== v) item[i] = unwrapped;
      }
    } else {
      if (Object.isFrozen(item)) item = Object.assign({}, item);else set.add(item);
      const keys = Object.keys(item),
        desc = Object.getOwnPropertyDescriptors(item);
      for (let i = 0, l = keys.length; i < l; i++) {
        prop = keys[i];
        if (desc[prop].get) continue;
        v = item[prop];
        if ((unwrapped = unwrap(v, set)) !== v) item[prop] = unwrapped;
      }
    }
    return item;
  }
  function getDataNodes(target) {
    let nodes = target[$NODE];
    if (!nodes) Object.defineProperty(target, $NODE, {
      value: nodes = {}
    });
    return nodes;
  }
  function getDataNode(nodes, property, value) {
    return nodes[property] || (nodes[property] = createDataNode(value));
  }
  function proxyDescriptor$1(target, property) {
    const desc = Reflect.getOwnPropertyDescriptor(target, property);
    if (!desc || desc.get || !desc.configurable || property === $PROXY || property === $NODE || property === $NAME) return desc;
    delete desc.value;
    delete desc.writable;
    desc.get = () => target[$PROXY][property];
    return desc;
  }
  function trackSelf(target) {
    if (getListener()) {
      const nodes = getDataNodes(target);
      (nodes._ || (nodes._ = createDataNode()))();
    }
  }
  function ownKeys(target) {
    trackSelf(target);
    return Reflect.ownKeys(target);
  }
  function createDataNode(value) {
    const [s, set] = createSignal(value, {
      equals: false,
      internal: true
    });
    s.$ = set;
    return s;
  }
  const proxyTraps$1 = {
    get(target, property, receiver) {
      if (property === $RAW) return target;
      if (property === $PROXY) return receiver;
      if (property === $TRACK) {
        trackSelf(target);
        return receiver;
      }
      const nodes = getDataNodes(target);
      const tracked = nodes.hasOwnProperty(property);
      let value = tracked ? nodes[property]() : target[property];
      if (property === $NODE || property === "__proto__") return value;
      if (!tracked) {
        const desc = Object.getOwnPropertyDescriptor(target, property);
        if (getListener() && (typeof value !== "function" || target.hasOwnProperty(property)) && !(desc && desc.get)) value = getDataNode(nodes, property, value)();
      }
      return isWrappable(value) ? wrap$1(value) : value;
    },
    has(target, property) {
      if (property === $RAW || property === $PROXY || property === $TRACK || property === $NODE || property === "__proto__") return true;
      this.get(target, property, target);
      return property in target;
    },
    set() {
      return true;
    },
    deleteProperty() {
      return true;
    },
    ownKeys: ownKeys,
    getOwnPropertyDescriptor: proxyDescriptor$1
  };
  function setProperty(state, property, value, deleting = false) {
    if (!deleting && state[property] === value) return;
    const prev = state[property],
      len = state.length;
    if (value === undefined) delete state[property];else state[property] = value;
    let nodes = getDataNodes(state),
      node;
    if (node = getDataNode(nodes, property, prev)) node.$(() => value);
    if (Array.isArray(state) && state.length !== len) (node = getDataNode(nodes, "length", len)) && node.$(state.length);
    (node = nodes._) && node.$();
  }
  function mergeStoreNode(state, value) {
    const keys = Object.keys(value);
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      setProperty(state, key, value[key]);
    }
  }
  function updateArray(current, next) {
    if (typeof next === "function") next = next(current);
    next = unwrap(next);
    if (Array.isArray(next)) {
      if (current === next) return;
      let i = 0,
        len = next.length;
      for (; i < len; i++) {
        const value = next[i];
        if (current[i] !== value) setProperty(current, i, value);
      }
      setProperty(current, "length", len);
    } else mergeStoreNode(current, next);
  }
  function updatePath(current, path, traversed = []) {
    let part,
      prev = current;
    if (path.length > 1) {
      part = path.shift();
      const partType = typeof part,
        isArray = Array.isArray(current);
      if (Array.isArray(part)) {
        for (let i = 0; i < part.length; i++) {
          updatePath(current, [part[i]].concat(path), traversed);
        }
        return;
      } else if (isArray && partType === "function") {
        for (let i = 0; i < current.length; i++) {
          if (part(current[i], i)) updatePath(current, [i].concat(path), traversed);
        }
        return;
      } else if (isArray && partType === "object") {
        const {
          from = 0,
          to = current.length - 1,
          by = 1
        } = part;
        for (let i = from; i <= to; i += by) {
          updatePath(current, [i].concat(path), traversed);
        }
        return;
      } else if (path.length > 1) {
        updatePath(current[part], path, [part].concat(traversed));
        return;
      }
      prev = current[part];
      traversed = [part].concat(traversed);
    }
    let value = path[0];
    if (typeof value === "function") {
      value = value(prev, traversed);
      if (value === prev) return;
    }
    if (part === undefined && value == undefined) return;
    value = unwrap(value);
    if (part === undefined || isWrappable(prev) && isWrappable(value) && !Array.isArray(value)) {
      mergeStoreNode(prev, value);
    } else setProperty(current, part, value);
  }
  function createStore(...[store, options]) {
    const unwrappedStore = unwrap(store || {});
    const isArray = Array.isArray(unwrappedStore);
    const wrappedStore = wrap$1(unwrappedStore);
    function setStore(...args) {
      batch(() => {
        isArray && args.length === 1 ? updateArray(unwrappedStore, args[0]) : updatePath(unwrappedStore, args);
      });
    }
    return [wrappedStore, setStore];
  }

  const $ROOT = Symbol("store-root");
  function applyState(target, parent, property, merge, key) {
    const previous = parent[property];
    if (target === previous) return;
    if (!isWrappable(target) || !isWrappable(previous) || key && target[key] !== previous[key]) {
      if (target !== previous) {
        if (property === $ROOT) return target;
        setProperty(parent, property, target);
      }
      return;
    }
    if (Array.isArray(target)) {
      if (target.length && previous.length && (!merge || key && target[0] && target[0][key] != null)) {
        let i, j, start, end, newEnd, item, newIndicesNext, keyVal;
        for (start = 0, end = Math.min(previous.length, target.length); start < end && (previous[start] === target[start] || key && previous[start] && target[start] && previous[start][key] === target[start][key]); start++) {
          applyState(target[start], previous, start, merge, key);
        }
        const temp = new Array(target.length),
          newIndices = new Map();
        for (end = previous.length - 1, newEnd = target.length - 1; end >= start && newEnd >= start && (previous[end] === target[newEnd] || key && previous[start] && target[start] && previous[end][key] === target[newEnd][key]); end--, newEnd--) {
          temp[newEnd] = previous[end];
        }
        if (start > newEnd || start > end) {
          for (j = start; j <= newEnd; j++) setProperty(previous, j, target[j]);
          for (; j < target.length; j++) {
            setProperty(previous, j, temp[j]);
            applyState(target[j], previous, j, merge, key);
          }
          if (previous.length > target.length) setProperty(previous, "length", target.length);
          return;
        }
        newIndicesNext = new Array(newEnd + 1);
        for (j = newEnd; j >= start; j--) {
          item = target[j];
          keyVal = key && item ? item[key] : item;
          i = newIndices.get(keyVal);
          newIndicesNext[j] = i === undefined ? -1 : i;
          newIndices.set(keyVal, j);
        }
        for (i = start; i <= end; i++) {
          item = previous[i];
          keyVal = key && item ? item[key] : item;
          j = newIndices.get(keyVal);
          if (j !== undefined && j !== -1) {
            temp[j] = previous[i];
            j = newIndicesNext[j];
            newIndices.set(keyVal, j);
          }
        }
        for (j = start; j < target.length; j++) {
          if (j in temp) {
            setProperty(previous, j, temp[j]);
            applyState(target[j], previous, j, merge, key);
          } else setProperty(previous, j, target[j]);
        }
      } else {
        for (let i = 0, len = target.length; i < len; i++) {
          applyState(target[i], previous, i, merge, key);
        }
      }
      if (previous.length > target.length) setProperty(previous, "length", target.length);
      return;
    }
    const targetKeys = Object.keys(target);
    for (let i = 0, len = targetKeys.length; i < len; i++) {
      applyState(target[targetKeys[i]], previous, targetKeys[i], merge, key);
    }
    const previousKeys = Object.keys(previous);
    for (let i = 0, len = previousKeys.length; i < len; i++) {
      if (target[previousKeys[i]] === undefined) setProperty(previous, previousKeys[i], undefined);
    }
  }
  function reconcile(value, options = {}) {
    const {
        merge,
        key = "id"
      } = options,
      v = unwrap(value);
    return state => {
      if (!isWrappable(state) || !isWrappable(v)) return v;
      const res = applyState(v, {
        [$ROOT]: state
      }, $ROOT, merge, key);
      return res === undefined ? state : res;
    };
  }

  const _tmpl$$b = /*#__PURE__*/template(`<span></span>`);
  var Segment = (props => {
    const codePoint = createMemo(() => {
      if (props.text.length == 1) {
        const cp = props.text.codePointAt(0);
        if (cp >= 0x2580 && cp <= 0x259f || cp == 0xe0b0 || cp == 0xe0b2) {
          return cp;
        }
      }
    });
    const text = createMemo(() => codePoint() ? " " : props.text);
    const style$1 = createMemo(() => buildStyle(props.pen, props.offset, props.width));
    const className$1 = createMemo(() => buildClassName(props.pen, codePoint(), props.extraClass));
    return (() => {
      const _el$ = _tmpl$$b.cloneNode(true);
      insert(_el$, text);
      createRenderEffect(_p$ => {
        const _v$ = className$1(),
          _v$2 = style$1();
        _v$ !== _p$._v$ && className(_el$, _p$._v$ = _v$);
        _p$._v$2 = style(_el$, _v$2, _p$._v$2);
        return _p$;
      }, {
        _v$: undefined,
        _v$2: undefined
      });
      return _el$;
    })();
  });
  function buildClassName(attrs, codePoint, extraClass) {
    const fgClass = colorClass(attrs.get("fg"), attrs.get("bold"), "fg-");
    const bgClass = colorClass(attrs.get("bg"), false, "bg-");
    let cls = extraClass ?? "";
    if (codePoint !== undefined) {
      cls += ` cp-${codePoint.toString(16)}`;
    }
    if (fgClass) {
      cls += " " + fgClass;
    }
    if (bgClass) {
      cls += " " + bgClass;
    }
    if (attrs.has("bold")) {
      cls += " ap-bright";
    }
    if (attrs.has("faint")) {
      cls += " ap-faint";
    }
    if (attrs.has("italic")) {
      cls += " ap-italic";
    }
    if (attrs.has("underline")) {
      cls += " ap-underline";
    }
    if (attrs.has("blink")) {
      cls += " ap-blink";
    }
    if (attrs.get("inverse")) {
      cls += " ap-inverse";
    }
    return cls;
  }
  function colorClass(color, intense, prefix) {
    if (typeof color === "number") {
      if (intense && color < 8) {
        color += 8;
      }
      return `${prefix}${color}`;
    }
  }
  function buildStyle(attrs, offset, width) {
    const fg = attrs.get("fg");
    const bg = attrs.get("bg");
    let style = {
      "--offset": offset,
      width: `${width + 0.01}ch`
    };
    if (typeof fg === "string") {
      style["--fg"] = fg;
    }
    if (typeof bg === "string") {
      style["--bg"] = bg;
    }
    return style;
  }

  const _tmpl$$a = /*#__PURE__*/template(`<span class="ap-line" role="paragraph"></span>`);
  var Line = (props => {
    const segments = () => {
      if (typeof props.cursor === "number") {
        const segs = [];
        let len = 0;
        let i = 0;
        while (i < props.segments.length && len + props.segments[i].text.length - 1 < props.cursor) {
          const seg = props.segments[i];
          segs.push(seg);
          len += seg.text.length;
          i++;
        }
        if (i < props.segments.length) {
          const seg = props.segments[i];
          const pos = props.cursor - len;
          if (pos > 0) {
            segs.push({
              ...seg,
              text: seg.text.substring(0, pos)
            });
          }
          segs.push({
            ...seg,
            text: seg.text[pos],
            offset: seg.offset + pos,
            extraClass: "ap-cursor"
          });
          if (pos < seg.text.length - 1) {
            segs.push({
              ...seg,
              text: seg.text.substring(pos + 1),
              offset: seg.offset + pos + 1
            });
          }
          i++;
          while (i < props.segments.length) {
            const seg = props.segments[i];
            segs.push(seg);
            i++;
          }
        }
        return segs;
      } else {
        return props.segments;
      }
    };
    return (() => {
      const _el$ = _tmpl$$a.cloneNode(true);
      insert(_el$, createComponent(Index, {
        get each() {
          return segments();
        },
        children: s => createComponent(Segment, mergeProps(s))
      }));
      return _el$;
    })();
  });

  const _tmpl$$9 = /*#__PURE__*/template(`<pre class="ap-terminal" aria-live="polite" tabindex="0"></pre>`);
  var Terminal = (props => {
    const lineHeight = () => props.lineHeight ?? 1.3333333333;
    const style$1 = createMemo(() => {
      return {
        width: `${props.cols}ch`,
        height: `${lineHeight() * props.rows}em`,
        "font-size": `${(props.scale || 1.0) * 100}%`,
        "font-family": props.fontFamily,
        "--term-line-height": `${lineHeight()}em`,
        "--term-cols": props.cols
      };
    });
    const cursorCol = createMemo(() => props.cursor?.[0]);
    const cursorRow = createMemo(() => props.cursor?.[1]);
    return (() => {
      const _el$ = _tmpl$$9.cloneNode(true);
      const _ref$ = props.ref;
      typeof _ref$ === "function" ? use(_ref$, _el$) : props.ref = _el$;
      insert(_el$, createComponent(For, {
        get each() {
          return props.lines;
        },
        children: (line, i) => createComponent(Line, {
          get segments() {
            return line.segments;
          },
          get cursor() {
            return createMemo(() => i() === cursorRow())() ? cursorCol() : null;
          }
        })
      }));
      createRenderEffect(_p$ => {
        const _v$ = !!(props.blink || props.cursorHold),
          _v$2 = !!props.blink,
          _v$3 = style$1();
        _v$ !== _p$._v$ && _el$.classList.toggle("ap-cursor-on", _p$._v$ = _v$);
        _v$2 !== _p$._v$2 && _el$.classList.toggle("ap-blink", _p$._v$2 = _v$2);
        _p$._v$3 = style(_el$, _v$3, _p$._v$3);
        return _p$;
      }, {
        _v$: undefined,
        _v$2: undefined,
        _v$3: undefined
      });
      return _el$;
    })();
  });

  const _tmpl$$8 = /*#__PURE__*/template(`<svg version="1.1" viewBox="0 0 12 12" class="ap-icon" aria-label="Pause" role="button"><path d="M1,0 L4,0 L4,12 L1,12 Z"></path><path d="M8,0 L11,0 L11,12 L8,12 Z"></path></svg>`),
    _tmpl$2$3 = /*#__PURE__*/template(`<svg version="1.1" viewBox="0 0 12 12" class="ap-icon" aria-label="Play" role="button"><path d="M1,0 L11,6 L1,12 Z"></path></svg>`),
    _tmpl$3$2 = /*#__PURE__*/template(`<span class="ap-button ap-playback-button" tabindex="0"></span>`),
    _tmpl$4$2 = /*#__PURE__*/template(`<span class="ap-bar"><span class="ap-gutter ap-gutter-empty"></span><span class="ap-gutter ap-gutter-full"></span></span>`),
    _tmpl$5$2 = /*#__PURE__*/template(`<div class="ap-control-bar"><span class="ap-timer" aria-readonly="true" role="textbox" tabindex="0"><span class="ap-time-elapsed"></span><span class="ap-time-remaining"></span></span><span class="ap-progressbar"></span><span class="ap-button ap-kbd-button ap-tooltip-container" aria-label="Show keyboard shortcuts" role="button" tabindex="0"><svg version="1.1" viewBox="6 8 14 16" class="ap-icon"><path d="M0.938 8.313h22.125c0.5 0 0.938 0.438 0.938 0.938v13.5c0 0.5-0.438 0.938-0.938 0.938h-22.125c-0.5 0-0.938-0.438-0.938-0.938v-13.5c0-0.5 0.438-0.938 0.938-0.938zM1.594 22.063h20.813v-12.156h-20.813v12.156zM3.844 11.188h1.906v1.938h-1.906v-1.938zM7.469 11.188h1.906v1.938h-1.906v-1.938zM11.031 11.188h1.938v1.938h-1.938v-1.938zM14.656 11.188h1.875v1.938h-1.875v-1.938zM18.25 11.188h1.906v1.938h-1.906v-1.938zM5.656 15.031h1.938v1.938h-1.938v-1.938zM9.281 16.969v-1.938h1.906v1.938h-1.906zM12.875 16.969v-1.938h1.906v1.938h-1.906zM18.406 16.969h-1.938v-1.938h1.938v1.938zM16.531 20.781h-9.063v-1.906h9.063v1.906z"></path></svg><span class="ap-tooltip">Keyboard shortcuts (?)</span></span><span class="ap-button ap-fullscreen-button ap-tooltip-container" aria-label="Toggle fullscreen mode" role="button" tabindex="0"><svg version="1.1" viewBox="0 0 12 12" class="ap-icon ap-icon-fullscreen-on"><path d="M12,0 L7,0 L9,2 L7,4 L8,5 L10,3 L12,5 Z"></path><path d="M0,12 L0,7 L2,9 L4,7 L5,8 L3,10 L5,12 Z"></path></svg><svg version="1.1" viewBox="0 0 12 12" class="ap-icon ap-icon-fullscreen-off"><path d="M7,5 L7,0 L9,2 L11,0 L12,1 L10,3 L12,5 Z"></path><path d="M5,7 L0,7 L2,9 L0,11 L1,12 L3,10 L5,12 Z"></path></svg><span class="ap-tooltip">Fullscreen (f)</span></span></div>`),
    _tmpl$6$2 = /*#__PURE__*/template(`<span class="ap-marker-container"><span class="ap-marker"></span></span>`);
  function formatTime(seconds) {
    let s = Math.floor(seconds);
    const d = Math.floor(s / 86400);
    s %= 86400;
    const h = Math.floor(s / 3600);
    s %= 3600;
    const m = Math.floor(s / 60);
    s %= 60;
    if (d > 0) {
      return `${zeroPad(d)}:${zeroPad(h)}:${zeroPad(m)}:${zeroPad(s)}`;
    } else if (h > 0) {
      return `${zeroPad(h)}:${zeroPad(m)}:${zeroPad(s)}`;
    } else {
      return `${zeroPad(m)}:${zeroPad(s)}`;
    }
  }
  function zeroPad(n) {
    return n < 10 ? `0${n}` : n.toString();
  }
  var ControlBar = (props => {
    const e = f => {
      return e => {
        e.preventDefault();
        f(e);
      };
    };
    const currentTime = () => typeof props.currentTime === "number" ? formatTime(props.currentTime) : "--:--";
    const remainingTime = () => typeof props.remainingTime === "number" ? "-" + formatTime(props.remainingTime) : currentTime();
    const markers = createMemo(() => typeof props.duration === "number" ? props.markers.filter(m => m[0] < props.duration) : []);
    const markerPosition = m => `${m[0] / props.duration * 100}%`;
    const isPastMarker = m => typeof props.currentTime === "number" ? m[0] <= props.currentTime : false;
    const gutterBarStyle = () => {
      return {
        transform: `scaleX(${props.progress || 0}`
      };
    };
    const calcPosition = e => {
      const barWidth = e.currentTarget.offsetWidth;
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const pos = Math.max(0, mouseX / barWidth);
      return `${pos * 100}%`;
    };
    const [mouseDown, setMouseDown] = createSignal(false);
    const throttledSeek = throttle(props.onSeekClick, 50);
    const onMouseDown = e => {
      if (e._marker) return;
      if (e.altKey || e.shiftKey || e.metaKey || e.ctrlKey || e.button !== 0) return;
      setMouseDown(true);
      props.onSeekClick(calcPosition(e));
    };
    const seekToMarker = index => {
      return e(() => {
        props.onSeekClick({
          marker: index
        });
      });
    };
    const onMove = e => {
      if (e.altKey || e.shiftKey || e.metaKey || e.ctrlKey) return;
      if (mouseDown()) {
        throttledSeek(calcPosition(e));
      }
    };
    const onDocumentMouseUp = () => {
      setMouseDown(false);
    };
    document.addEventListener("mouseup", onDocumentMouseUp);
    onCleanup(() => {
      document.removeEventListener("mouseup", onDocumentMouseUp);
    });
    return (() => {
      const _el$ = _tmpl$5$2.cloneNode(true),
        _el$5 = _el$.firstChild,
        _el$6 = _el$5.firstChild,
        _el$7 = _el$6.nextSibling,
        _el$8 = _el$5.nextSibling,
        _el$12 = _el$8.nextSibling,
        _el$13 = _el$12.nextSibling;
      const _ref$ = props.ref;
      typeof _ref$ === "function" ? use(_ref$, _el$) : props.ref = _el$;
      insert(_el$, createComponent(Show, {
        get when() {
          return props.isPausable;
        },
        get children() {
          const _el$2 = _tmpl$3$2.cloneNode(true);
          addEventListener(_el$2, "click", e(props.onPlayClick), true);
          insert(_el$2, createComponent(Switch, {
            get children() {
              return [createComponent(Match, {
                get when() {
                  return props.isPlaying;
                },
                get children() {
                  return _tmpl$$8.cloneNode(true);
                }
              }), createComponent(Match, {
                get when() {
                  return !props.isPlaying;
                },
                get children() {
                  return _tmpl$2$3.cloneNode(true);
                }
              })];
            }
          }));
          return _el$2;
        }
      }), _el$5);
      insert(_el$6, currentTime);
      insert(_el$7, remainingTime);
      insert(_el$8, createComponent(Show, {
        get when() {
          return typeof props.progress === "number" || props.isSeekable;
        },
        get children() {
          const _el$9 = _tmpl$4$2.cloneNode(true),
            _el$10 = _el$9.firstChild,
            _el$11 = _el$10.nextSibling;
          _el$9.$$mousemove = onMove;
          _el$9.$$mousedown = onMouseDown;
          insert(_el$9, createComponent(For, {
            get each() {
              return markers();
            },
            children: (m, i) => (() => {
              const _el$14 = _tmpl$6$2.cloneNode(true),
                _el$15 = _el$14.firstChild;
              _el$14.$$mousedown = e => {
                e._marker = true;
              };
              addEventListener(_el$14, "click", seekToMarker(i()), true);
              createRenderEffect(_p$ => {
                const _v$ = markerPosition(m),
                  _v$2 = !!isPastMarker(m);
                _v$ !== _p$._v$ && _el$14.style.setProperty("left", _p$._v$ = _v$);
                _v$2 !== _p$._v$2 && _el$15.classList.toggle("ap-marker-past", _p$._v$2 = _v$2);
                return _p$;
              }, {
                _v$: undefined,
                _v$2: undefined
              });
              return _el$14;
            })()
          }), null);
          createRenderEffect(_$p => style(_el$11, gutterBarStyle(), _$p));
          return _el$9;
        }
      }));
      addEventListener(_el$12, "click", e(props.onHelpClick), true);
      addEventListener(_el$13, "click", e(props.onFullscreenClick), true);
      createRenderEffect(() => _el$.classList.toggle("ap-seekable", !!props.isSeekable));
      return _el$;
    })();
  });
  delegateEvents(["click", "mousedown", "mousemove"]);

  const _tmpl$$7 = /*#__PURE__*/template(`<div class="ap-marker-section"><h4>Explanation</h4><p></p></div>`),
    _tmpl$2$2 = /*#__PURE__*/template(`<div class="ap-marker-section"><h4>Commands</h4><ul></ul></div>`),
    _tmpl$3$1 = /*#__PURE__*/template(`<div class="ap-marker-details-content"><div class="ap-marker-header"><h3>Agent Details</h3></div><div class="ap-marker-section"><h4>State Analysis</h4><p></p></div></div>`),
    _tmpl$4$1 = /*#__PURE__*/template(`<div class="ap-marker-details"></div>`),
    _tmpl$5$1 = /*#__PURE__*/template(`<span class="ap-marker-command-blocking">Blocking</span>`),
    _tmpl$6$1 = /*#__PURE__*/template(`<span class="ap-marker-command-timeout">Timeout: <!>s</span>`),
    _tmpl$7$1 = /*#__PURE__*/template(`<li><code></code><div class="ap-marker-command-meta"></div></li>`);
  var MarkerDetails = (props => {
    // Create a reactive memo that depends on the marker prop
    const markerDetails = createMemo(() => {
      if (!props.marker || !props.marker[1]) return null;
      try {
        // Try to parse the JSON string if it exists
        const jsonStr = props.marker[1];
        if (typeof jsonStr === 'string' && jsonStr.startsWith('{')) {
          return JSON.parse(jsonStr);
        }
        return null;
      } catch (e) {
        console.error("Failed to parse marker JSON:", e);
        return null;
      }
    });

    // Log when the marker changes for debugging
    onMount(() => {
      console.log("MarkerDetails mounted with marker:", props.marker);
    });
    return (() => {
      const _el$ = _tmpl$4$1.cloneNode(true);
      insert(_el$, createComponent(Show, {
        get when() {
          return markerDetails();
        },
        get children() {
          const _el$2 = _tmpl$3$1.cloneNode(true),
            _el$3 = _el$2.firstChild,
            _el$4 = _el$3.nextSibling,
            _el$5 = _el$4.firstChild,
            _el$6 = _el$5.nextSibling;
          insert(_el$6, () => markerDetails()?.state_analysis);
          insert(_el$2, createComponent(Show, {
            get when() {
              return markerDetails()?.explanation;
            },
            get children() {
              const _el$7 = _tmpl$$7.cloneNode(true),
                _el$8 = _el$7.firstChild,
                _el$9 = _el$8.nextSibling;
              insert(_el$9, () => markerDetails()?.explanation);
              return _el$7;
            }
          }), null);
          insert(_el$2, createComponent(Show, {
            get when() {
              return createMemo(() => !!markerDetails()?.commands)() && markerDetails()?.commands.length > 0;
            },
            get children() {
              const _el$10 = _tmpl$2$2.cloneNode(true),
                _el$11 = _el$10.firstChild,
                _el$12 = _el$11.nextSibling;
              insert(_el$12, () => markerDetails()?.commands.map(cmd => (() => {
                const _el$13 = _tmpl$7$1.cloneNode(true),
                  _el$14 = _el$13.firstChild,
                  _el$15 = _el$14.nextSibling;
                insert(_el$14, () => cmd.keystrokes);
                insert(_el$15, createComponent(Show, {
                  get when() {
                    return cmd.is_blocking;
                  },
                  get children() {
                    return _tmpl$5$1.cloneNode(true);
                  }
                }), null);
                insert(_el$15, createComponent(Show, {
                  get when() {
                    return cmd.timeout_sec;
                  },
                  get children() {
                    const _el$17 = _tmpl$6$1.cloneNode(true),
                      _el$18 = _el$17.firstChild,
                      _el$20 = _el$18.nextSibling;
                      _el$20.nextSibling;
                    insert(_el$17, () => cmd.timeout_sec, _el$20);
                    return _el$17;
                  }
                }), null);
                return _el$13;
              })()));
              return _el$10;
            }
          }), null);
          return _el$2;
        }
      }));
      return _el$;
    })();
  });

  const _tmpl$$6 = /*#__PURE__*/template(`<div class="ap-no-marker"><p>No marker selected</p></div>`),
    _tmpl$2$1 = /*#__PURE__*/template(`<div class="ap-timeline"><button class="ap-timeline-toggle"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor"></path></svg></button><div class="ap-timeline-container"></div></div>`);
  var Timeline = (props => {
    const [isVisible, setIsVisible] = createSignal(true);
    const [isTransitioning, setIsTransitioning] = createSignal(false);
    const markers = createMemo(() => typeof props.duration === "number" ? props.markers.filter(m => m[0] < props.duration) : []);
    const [selectedMarker, setSelectedMarker] = createSignal(null);

    // Create a reactive memo for the current marker based on playback position
    const currentMarker = createMemo(() => {
      if (typeof props.currentTime !== "number") return null;
      const currentTime = props.currentTime;
      let marker = null;

      // Find the most recent marker that has been passed
      for (let i = 0; i < markers().length; i++) {
        const m = markers()[i];
        if (m[0] <= currentTime) {
          marker = m;
        } else {
          break;
        }
      }
      return marker;
    });

    // Update selected marker when current marker changes with transition
    createMemo(() => {
      const marker = currentMarker();
      if (marker) {
        setIsTransitioning(true);
        setTimeout(() => {
          setSelectedMarker(marker);
          setTimeout(() => {
            setIsTransitioning(false);
          }, 50); // Short delay to ensure the new content is rendered
        }, 300); // Match the CSS transition duration
      }
    });

    const toggleVisibility = () => {
      setIsVisible(!isVisible());
    };
    return (() => {
      const _el$ = _tmpl$2$1.cloneNode(true),
        _el$2 = _el$.firstChild,
        _el$3 = _el$2.firstChild,
        _el$4 = _el$3.firstChild,
        _el$5 = _el$2.nextSibling;
      _el$2.$$click = toggleVisibility;
      insert(_el$5, createComponent(Show, {
        get when() {
          return selectedMarker();
        },
        get children() {
          return createComponent(MarkerDetails, {
            get marker() {
              return selectedMarker();
            }
          });
        }
      }), null);
      insert(_el$5, createComponent(Show, {
        get when() {
          return !selectedMarker();
        },
        get children() {
          return _tmpl$$6.cloneNode(true);
        }
      }), null);
      createRenderEffect(_p$ => {
        const _v$ = !isVisible(),
          _v$2 = isVisible() ? "Hide sidebar" : "Show sidebar",
          _v$3 = isVisible() ? "M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" : "M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z",
          _v$4 = !!isTransitioning();
        _v$ !== _p$._v$ && _el$.classList.toggle("ap-timeline-hidden", _p$._v$ = _v$);
        _v$2 !== _p$._v$2 && setAttribute(_el$2, "title", _p$._v$2 = _v$2);
        _v$3 !== _p$._v$3 && setAttribute(_el$4, "d", _p$._v$3 = _v$3);
        _v$4 !== _p$._v$4 && _el$5.classList.toggle("ap-transitioning", _p$._v$4 = _v$4);
        return _p$;
      }, {
        _v$: undefined,
        _v$2: undefined,
        _v$3: undefined,
        _v$4: undefined
      });
      return _el$;
    })();
  });
  delegateEvents(["click"]);

  const _tmpl$$5 = /*#__PURE__*/template(`<div class="ap-overlay ap-overlay-error"><span>💥</span></div>`);
  var ErrorOverlay = (props => {
    return _tmpl$$5.cloneNode(true);
  });

  const _tmpl$$4 = /*#__PURE__*/template(`<div class="ap-overlay ap-overlay-loading"><span class="ap-loader"></span></div>`);
  var LoaderOverlay = (props => {
    return _tmpl$$4.cloneNode(true);
  });

  const _tmpl$$3 = /*#__PURE__*/template(`<div class="ap-overlay ap-overlay-info"><span></span></div>`);
  var InfoOverlay = (props => {
    const style$1 = () => {
      return {
        "font-family": props.fontFamily
      };
    };
    return (() => {
      const _el$ = _tmpl$$3.cloneNode(true),
        _el$2 = _el$.firstChild;
      insert(_el$2, () => props.message);
      createRenderEffect(_$p => style(_el$2, style$1(), _$p));
      return _el$;
    })();
  });

  const _tmpl$$2 = /*#__PURE__*/template(`<div class="ap-overlay ap-overlay-start"><div class="ap-play-button"><div><span><svg version="1.1" viewBox="0 0 1000.0 1000.0" class="ap-icon"><defs><mask id="small-triangle-mask"><rect width="100%" height="100%" fill="white"></rect><polygon points="700.0 500.0, 400.00000000000006 326.7949192431122, 399.9999999999999 673.2050807568877" fill="black"></polygon></mask></defs><polygon points="1000.0 500.0, 250.0000000000001 66.98729810778059, 249.99999999999977 933.0127018922192" mask="url(#small-triangle-mask)" fill="white" class="ap-play-btn-fill"></polygon><polyline points="673.2050807568878 400.0, 326.7949192431123 600.0" stroke="white" stroke-width="90" class="ap-play-btn-stroke"></polyline></svg></span></div></div></div>`);
  var StartOverlay = (props => {
    const e = f => {
      return e => {
        e.preventDefault();
        f(e);
      };
    };
    return (() => {
      const _el$ = _tmpl$$2.cloneNode(true);
      addEventListener(_el$, "click", e(props.onClick), true);
      return _el$;
    })();
  });
  delegateEvents(["click"]);

  const _tmpl$$1 = /*#__PURE__*/template(`<li><kbd>space</kbd> - pause / resume</li>`),
    _tmpl$2 = /*#__PURE__*/template(`<li><kbd>←</kbd> / <kbd>→</kbd> - rewind / fast-forward by 5 seconds</li>`),
    _tmpl$3 = /*#__PURE__*/template(`<li><kbd>Shift</kbd> + <kbd>←</kbd> / <kbd>→</kbd> - rewind / fast-forward by 10%</li>`),
    _tmpl$4 = /*#__PURE__*/template(`<li><kbd>[</kbd> / <kbd>]</kbd> - jump to the previous / next marker</li>`),
    _tmpl$5 = /*#__PURE__*/template(`<li><kbd>0</kbd>, <kbd>1</kbd>, <kbd>2</kbd> ... <kbd>9</kbd> - jump to 0%, 10%, 20% ... 90%</li>`),
    _tmpl$6 = /*#__PURE__*/template(`<li><kbd>,</kbd> / <kbd>.</kbd> - step back / forward, a frame at a time (when paused)</li>`),
    _tmpl$7 = /*#__PURE__*/template(`<div class="ap-overlay ap-overlay-help"><div><div><p>Keyboard shortcuts</p><ul><li><kbd>f</kbd> - toggle fullscreen mode</li><li><kbd>?</kbd> - toggle this help popup</li></ul></div></div></div>`);
  var HelpOverlay = (props => {
    const style$1 = () => {
      return {
        "font-family": props.fontFamily
      };
    };
    const e = f => {
      return e => {
        e.preventDefault();
        f(e);
      };
    };
    return (() => {
      const _el$ = _tmpl$7.cloneNode(true),
        _el$2 = _el$.firstChild,
        _el$3 = _el$2.firstChild,
        _el$4 = _el$3.firstChild,
        _el$5 = _el$4.nextSibling,
        _el$12 = _el$5.firstChild;
      addEventListener(_el$, "click", e(props.onClose), true);
      _el$2.$$click = e => {
        e.stopPropagation();
      };
      insert(_el$5, createComponent(Show, {
        get when() {
          return props.isPausable;
        },
        get children() {
          return _tmpl$$1.cloneNode(true);
        }
      }), _el$12);
      insert(_el$5, createComponent(Show, {
        get when() {
          return props.isSeekable;
        },
        get children() {
          return [_tmpl$2.cloneNode(true), _tmpl$3.cloneNode(true), _tmpl$4.cloneNode(true), _tmpl$5.cloneNode(true), _tmpl$6.cloneNode(true)];
        }
      }), _el$12);
      createRenderEffect(_$p => style(_el$, style$1(), _$p));
      return _el$;
    })();
  });
  delegateEvents(["click"]);

  const _tmpl$ = /*#__PURE__*/template(`<div class="ap-wrapper" tabindex="-1"><div><div class="ap-terminal-container"></div></div></div>`);
  const CONTROL_BAR_HEIGHT = 32; // must match height of div.ap-control-bar in CSS

  var Player = (props => {
    const logger = props.logger;
    const core = props.core;
    const autoPlay = props.autoPlay;
    const [state, setState] = createStore({
      lines: [],
      cursor: undefined,
      charW: props.charW,
      charH: props.charH,
      bordersW: props.bordersW,
      bordersH: props.bordersH,
      containerW: 0,
      containerH: 0,
      isPausable: true,
      isSeekable: true,
      isFullscreen: false,
      currentTime: null,
      remainingTime: null,
      progress: null,
      blink: true,
      cursorHold: false
    });
    const [isPlaying, setIsPlaying] = createSignal(false);
    const [overlay, setOverlay] = createSignal(!autoPlay ? "start" : null);
    const [infoMessage, setInfoMessage] = createSignal(null);
    const [terminalSize, setTerminalSize] = createSignal({
      cols: props.cols,
      rows: props.rows
    }, {
      equals: (newVal, oldVal) => newVal.cols === oldVal.cols && newVal.rows === oldVal.rows
    });
    const [duration, setDuration] = createSignal(undefined);
    const [markers, setMarkers] = createStore([]);
    const [userActive, setUserActive] = createSignal(false);
    const [isHelpVisible, setIsHelpVisible] = createSignal(false);
    const [originalTheme, setOriginalTheme] = createSignal(undefined);
    const terminalCols = createMemo(() => terminalSize().cols || 80);
    const terminalRows = createMemo(() => terminalSize().rows || 24);
    const controlBarHeight = () => props.controls === false ? 0 : CONTROL_BAR_HEIGHT;
    const controlsVisible = () => props.controls === true || props.controls === "auto" && userActive();
    let frameRequestId;
    let userActivityTimeoutId;
    let timeUpdateIntervalId;
    let blinkIntervalId;
    let wrapperRef;
    let playerRef;
    let terminalRef;
    let controlBarRef;
    let resizeObserver;
    function onPlaying() {
      updateTerminal();
      startBlinking();
      startTimeUpdates();
    }
    function onStopped() {
      stopBlinking();
      stopTimeUpdates();
      updateTime();
    }
    function resize(size_) {
      batch(() => {
        if (size_.rows < terminalSize().rows) {
          setState("lines", state.lines.slice(0, size_.rows));
        }
        setTerminalSize(size_);
      });
    }
    function setPoster(poster) {
      if (poster !== null && !autoPlay) {
        setState({
          lines: poster.lines,
          cursor: poster.cursor
        });
      }
    }
    let resolveCoreReady;
    new Promise(resolve => {
      resolveCoreReady = resolve;
    });
    core.addEventListener("ready", _ref => {
      let {
        isPausable,
        isSeekable,
        poster
      } = _ref;
      setState({
        isPausable,
        isSeekable
      });
      setPoster(poster);
      resolveCoreReady();
    });
    core.addEventListener("metadata", _ref2 => {
      let {
        cols,
        rows,
        duration,
        theme,
        poster,
        markers
      } = _ref2;
      batch(() => {
        resize({
          cols,
          rows
        });
        setDuration(duration);
        setOriginalTheme(theme);
        setMarkers(markers);
        setPoster(poster);
      });
    });
    core.addEventListener("play", () => {
      setOverlay(null);
    });
    core.addEventListener("playing", () => {
      batch(() => {
        setIsPlaying(true);
        setOverlay(null);
        onPlaying();
      });
    });
    core.addEventListener("idle", () => {
      batch(() => {
        setIsPlaying(false);
        onStopped();
      });
    });
    core.addEventListener("loading", () => {
      batch(() => {
        setIsPlaying(false);
        onStopped();
        setOverlay("loader");
      });
    });
    core.addEventListener("offline", _ref3 => {
      let {
        message
      } = _ref3;
      batch(() => {
        setIsPlaying(false);
        onStopped();
        if (message !== undefined) {
          setInfoMessage(message);
          setOverlay("info");
        }
      });
    });
    let renderCount = 0;
    core.addEventListener("ended", _ref4 => {
      let {
        message
      } = _ref4;
      batch(() => {
        setIsPlaying(false);
        onStopped();
        if (message !== undefined) {
          setInfoMessage(message);
          setOverlay("info");
        }
      });
      logger.debug(`view: render count: ${renderCount}`);
    });
    core.addEventListener("errored", () => {
      setOverlay("error");
    });
    core.addEventListener("resize", resize);
    core.addEventListener("reset", _ref5 => {
      let {
        cols,
        rows,
        theme
      } = _ref5;
      batch(() => {
        resize({
          cols,
          rows
        });
        setOriginalTheme(theme);
        updateTerminal();
      });
    });
    core.addEventListener("seeked", () => {
      updateTime();
    });
    core.addEventListener("terminalUpdate", () => {
      if (frameRequestId === undefined) {
        frameRequestId = requestAnimationFrame(updateTerminal);
      }
    });
    const setupResizeObserver = () => {
      resizeObserver = new ResizeObserver(debounce(_entries => {
        setState({
          containerW: wrapperRef.offsetWidth,
          containerH: wrapperRef.offsetHeight
        });
        wrapperRef.dispatchEvent(new CustomEvent("resize", {
          detail: {
            el: playerRef
          }
        }));
      }, 10));
      resizeObserver.observe(wrapperRef);
    };
    onMount(async () => {
      logger.info("view: mounted");
      logger.debug("view: font measurements", {
        charW: state.charW,
        charH: state.charH
      });
      setupResizeObserver();
      setState({
        containerW: wrapperRef.offsetWidth,
        containerH: wrapperRef.offsetHeight
      });
    });
    onCleanup(() => {
      core.stop();
      stopBlinking();
      stopTimeUpdates();
      resizeObserver.disconnect();
    });
    const updateTerminal = async () => {
      const changes = await core.getChanges();
      batch(() => {
        if (changes.lines !== undefined) {
          changes.lines.forEach((line, i) => {
            setState("lines", i, reconcile(line));
          });
        }
        if (changes.cursor !== undefined) {
          setState("cursor", reconcile(changes.cursor));
        }
        setState("cursorHold", true);
      });
      frameRequestId = undefined;
      renderCount += 1;
    };
    const terminalElementSize = createMemo(() => {
      const terminalW = state.charW * terminalCols() + state.bordersW;
      const terminalH = state.charH * terminalRows() + state.bordersH;
      let fit = props.fit ?? "width";
      if (fit === "both" || state.isFullscreen) {
        const containerRatio = state.containerW / (state.containerH - controlBarHeight());
        const terminalRatio = terminalW / terminalH;
        if (containerRatio > terminalRatio) {
          fit = "height";
        } else {
          fit = "width";
        }
      }
      if (fit === false || fit === "none") {
        return {};
      } else if (fit === "width") {
        const scale = state.containerW / terminalW;
        return {
          scale: scale,
          width: state.containerW,
          height: terminalH * scale + controlBarHeight()
        };
      } else if (fit === "height") {
        const scale = (state.containerH - controlBarHeight()) / terminalH;
        return {
          scale: scale,
          width: terminalW * scale,
          height: state.containerH
        };
      } else {
        throw `unsupported fit mode: ${fit}`;
      }
    });
    const onFullscreenChange = () => {
      setState("isFullscreen", document.fullscreenElement ?? document.webkitFullscreenElement);
    };
    const toggleFullscreen = () => {
      if (state.isFullscreen) {
        (document.exitFullscreen ?? document.webkitExitFullscreen ?? (() => {})).apply(document);
      } else {
        (wrapperRef.requestFullscreen ?? wrapperRef.webkitRequestFullscreen ?? (() => {})).apply(wrapperRef);
      }
    };
    const toggleHelp = () => {
      if (isHelpVisible()) {
        setIsHelpVisible(false);
      } else {
        core.pause();
        setIsHelpVisible(true);
      }
    };
    const onKeyDown = e => {
      if (e.altKey || e.metaKey || e.ctrlKey) {
        return;
      }
      if (e.key == " ") {
        core.togglePlay();
      } else if (e.key == ",") {
        core.step(-1);
        updateTime();
      } else if (e.key == ".") {
        core.step();
        updateTime();
      } else if (e.key == "f") {
        toggleFullscreen();
      } else if (e.key == "[") {
        core.seek({
          marker: "prev"
        });
      } else if (e.key == "]") {
        core.seek({
          marker: "next"
        });
      } else if (e.key.charCodeAt(0) >= 48 && e.key.charCodeAt(0) <= 57) {
        const pos = (e.key.charCodeAt(0) - 48) / 10;
        core.seek(`${pos * 100}%`);
      } else if (e.key == "?") {
        toggleHelp();
      } else if (e.key == "ArrowLeft") {
        if (e.shiftKey) {
          core.seek("<<<");
        } else {
          core.seek("<<");
        }
      } else if (e.key == "ArrowRight") {
        if (e.shiftKey) {
          core.seek(">>>");
        } else {
          core.seek(">>");
        }
      } else if (e.key == "Escape") {
        setIsHelpVisible(false);
      } else {
        return;
      }
      e.stopPropagation();
      e.preventDefault();
    };
    const wrapperOnMouseMove = () => {
      if (state.isFullscreen) {
        onUserActive(true);
      }
    };
    const playerOnMouseLeave = () => {
      if (!state.isFullscreen) {
        onUserActive(false);
      }
    };
    const startTimeUpdates = () => {
      timeUpdateIntervalId = setInterval(updateTime, 100);
    };
    const stopTimeUpdates = () => {
      clearInterval(timeUpdateIntervalId);
    };
    const updateTime = async () => {
      const currentTime = await core.getCurrentTime();
      const remainingTime = await core.getRemainingTime();
      const progress = await core.getProgress();
      setState({
        currentTime,
        remainingTime,
        progress
      });
    };
    const startBlinking = () => {
      blinkIntervalId = setInterval(() => {
        setState(state => {
          const changes = {
            blink: !state.blink
          };
          if (changes.blink) {
            changes.cursorHold = false;
          }
          return changes;
        });
      }, 500);
    };
    const stopBlinking = () => {
      clearInterval(blinkIntervalId);
      setState("blink", true);
    };
    const onUserActive = show => {
      clearTimeout(userActivityTimeoutId);
      if (show) {
        userActivityTimeoutId = setTimeout(() => onUserActive(false), 2000);
      }
      setUserActive(show);
    };
    const theme = createMemo(() => {
      const name = props.theme || "auto/asciinema";
      if (name.slice(0, 5) === "auto/") {
        return {
          name: name.slice(5),
          colors: originalTheme()
        };
      } else {
        return {
          name
        };
      }
    });
    const playerStyle = () => {
      const style = {};
      if ((props.fit === false || props.fit === "none") && props.terminalFontSize !== undefined) {
        if (props.terminalFontSize === "small") {
          style["font-size"] = "12px";
        } else if (props.terminalFontSize === "medium") {
          style["font-size"] = "18px";
        } else if (props.terminalFontSize === "big") {
          style["font-size"] = "24px";
        } else {
          style["font-size"] = props.terminalFontSize;
        }
      }
      const size = terminalElementSize();
      if (size.width !== undefined) {
        style["width"] = `${size.width}px`;
        style["height"] = `${size.height}px`;
      }
      const themeColors = theme().colors;
      if (themeColors) {
        style["--term-color-foreground"] = themeColors.foreground;
        style["--term-color-background"] = themeColors.background;
        themeColors.palette.forEach((color, i) => {
          style[`--term-color-${i}`] = color;
        });
      }
      return style;
    };
    const playerClass = () => `ap-player asciinema-player-theme-${theme().name}`;
    const terminalScale = () => terminalElementSize()?.scale;
    const seek = where => {
      core.seek(where);
    };
    const togglePlay = () => {
      core.togglePlay();
    };
    const el = (() => {
      const _el$ = _tmpl$.cloneNode(true),
        _el$2 = _el$.firstChild,
        _el$3 = _el$2.firstChild;
      const _ref$ = wrapperRef;
      typeof _ref$ === "function" ? use(_ref$, _el$) : wrapperRef = _el$;
      _el$.addEventListener("webkitfullscreenchange", onFullscreenChange);
      _el$.addEventListener("fullscreenchange", onFullscreenChange);
      _el$.$$mousemove = wrapperOnMouseMove;
      _el$.$$keydown = onKeyDown;
      const _ref$2 = playerRef;
      typeof _ref$2 === "function" ? use(_ref$2, _el$2) : playerRef = _el$2;
      _el$2.$$mousemove = () => onUserActive(true);
      _el$2.addEventListener("mouseleave", playerOnMouseLeave);
      insert(_el$3, createComponent(Terminal, {
        get cols() {
          return terminalCols();
        },
        get rows() {
          return terminalRows();
        },
        get scale() {
          return terminalScale();
        },
        get blink() {
          return state.blink;
        },
        get lines() {
          return state.lines;
        },
        get cursor() {
          return state.cursor;
        },
        get cursorHold() {
          return state.cursorHold;
        },
        get fontFamily() {
          return props.terminalFontFamily;
        },
        get lineHeight() {
          return props.terminalLineHeight;
        },
        ref(r$) {
          const _ref$3 = terminalRef;
          typeof _ref$3 === "function" ? _ref$3(r$) : terminalRef = r$;
        }
      }), null);
      insert(_el$3, createComponent(Show, {
        get when() {
          return markers.length > 0;
        },
        get children() {
          return createComponent(Timeline, {
            get duration() {
              return duration();
            },
            get currentTime() {
              return state.currentTime;
            },
            markers: markers,
            onSeekClick: seek
          });
        }
      }), null);
      insert(_el$2, createComponent(Show, {
        get when() {
          return props.controls !== false;
        },
        get children() {
          return createComponent(ControlBar, {
            get duration() {
              return duration();
            },
            get currentTime() {
              return state.currentTime;
            },
            get remainingTime() {
              return state.remainingTime;
            },
            get progress() {
              return state.progress;
            },
            markers: markers,
            get isPlaying() {
              return isPlaying();
            },
            get isPausable() {
              return state.isPausable;
            },
            get isSeekable() {
              return state.isSeekable;
            },
            onPlayClick: togglePlay,
            onFullscreenClick: toggleFullscreen,
            onHelpClick: toggleHelp,
            onSeekClick: seek,
            ref(r$) {
              const _ref$4 = controlBarRef;
              typeof _ref$4 === "function" ? _ref$4(r$) : controlBarRef = r$;
            }
          });
        }
      }), null);
      insert(_el$2, createComponent(Switch, {
        get children() {
          return [createComponent(Match, {
            get when() {
              return overlay() == "start";
            },
            get children() {
              return createComponent(StartOverlay, {
                onClick: play
              });
            }
          }), createComponent(Match, {
            get when() {
              return overlay() == "loader";
            },
            get children() {
              return createComponent(LoaderOverlay, {});
            }
          }), createComponent(Match, {
            get when() {
              return overlay() == "info";
            },
            get children() {
              return createComponent(InfoOverlay, {
                get message() {
                  return infoMessage();
                },
                get fontFamily() {
                  return props.terminalFontFamily;
                }
              });
            }
          }), createComponent(Match, {
            get when() {
              return overlay() == "error";
            },
            get children() {
              return createComponent(ErrorOverlay, {});
            }
          })];
        }
      }), null);
      insert(_el$2, createComponent(Show, {
        get when() {
          return isHelpVisible();
        },
        get children() {
          return createComponent(HelpOverlay, {
            get fontFamily() {
              return props.terminalFontFamily;
            },
            onClose: () => setIsHelpVisible(false),
            get isPausable() {
              return state.isPausable;
            },
            get isSeekable() {
              return state.isSeekable;
            }
          });
        }
      }), null);
      createRenderEffect(_p$ => {
        const _v$ = !!controlsVisible(),
          _v$2 = playerClass(),
          _v$3 = playerStyle();
        _v$ !== _p$._v$ && _el$.classList.toggle("ap-hud", _p$._v$ = _v$);
        _v$2 !== _p$._v$2 && className(_el$2, _p$._v$2 = _v$2);
        _p$._v$3 = style(_el$2, _v$3, _p$._v$3);
        return _p$;
      }, {
        _v$: undefined,
        _v$2: undefined,
        _v$3: undefined
      });
      return _el$;
    })();
    return el;
  });
  delegateEvents(["keydown", "mousemove"]);

  function mount(core, elem) {
    let opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const metrics = measureTerminal(opts.terminalFontFamily, opts.terminalLineHeight);
    const props = {
      core: core,
      logger: opts.logger,
      cols: opts.cols,
      rows: opts.rows,
      fit: opts.fit,
      controls: opts.controls,
      autoPlay: opts.autoPlay,
      terminalFontSize: opts.terminalFontSize,
      terminalFontFamily: opts.terminalFontFamily,
      terminalLineHeight: opts.terminalLineHeight,
      theme: opts.theme,
      ...metrics
    };
    let el;
    const dispose = render(() => {
      el = createComponent(Player, props);
      return el;
    }, elem);
    return {
      el: el,
      dispose: dispose
    };
  }
  function measureTerminal(fontFamily, lineHeight) {
    const cols = 80;
    const rows = 24;
    const div = document.createElement("div");
    div.style.height = "0px";
    div.style.overflow = "hidden";
    div.style.fontSize = "15px"; // must match font-size of div.asciinema-player in CSS
    document.body.appendChild(div);
    let el;
    const dispose = render(() => {
      el = createComponent(Terminal, {
        cols: cols,
        rows: rows,
        lineHeight: lineHeight,
        fontFamily: fontFamily,
        lines: []
      });
      return el;
    }, div);
    const metrics = {
      charW: el.clientWidth / cols,
      charH: el.clientHeight / rows,
      bordersW: el.offsetWidth - el.clientWidth,
      bordersH: el.offsetHeight - el.clientHeight
    };
    dispose();
    document.body.removeChild(div);
    return metrics;
  }

  const CORE_OPTS = ['autoPlay', 'autoplay', 'cols', 'idleTimeLimit', 'loop', 'markers', 'pauseOnMarkers', 'poster', 'preload', 'rows', 'speed', 'startAt'];
  const UI_OPTS = ['autoPlay', 'autoplay', 'cols', 'controls', 'fit', 'rows', 'terminalFontFamily', 'terminalFontSize', 'terminalLineHeight', 'theme'];
  function coreOpts(inputOpts) {
    let overrides = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    const opts = Object.fromEntries(Object.entries(inputOpts).filter(_ref => {
      let [key] = _ref;
      return CORE_OPTS.includes(key);
    }));
    opts.autoPlay ??= opts.autoplay;
    opts.speed ??= 1.0;
    return {
      ...opts,
      ...overrides
    };
  }
  function uiOpts(inputOpts) {
    let overrides = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    const opts = Object.fromEntries(Object.entries(inputOpts).filter(_ref2 => {
      let [key] = _ref2;
      return UI_OPTS.includes(key);
    }));
    opts.autoPlay ??= opts.autoplay;
    opts.controls ??= "auto";
    return {
      ...opts,
      ...overrides
    };
  }

  function create(src, elem) {
    let opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const logger = opts.logger ?? new DummyLogger();
    const core = new Core(src, coreOpts(opts, {
      logger
    }));
    const {
      el,
      dispose
    } = mount(core, elem, uiOpts(opts, {
      logger
    }));
    const ready = core.init();
    const player = {
      el,
      dispose,
      getCurrentTime: () => ready.then(core.getCurrentTime.bind(core)),
      getDuration: () => ready.then(core.getDuration.bind(core)),
      play: () => ready.then(core.play.bind(core)),
      pause: () => ready.then(core.pause.bind(core)),
      seek: pos => ready.then(() => core.seek(pos))
    };
    player.addEventListener = (name, callback) => {
      return core.addEventListener(name, callback.bind(player));
    };
    return player;
  }

  exports.create = create;

  return exports;

})({});
