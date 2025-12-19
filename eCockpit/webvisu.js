// CAS: "1.0.0"
// This software uses the following Open Source software:
// - a simplified (and thus modified) version of stringencoding
//	* Licensed under Apache License 2.0 (can be found here: http://www.apache.org/licenses/)
//	* Source: http://code.google.com/p/stringencoding/

var k, aa, ba;
(function() {
    function a(u) {
        var x = 0;
        this.get = function() {
            return x >= u.length ? -1 : Number(u[x])
        };
        this.offset = function(z) {
            x += z;
            if (0 > x) throw Error("Seeking past start of the buffer");
            if (x > u.length) throw Error("Seeking past EOF");
        }
    }

    function b(u) {
        var x = 0;
        this.get = function() {
            return x >= u.length ? -1 : u[x]
        };
        this.offset = function(z) {
            x += z;
            if (0 > x) throw Error("Seeking past start of the buffer");
            if (x > u.length) throw Error("Seeking past EOF");
        }
    }

    function c(u) {
        var x = 0;
        this.b = function(z) {
            var B = -1,
                N;
            for (N = 0; N < arguments.length; ++N) B = Number(arguments[N]),
                u[x++] = B;
            return B
        }
    }

    function d(u) {
        var x = 0,
            z = function() {
                for (var B = [], N = 0, L = u.length; N < u.length;) {
                    var ha = u.charCodeAt(N);
                    if (55296 <= ha && 57343 >= ha)
                        if (56320 <= ha && 57343 >= ha) B.push(65533);
                        else if (N === L - 1) B.push(65533);
                    else {
                        var Ra = u.charCodeAt(N + 1);
                        56320 <= Ra && 57343 >= Ra ? (ha &= 1023, Ra &= 1023, N += 1, B.push(65536 + (ha << 10) + Ra)) : B.push(65533)
                    } else B.push(ha);
                    N += 1
                }
                return B
            }();
        this.offset = function(B) {
            x += B;
            if (0 > x) throw Error("Seeking past start of the buffer");
            if (x > z.length) throw Error("Seeking past EOF");
        };
        this.get = function() {
            return x >=
                z.length ? -1 : z[x]
        }
    }

    function e() {
        var u = "";
        this.i = function() {
            return u
        };
        this.b = function(x) {
            65535 >= x ? u += String.fromCharCode(x) : (x -= 65536, u += String.fromCharCode(55296 + (x >> 10 & 1023)), u += String.fromCharCode(56320 + (x & 1023)))
        }
    }

    function f(u) {
        u = String(u).trim().toLowerCase();
        if (Object.prototype.hasOwnProperty.call(r, u)) return r[u];
        throw Error("EncodingError: Unknown encoding: " + u);
    }

    function g(u, x) {
        var z = x.fatal;
        this.decode = function(B) {
            var N = B.get();
            if (-1 === N) return -1;
            B.offset(1);
            if (0 <= N && 127 >= N) return N;
            B = u[N -
                128];
            if (null === B) {
                if (z) throw Error("EncodingError");
                B = 65533
            }
            return B
        }
    }

    function h(u) {
        this.encode = function(x, z) {
            var B = z.get();
            if (-1 === B) return -1;
            z.offset(1);
            if (0 <= B && 127 >= B) return x.b(B);
            z = u.indexOf(B);
            z = -1 === z ? null : z;
            if (null === z) throw Error("EncodingError");
            return x.b(z + 128)
        }
    }
    var l = {},
        r = {};
    [{
        encodings: [{
                labels: "csisolatin2 iso-8859-2 iso-ir-101 iso8859-2 iso_8859-2 l2 latin2".split(" "),
                name: "iso-8859-2"
            }, {
                labels: "csisolatin3 iso-8859-3 iso_8859-3 iso-ir-109 l3 latin3".split(" "),
                name: "iso-8859-3"
            },
            {
                labels: "csisolatin4 iso-8859-4 iso_8859-4 iso-ir-110 l4 latin4".split(" "),
                name: "iso-8859-4"
            }, {
                labels: ["csisolatincyrillic", "cyrillic", "iso-8859-5", "iso_8859-5", "iso-ir-144"],
                name: "iso-8859-5"
            }, {
                labels: "arabic csisolatinarabic ecma-114 iso-8859-6 iso_8859-6 iso-ir-127".split(" "),
                name: "iso-8859-6"
            }, {
                labels: "csisolatingreek ecma-118 elot_928 greek greek8 iso-8859-7 iso_8859-7 iso-ir-126".split(" "),
                name: "iso-8859-7"
            }, {
                labels: "csisolatinhebrew hebrew iso-8859-8 iso-8859-8-i iso-ir-138 iso_8859-8 visual".split(" "),
                name: "iso-8859-8"
            }, {
                labels: "csisolatin6 iso-8859-10 iso-ir-157 iso8859-10 l6 latin6".split(" "),
                name: "iso-8859-10"
            }, {
                labels: ["iso-8859-13"],
                name: "iso-8859-13"
            }, {
                labels: ["iso-8859-14", "iso8859-14"],
                name: "iso-8859-14"
            }, {
                labels: ["iso-8859-15", "iso_8859-15"],
                name: "iso-8859-15"
            }, {
                labels: ["iso-8859-16"],
                name: "iso-8859-16"
            }, {
                labels: "ascii ansi_x3.4-1968 csisolatin1 iso-8859-1 iso8859-1 iso_8859-1 l1 latin1 us-ascii windows-1252".split(" "),
                name: "windows-1252"
            }
        ],
        heading: "Legacy single-byte encodings"
    }].forEach(function(u) {
        u.encodings.forEach(function(x) {
            l[x.name] =
                x;
            x.labels.forEach(function(z) {
                r[z] = x
            })
        })
    });
    var v = {
        "iso-8859-2": [128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 260, 728, 321, 164, 317, 346, 167, 168, 352, 350, 356, 377, 173, 381, 379, 176, 261, 731, 322, 180, 318, 347, 711, 184, 353, 351, 357, 378, 733, 382, 380, 340, 193, 194, 258, 196, 313, 262, 199, 268, 201, 280, 203, 282, 205, 206, 270, 272, 323, 327, 211, 212, 336, 214, 215, 344, 366, 218, 368, 220, 221, 354, 223, 341, 225, 226, 259, 228, 314, 263, 231, 269, 233, 281, 235, 283,
            237, 238, 271, 273, 324, 328, 243, 244, 337, 246, 247, 345, 367, 250, 369, 252, 253, 355, 729
        ],
        "iso-8859-3": [128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 294, 728, 163, 164, null, 292, 167, 168, 304, 350, 286, 308, 173, null, 379, 176, 295, 178, 179, 180, 181, 293, 183, 184, 305, 351, 287, 309, 189, null, 380, 192, 193, 194, null, 196, 266, 264, 199, 200, 201, 202, 203, 204, 205, 206, 207, null, 209, 210, 211, 212, 288, 214, 215, 284, 217, 218, 219, 220, 364, 348, 223, 224, 225, 226, null, 228,
            267, 265, 231, 232, 233, 234, 235, 236, 237, 238, 239, null, 241, 242, 243, 244, 289, 246, 247, 285, 249, 250, 251, 252, 365, 349, 729
        ],
        "iso-8859-4": [128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 260, 312, 342, 164, 296, 315, 167, 168, 352, 274, 290, 358, 173, 381, 175, 176, 261, 731, 343, 180, 297, 316, 711, 184, 353, 275, 291, 359, 330, 382, 331, 256, 193, 194, 195, 196, 197, 198, 302, 268, 201, 280, 203, 278, 205, 206, 298, 272, 325, 332, 310, 212, 213, 214, 215, 216, 370, 218, 219, 220, 360, 362,
            223, 257, 225, 226, 227, 228, 229, 230, 303, 269, 233, 281, 235, 279, 237, 238, 299, 273, 326, 333, 311, 244, 245, 246, 247, 248, 371, 250, 251, 252, 361, 363, 729
        ],
        "iso-8859-5": [128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 1025, 1026, 1027, 1028, 1029, 1030, 1031, 1032, 1033, 1034, 1035, 1036, 173, 1038, 1039, 1040, 1041, 1042, 1043, 1044, 1045, 1046, 1047, 1048, 1049, 1050, 1051, 1052, 1053, 1054, 1055, 1056, 1057, 1058, 1059, 1060, 1061, 1062, 1063, 1064, 1065, 1066, 1067, 1068, 1069,
            1070, 1071, 1072, 1073, 1074, 1075, 1076, 1077, 1078, 1079, 1080, 1081, 1082, 1083, 1084, 1085, 1086, 1087, 1088, 1089, 1090, 1091, 1092, 1093, 1094, 1095, 1096, 1097, 1098, 1099, 1100, 1101, 1102, 1103, 8470, 1105, 1106, 1107, 1108, 1109, 1110, 1111, 1112, 1113, 1114, 1115, 1116, 167, 1118, 1119
        ],
        "iso-8859-6": [128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, null, null, null, 164, null, null, null, null, null, null, null, 1548, 173, null, null, null, null, null, null, null, null, null,
            null, null, null, null, 1563, null, null, null, 1567, null, 1569, 1570, 1571, 1572, 1573, 1574, 1575, 1576, 1577, 1578, 1579, 1580, 1581, 1582, 1583, 1584, 1585, 1586, 1587, 1588, 1589, 1590, 1591, 1592, 1593, 1594, null, null, null, null, null, 1600, 1601, 1602, 1603, 1604, 1605, 1606, 1607, 1608, 1609, 1610, 1611, 1612, 1613, 1614, 1615, 1616, 1617, 1618, null, null, null, null, null, null, null, null, null, null, null, null, null
        ],
        "iso-8859-7": [128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158,
            159, 160, 8216, 8217, 163, 8364, 8367, 166, 167, 168, 169, 890, 171, 172, 173, null, 8213, 176, 177, 178, 179, 900, 901, 902, 183, 904, 905, 906, 187, 908, 189, 910, 911, 912, 913, 914, 915, 916, 917, 918, 919, 920, 921, 922, 923, 924, 925, 926, 927, 928, 929, null, 931, 932, 933, 934, 935, 936, 937, 938, 939, 940, 941, 942, 943, 944, 945, 946, 947, 948, 949, 950, 951, 952, 953, 954, 955, 956, 957, 958, 959, 960, 961, 962, 963, 964, 965, 966, 967, 968, 969, 970, 971, 972, 973, 974, null
        ],
        "iso-8859-8": [128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150,
            151, 152, 153, 154, 155, 156, 157, 158, 159, 160, null, 162, 163, 164, 165, 166, 167, 168, 169, 215, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 247, 187, 188, 189, 190, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 8215, 1488, 1489, 1490, 1491, 1492, 1493, 1494, 1495, 1496, 1497, 1498, 1499, 1500, 1501, 1502, 1503, 1504, 1505, 1506, 1507, 1508, 1509, 1510, 1511, 1512, 1513, 1514, null, null, 8206, 8207, null
        ],
        "iso-8859-10": [128,
            129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 260, 274, 290, 298, 296, 310, 167, 315, 272, 352, 358, 381, 173, 362, 330, 176, 261, 275, 291, 299, 297, 311, 183, 316, 273, 353, 359, 382, 8213, 363, 331, 256, 193, 194, 195, 196, 197, 198, 302, 268, 201, 280, 203, 278, 205, 206, 207, 208, 325, 332, 211, 212, 213, 214, 360, 216, 370, 218, 219, 220, 221, 222, 223, 257, 225, 226, 227, 228, 229, 230, 303, 269, 233, 281, 235, 279, 237, 238, 239, 240, 326, 333, 243, 244, 245, 246, 361, 248, 371, 250, 251, 252, 253,
            254, 312
        ],
        "iso-8859-13": [128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 8221, 162, 163, 164, 8222, 166, 167, 216, 169, 342, 171, 172, 173, 174, 198, 176, 177, 178, 179, 8220, 181, 182, 183, 248, 185, 343, 187, 188, 189, 190, 230, 260, 302, 256, 262, 196, 197, 280, 274, 268, 201, 377, 278, 290, 310, 298, 315, 352, 323, 325, 211, 332, 213, 214, 215, 370, 321, 346, 362, 220, 379, 381, 223, 261, 303, 257, 263, 228, 229, 281, 275, 269, 233, 378, 279, 291, 311, 299, 316, 353, 324, 326, 243, 333, 245, 246,
            247, 371, 322, 347, 363, 252, 380, 382, 8217
        ],
        "iso-8859-14": [128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 7682, 7683, 163, 266, 267, 7690, 167, 7808, 169, 7810, 7691, 7922, 173, 174, 376, 7710, 7711, 288, 289, 7744, 7745, 182, 7766, 7809, 7767, 7811, 7776, 7923, 7812, 7813, 7777, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 372, 209, 210, 211, 212, 213, 214, 7786, 216, 217, 218, 219, 220, 221, 374, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234,
            235, 236, 237, 238, 239, 373, 241, 242, 243, 244, 245, 246, 7787, 248, 249, 250, 251, 252, 253, 375, 255
        ],
        "iso-8859-15": [128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 8364, 165, 352, 167, 353, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 381, 181, 182, 183, 382, 185, 186, 187, 338, 339, 376, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227,
            228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255
        ],
        "iso-8859-16": [128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 260, 261, 321, 8364, 8222, 352, 167, 353, 169, 536, 171, 377, 173, 378, 379, 176, 177, 268, 322, 381, 8221, 182, 183, 382, 269, 537, 187, 338, 339, 376, 380, 192, 193, 194, 258, 196, 262, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 272, 323, 210, 211, 212, 336, 214, 346, 368, 217, 218, 219, 220,
            280, 538, 223, 224, 225, 226, 259, 228, 263, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 273, 324, 242, 243, 244, 337, 246, 347, 369, 249, 250, 251, 252, 281, 539, 255
        ],
        "windows-1252": [8364, 129, 8218, 402, 8222, 8230, 8224, 8225, 710, 8240, 352, 8249, 338, 141, 381, 143, 144, 8216, 8217, 8220, 8221, 8226, 8211, 8212, 732, 8482, 353, 8250, 339, 157, 382, 376, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209,
            210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255
        ]
    };
    (function() {
        "iso-8859-2 iso-8859-3 iso-8859-4 iso-8859-5 iso-8859-6 iso-8859-7 iso-8859-8 iso-8859-10 iso-8859-13 iso-8859-14 iso-8859-15 iso-8859-16 windows-1252".split(" ").forEach(function(u) {
            var x = l[u],
                z = v[u];
            x.cz = function(B) {
                return new g(z, B)
            };
            x.ez = function(B) {
                return new h(z, B)
            }
        })
    })();
    ba = function(u) {
        u = u ? String(u) :
            "utf-8";
        var x = Object(x);
        this.yg = f(u);
        this.Ql = !1;
        this.rf = null;
        this.sl = {
            fatal: !!x.fatal
        };
        Object.defineProperty && Object.defineProperty(this, "encoding", {
            get: function() {
                return this.yg.name
            }
        });
        return this
    };
    ba.prototype = {
        encode: function(u, x) {
            u = u ? String(u) : "";
            x = Object(x);
            this.Ql || (this.rf = this.yg.ez(this.sl));
            this.Ql = !!x.stream;
            x = [];
            var z = new c(x);
            for (u = new d(u); - 1 !== u.get();) this.rf.encode(z, u);
            if (!this.Ql) {
                do var B = this.rf.encode(z, u); while (-1 !== B);
                this.rf = null
            }
            return new Uint8Array(x)
        }
    };
    aa = function(u) {
        u =
            u ? String(u) : "utf-8";
        var x = Object(x);
        this.yg = f(u);
        this.sl = {
            fatal: !!x.fatal
        };
        this.yk = this.yg.cz(this.sl);
        Object.defineProperty && Object.defineProperty(this, "encoding", {
            get: function() {
                return this.yg.name
            }
        });
        return this
    };
    aa.prototype = {
        decode: function(u) {
            if (!u || "buffer" in u && "byteOffset" in u && "byteLength" in u) u || (u = new Uint8Array(0));
            else throw new TypeError("Expected ArrayBufferView");
            u = new Uint8Array(u.buffer, u.byteOffset, u.byteLength);
            return this.fo(new a(u))
        },
        Ly: function(u) {
            if (!u) throw new TypeError("Expected array of bytes");
            return this.fo(new b(u))
        },
        fo: function(u) {
            for (var x = new e, z; - 1 !== u.get();) z = this.yk.decode(u), null !== z && -1 !== z && x.b(z);
            return x.i()
        }
    }
})();
var m;
m = {
    dk: 1,
    cg: 2,
    FB: 3,
    HB: 4,
    GB: 5,
    kn: 5
};
var ca;
ca = function(a) {
    this.a = a
};
ca.prototype = {
    mq: function(a) {
        var b = this;
        return function(c, d, e, f, g, h) {
            c = b.Mt(e, b.a.s.L, c, d, f, a, g);
            return h ? c : b.a.$b(c)
        }
    },
    Mt: function(a, b, c, d, e, f, g) {
        var h, l = 1;
        f = new da(f);
        for (var r; h = e.pop();) r = new da(h.id), r.ck(l), f.ln(r), l += this.it(h.Vq);
        a = new n(a, b, c, d);
        a.sc(f);
        (g instanceof p || g instanceof ea) && a.$a(g);
        return a
    },
    it: function(a) {
        var b = 0;
        do ++b, a >>>= 1; while (0 !== a);
        return b
    }
};
var q;
q = function() {};
q.bd = function() {
    return q.Bj
};
q.$z = function() {
    return q.ws
};
q.OB = function(a) {
    if (t.pa(a) || t.lj(a)) return q.Dd(a);
    if (t.bd(a)) return q.qe(a);
    throw Error("Illegal argument!");
};
q.Dd = function(a) {
    var b = new w(a.offsetX, a.offsetY);
    null !== a.currentTarget && (b = t.Sh(a.currentTarget, b));
    return b
};
q.sj = function(a) {
    var b = new w(a.offsetLeft, a.offsetTop);
    a.offsetParent && (a = q.sj(a.offsetParent), b.c += a.c, b.f += a.f);
    return b
};
q.Fq = !1;
q.qe = function(a) {
    if (!a.pageX || !a.target) return q.Fq || (q.Fq = !0, y.error("Evaluation of Touch events not supported because the browser uses an unexpected interface")), null;
    var b = q.sj(a.target);
    return new w(a.pageX - b.c, a.pageY - b.f)
};
q.Fs = navigator.userAgent.match(/OS 6(_\d)+ like Mac OS X/i);
q.Ms = function() {
    return q.Fs
};
q.tB = function() {
    var a = void 0 !== window.TouchEvent && "ontouchstart" in window && "ontouchend" in document;
    return void 0 !== window.PointerEvent && void 0 !== navigator.maxTouchPoints && 0 < navigator.maxTouchPoints || a
};
q.mB = function(a) {
    return t.sj(a.RuntimeVersion)
};
q.jB = function() {
    return void 0 !== window.atob && void 0 !== window.crypto && void 0 !== window.crypto.subtle
};
q.tj = function(a, b) {
    a.style.cssText += "outline: none; -webkit-tap-highlight-color: rgba(0,0,0,0);";
    b && (a.style.cssText += "display:block;");
    a.addEventListener("MSHoldVisual", function(c) {
        c.preventDefault()
    })
};
q.pa = function() {
    return window.devicePixelRatio ? window.devicePixelRatio : 1
};
q.zB = function(a, b) {
    q.tj(a, 2E3);
    q.tj(b, 1E3)
};
q.xj = function(a) {
    if (void 0 !== a && null !== a && !(0 <= a.indexOf("%"))) return parseFloat(a)
};
q.Aj = function(a) {
    if (void 0 === a) return null;
    a = a.split(/[\s,]/);
    return 4 > a.length ? null : new A(parseFloat(a[2]), parseFloat(a[3]))
};
q.Ls = function(a) {
    var b = new XMLHttpRequest;
    b.open("GET", a.src, !1);
    b.send();
    return b.responseXML && b.responseXML.documentElement ? b.responseXML && b.responseXML.documentElement : null
};
q.vs = function(a, b) {
    var c = new XMLHttpRequest;
    c.open("GET", a.src);
    c.onreadystatechange = function() {
        4 === c.readyState && (200 === c.status ? c.responseXML && c.responseXML.documentElement ? b(c.responseXML.documentElement) : b(null) : b(null))
    };
    c.send()
};
q.Hs = function(a) {
    try {
        if (0 <= a.src.toLowerCase().indexOf(".svg")) {
            y.i("Derivation of SVG size for '" + a.src + "' failed. Parsing manually");
            var b = q.Ls(a);
            if (null !== b) {
                var c = q.xj(b.getAttribute("width"));
                var d = q.xj(b.getAttribute("height"));
                if (c && d) return new A(c, d);
                var e = q.Aj(b.getAttribute("viewBox"));
                if (null !== e) return e
            }
        }
    } catch (f) {
        y.error("Exception during manual parsing of SVG size.")
    }
    return null
};
q.pA = function(a) {
    if (a.naturalWidth && a.naturalHeight) return new A(a.naturalWidth, a.naturalHeight);
    if (a.width && a.height) return new A(a.width, a.height);
    a = q.Hs(a);
    return null !== a ? a : new A(0, 0)
};
q.fs = function() {
    return q.Ks
};
q.Bs = "undefined" !== typeof InstallTrigger;
q.Mr = function(a, b, c) {
    return !q.Bs && !c.WorkaroundForceSVGEmptySizeWorkaround || c.WorkaroundDisableSVGEmptySizeWorkaround ? !1 : t.ad(b) && void 0 !== a.naturalWidth && 0 === a.naturalWidth && void 0 !== a.naturalHeight && 0 === a.naturalHeight
};
q.aA = function(a, b, c) {
    try {
        q.vs(a, function(d) {
            if (null === d) c("DoZeroWidthHeightWorkaround: svg xml not available");
            else {
                var e = q.Aj(d.getAttribute("viewBox"));
                null === e ? c("DoZeroWidthHeightWorkaround: no view box available") : (d.setAttribute("width", e.O), d.setAttribute("height", e.Z), d = (new XMLSerializer).serializeToString(d), b("data:image/svg+xml;base64," + btoa(d)))
            }
        })
    } catch (d) {
        c(d.toString())
    }
};
q.R = function() {
    return "onpointerdown" in window && !C.Zr("CFG_WorkaroundDisablePointerEvents", !1)
};
q.Ks = -1 !== navigator.userAgent.indexOf("Safari");
var fa = "undefined" === typeof ArrayBuffer || "undefined" === typeof Uint8Array || "undefined" === typeof Int8Array,
    ia, ja;
fa || (ia = new ArrayBuffer(4), ja = new Int8Array(ia, 1, 2), fa = 2 !== ja.byteLength);
q.Bj = fa;
q.ws = function() {
    if (q.Bj) return !1;
    var a = "undefined" !== typeof DataView,
        b;
    if (/opera [56789]|opera\/[56789]/i.test(navigator.userAgent) || /MSIE (\d+\.\d+);/.test(navigator.userAgent)) return !1;
    try {
        if (a) {
            var c = new ArrayBuffer(8);
            var d = new Int8Array(c);
            for (b = 0; 8 > b; ++b) d[b] = b;
            var e = new DataView(c);
            if (a = "function" === typeof e.getFloat64 && "function" === typeof e.getFloat32 && "function" === typeof e.getInt32 && "function" === typeof e.getUint32 && "function" === typeof e.getInt16 && "function" === typeof e.getUint16 && "function" ===
                typeof e.getInt8 && "function" === typeof e.getInt8) e.getFloat64(0), e.getFloat32(0), e.getInt32(0), e.getUint32(0), e.getInt16(0), e.getUint16(0), e.getInt8(0), e.getInt8(0)
        }
    } catch (f) {
        return !1
    }
    return a
}();
q.EB = function(a, b) {
    if (void 0 !== a.find) return a.find(b);
    a = a.filter(b);
    return void 0 === a || 0 === a.length ? void 0 : a[0]
};
q.NB = function(a, b) {
    if (void 0 !== a.includes) return a.includes(b);
    for (var c = 0; c < a.length; c++) {
        var d = a[c];
        if (d === b || "number" === typeof d && "number" === typeof b && isNaN(d) && isNaN(b)) return !0
    }
    return !1
};
var Configuration;
Configuration = function() {
    this.PlcAddress = "0101";
    this.UseLocalHost = !0;
    this.CommBufferSize = 5E4;
    this.ErrorReconnectTime = 1E4;
    this.Application = "Application";
    this.UpdateRate = 200;
    this.BestFitForDialogs = this.BestFit = !1;
    this.StartVisu = "Visualization";
    this.XhrSendTimeout = 0;
    this.PollingRegistrationInterval = 100;
    this.TimeMeasurements = "";
    this.LogLevel = "INFO";
    this.MaxUnusedImageAge = 2E4;
    this.MaxUndrawnImageAge = 1E4;
    this.NumCachedImages = 15;
    this.ChangeWindowTitle = !0;
    this.TooltipFont = "11px Arial";
    this.DefaultKeyActions = !0;
    this.ANSIStringEncoding = "iso-8859-1";
    this.CommitEditcontrolOnClickOut = !0;
    this.HandleTouchEvents = !1;
    this.FuzzyTransparencyColorEvaluation = !0;
    this.TouchHandlingActive = this.Benchmarking = this.HasKeyboard = this.LoadImagesById = !1;
    this.ClientName = "";
    this.ScaleTypeIsotropic = this.IecSupportsCommonMiterLimit = this.SemiTransparencyActive = !1;
    this.GesturesFlickPanThresholdPxPerSecond = 1E3;
    this.GesturesPanFlickTimeThresholdMs = 40;
    this.GesturesPanClickThresholdDistSquare = 10;
    this.PostDataInHeader = 0;
    this.AutoFontReductionActive = !1;
    this.ProgrammingSystemModeWaitingText = "The online visualization is waiting for a connection. Please start the application.";
    this.ProgrammingSystemModeErrorText = "Some sort of error occurred during the Visualisation.";
    this.ConnectionInfoValidTimeMsForLeaveAfterError = 1E3;
    this.WorkaroundDisableMouseUpDownAfterActiveTouch = !0;
    this.WorkaroundSetIgnoreTimeMsForMouseUpDownAfterActiveTouch = 500;
    this.WorkaroundForceSVGEmptySizeWorkaround = this.WorkaroundDisableSVGEmptySizeWorkaround = this.WorkaroundDisableSVGAspectRatioWorkaround =
        this.WorkaroundDisableResizeHandling = !1;
    this.RuntimeVersion = this.CasFactoryName = "";
    this.DebugOnlyDiagnosisDisplay = this.DebugOnlyPrintTouchRectangles = this.DebugOnlyPrintGestures = this.DebugOnlyPrintRawTouches = this.DebugOnlyPrintPaintCommands = !1
};
Configuration.prototype = {
    uB: function() {
        if ("string" !== typeof this.PlcAddress) throw Error("Plc address must be of type string");
        if ("boolean" !== typeof this.UseLocalHost) throw Error("UseLocalHost must be of type boolean");
        if ("number" !== typeof this.CommBufferSize) throw Error("CommBufferSize must be of type number");
        if ("number" !== typeof this.ErrorReconnectTime) throw Error("ErrorReconnectTime must be of type number");
        if ("string" !== typeof this.Application) throw Error("Application must be of type string");
        if ("number" !== typeof this.UpdateRate) throw Error("UpdateRate must be of type number");
        if ("boolean" !== typeof this.BestFit) throw Error("BestFit must be of type boolean");
        if ("boolean" !== typeof this.BestFitForDialogs) throw Error("BestFitForDialogs must be of type boolean");
        if ("string" !== typeof this.StartVisu) throw Error("StartVisu must be of type string");
        if ("number" !== typeof this.PollingRegistrationInterval) throw Error("PollingRegistrationInterval must be of type number");
        if ("string" !== typeof this.TimeMeasurements) throw Error("TimeMeasurements must be of type string");
        if ("string" !== typeof this.TooltipFont) throw Error("TooltipFont must be of type string");
        if ("boolean" !== typeof this.DefaultKeyActions) throw Error("DefaultKeyActions must be of type boolean");
        if ("string" !== typeof this.ANSIStringEncoding) throw Error("ANSIStringEncoding must be of type string");
        if ("boolean" !== typeof this.FuzzyTransparencyColorEvaluation) throw Error("FuzzyTransparencyColorEvaluation must be of type boolean");
        if ("boolean" !== typeof this.LoadImagesById) throw Error("LoadImagesById must be of type boolean");
        if ("boolean" !== typeof this.Benchmarking) throw Error("Benchmarking must be of type boolean");
        if ("boolean" !== typeof this.TouchHandlingActive) throw Error("TouchHandlingActive must be of type boolean");
        if ("boolean" !== typeof this.HasKeyboard) throw Error("HasKeyboard must be of type boolean");
        if ("boolean" !== typeof this.SemiTransparencyActive) throw Error("SemiTransparencyActive must be of type boolean");
        if ("boolean" !== typeof this.ScaleTypeIsotropic) throw Error("ScaleTypeIsotropic must be of type boolean");
        if ("number" !== typeof this.GesturesFlickPanThresholdPxPerSecond || 0 > this.GesturesFlickPanThresholdPxPerSecond) throw Error("GesturesFlickPanThresholdPxPerSecond must be of type nonnegative number");
        if ("number" !== typeof this.GesturesPanFlickTimeThresholdMs || 0 > this.GesturesPanFlickTimeThresholdMs) throw Error("GesturesPanFlickTimeThresholdMs must be of type nonnegative number");
        if ("number" !== typeof this.GesturesPanClickThresholdDistSquare || 0 > this.GesturesPanClickThresholdDistSquare) throw Error("GesturesPanClickThresholdDistSquare must be of type nonnegative number");
        if ("number" !== typeof this.PostDataInHeader || 0 > this.PostDataInHeader || 2 < this.PostDataInHeader) throw Error("PostDataInHeader must be a number in the range 0..2");
        if ("boolean" !== typeof this.AutoFontReductionActive) throw Error("AutoFontReductionActive must be of type boolean");
        if ("string" !== typeof this.ProgrammingSystemModeWaitingText) throw Error("ProgrammingSystemModeWaitingText must be of type string");
        if ("string" !== typeof this.ProgrammingSystemModeErrorText) throw Error("ProgrammingSystemModeErrorText must be of type string");
        if ("number" !== typeof this.ConnectionInfoValidTimeMsForLeaveAfterError) throw Error("ConnectionInfoValidTimeMsForLeaveAfterError must be of type number");
        if ("boolean" !== typeof this.DebugOnlyPrintPaintCommands) throw Error("DebugOnlyPrintPaintCommands must be of type boolean");
        if ("boolean" !== typeof this.DebugOnlyPrintRawTouches) throw Error("DebugOnlyPrintPaintCommands must be of type boolean");
        if ("boolean" !== typeof this.DebugOnlyPrintGestures) throw Error("DebugOnlyPrintGestures must be of type boolean");
        if ("boolean" !== typeof this.DebugOnlyPrintTouchRectangles) throw Error("DebugOnlyPrintTouchRectangles must be of type boolean");
        if ("boolean" !== typeof this.DebugOnlyDiagnosisDisplay) throw Error("DebugOnlyDiagnosisDisplay must be of type boolean");
        if ("boolean" !== typeof this.WorkaroundDisableMouseUpDownAfterActiveTouch) throw Error("WorkaroundDisableMouseUpDownAfterActiveTouch must be of type boolean");
        if ("boolean" !== typeof this.WorkaroundDisableResizeHandling) throw Error("WorkaroundDisableResizeHandling must be of type boolean");
        if ("number" !== typeof this.WorkaroundSetIgnoreTimeMsForMouseUpDownAfterActiveTouch || 0 > this.WorkaroundSetIgnoreTimeMsForMouseUpDownAfterActiveTouch) throw Error("WorkaroundSetIgnoreTimeMsForMouseUpDownAfterActiveTouch must be of type nonnegative number");
        if ("string" !== typeof this.CasFactoryName) throw Error("CasFactoryName must be of type string");
        if ("string" !== typeof this.RuntimeVersion) throw Error("RuntimeVersion must be of type string");
        this.Oq();
        this.ya()
    },
    Oq: function() {
        return new ka(this.TooltipFont)
    },
    ya: function() {
        return new aa(this.ANSIStringEncoding)
    },
    sh: function() {
        return new ba(this.ANSIStringEncoding)
    }
};
var la;
la = function(a, b, c, d, e) {
    this.CommBufferSize = a;
    this.Ja = b;
    this.se = c;
    this.Hh = d;
    this.bg = D.R;
    this.L = D.i;
    this.fk = "";
    this.Cs = e
};
var E;
E = function() {};
E.Ye = "";
E.Or = "";
E.Ze = "2";
E.gg = "3";
E.Tr = "4";
E.ks = "5";
E.hs = "6";
var F;
F = function() {};
F.ProgrammingSystemModeErrorText = "Some sort of error occurred during the Visualisation.";
F.ProgrammingSystemModeWaitingText = "The online visualization is waiting for a connection. Please start the application.";
F.b = 1;
F.fa = F.b;
F.pa = F.b + 1;
F.A = F.b + 2;
F.i = F.b + 3;
F.R = F.b + 4;
F.Ia = F.b + 5;
var ma;
ma = function(a, b, c, d, e, f, g, h, l) {
    this.Uk = a;
    this.Ka = d % 360;
    this.st = e;
    this.tt = f;
    this.Rk = g;
    (0 === this.Rk || 2 === this.Rk) && 180 < this.Ka ? (this.Ka -= 180, this.bi = h ? c : l, this.tg = b) : (this.bi = b, this.tg = h ? c : l)
};
ma.prototype = {
    gz: function(a, b) {
        if (0 === b.w() || 0 === b.v()) return "#ffffff";
        switch (this.Rk) {
            case 0:
                return this.In(a, b, !1);
            case 1:
                return this.jt(a, b);
            case 2:
                return this.In(a, b, !0);
            default:
                return "#ffffff"
        }
    },
    In: function(a, b, c) {
        var d = b.qh();
        var e = 90 < this.Ka ? G.fa(180 - this.Ka) : G.fa(this.Ka);
        var f = d.c - Math.max(b.v(), b.w()) * Math.cos(e);
        var g = d.f - Math.max(b.v(), b.w()) * Math.sin(e);
        if (this.fp(d.c, d.f, f, g, b.m, b.o, b.m, b.X)) {
            d = e;
            e = b.w() / 2 * Math.tan(d);
            e = b.v() / 2 - e;
            d = Math.PI / 2 - d;
            d = e * Math.cos(d);
            f = d * d / e;
            g = e - f;
            var h = Math.sqrt(Math.max(0,
                g * f));
            e = b.m - h;
            d = b.o + g;
            f = b.T + h;
            g = b.X - g
        } else this.fp(d.c, d.f, f, g, b.m, b.o, b.T, b.o) ? (d = e, e = b.v() / 2 / Math.tan(d), e = b.w() / 2 - e, d = Math.PI / 2 - d, d = Math.cos(d) * e, f = d * d / e, h = Math.sqrt(Math.max(0, (e - f) * f)), e = b.m + f, d = b.o - h, f = b.T - f, g = b.X + h) : (e = b.m, d = b.o, f = b.T, g = b.X);
        90 < this.Ka && (e = b.T - (e - b.m), f = b.T - (f - b.m));
        a = a.createLinearGradient(e, d, f, g);
        a.addColorStop(0, this.bi);
        c ? (a.addColorStop(.45, this.tg), a.addColorStop(.55, this.tg), a.addColorStop(1, this.bi)) : a.addColorStop(1, this.tg);
        return a
    },
    jt: function(a, b) {
        var c = new w(b.m +
            b.w() * this.st, b.o + b.v() * this.tt);
        b = this.rv(b, c);
        a = a.createRadialGradient(c.c, c.f, 0, c.c, c.f, b);
        a.addColorStop(0, this.bi);
        a.addColorStop(1, this.tg);
        return a
    },
    fp: function(a, b, c, d, e, f, g, h) {
        var l = (h - f) * (c - a) - (g - e) * (d - b);
        g = (g - e) * (b - f) - (h - f) * (a - e);
        a = (c - a) * (b - f) - (d - b) * (a - e);
        if (0 === l) return g === a;
        b = g / l;
        l = a / l;
        return 0 <= b && 1 >= b && 0 <= l && 1 >= l
    },
    rv: function(a, b) {
        var c = [];
        c[0] = this.fi(new w(a.m, a.o), b);
        c[1] = this.fi(new w(a.T, a.o), b);
        c[2] = this.fi(new w(a.T, a.X), b);
        c[3] = this.fi(new w(a.m, a.X), b);
        for (a = b = 0; 4 > a; ++a) b =
            Math.max(b, c[a]);
        return Math.sqrt(b)
    },
    fi: function(a, b) {
        return (a.c - b.c) * (a.c - b.c) + (a.f - b.f) * (a.f - b.f)
    }
};
var na;
na = function(a) {
    this.a = a;
    this.bl()
};
na.prototype = {
    bl: function() {
        var a = this;
        window.document.addEventListener("keydown", function(b) {
            a.sw(b)
        }, !1);
        window.document.addEventListener("keypress", function(b) {
            a.tw(b)
        }, !1);
        window.document.addEventListener("keyup", function(b) {
            a.uw(b)
        }, !1)
    },
    tw: function(a) {
        var b = this.a.s;
        a = this.kv(a);
        null !== b && null !== a && this.a.$b(n.fa(b.L, a))
    },
    sw: function(a) {
        var b = this.Io(a),
            c = this.a.s;
        this.Jn(a);
        null !== c && null !== b && this.a.$b(n.A(128, c.L, b.key, b.flags))
    },
    uw: function(a) {
        var b = this.Io(a),
            c = this.a.s;
        this.Jn(a);
        null !==
            c && null !== b && this.a.$b(n.A(256, c.L, b.key, b.flags))
    },
    Io: function(a) {
        var b = a.keyCode,
            c = 0;
        if (16 <= b && 18 >= b) return null;
        a.shiftKey && (c |= 1);
        a.altKey && (c |= 2);
        a.ctrlKey && (c |= 4);
        return {
            key: b,
            flags: c
        }
    },
    kv: function(a) {
        var b = 0;
        a.charCode ? b = a.charCode : a.which && (b = a.which);
        if (0 === b || void 0 !== a.altKey && !0 === a.altKey && 48 <= b && 57 >= b) return null;
        if (void 0 !== a.ctrlKey && a.ctrlKey || void 0 !== a.altKey && a.altKey)
            if (void 0 === a.ctrlKey || !a.ctrlKey || void 0 === a.altKey || !a.altKey) return null;
        return String.fromCharCode(b)
    },
    Jn: function(a) {
        null ===
            this.a.getConfiguration() || this.a.getConfiguration().DefaultKeyActions || a.preventDefault && a.preventDefault()
    }
};
var oa;
oa = function(a) {
    this.a = a;
    this.Bi = !1;
    this.Zk = 0;
    this.$v = [];
    this.b()
};
oa.prototype = {
    wr: function(a) {
        this.Bi = a
    },
    JA: function(a) {
        this.Zk = a
    },
    aB: function(a) {
        this.Qk().style.touchAction = a ? "none" : "auto"
    },
    b: function() {
        var a = this;
        if (q.R()) {
            var b = !this.a.ba;
            y.i("Mouse-Handling using PointerEvents");
            this.yc("pointerup", function(c) {
                a.Rg(c)
            }, b);
            this.yc("pointerdown", function(c) {
                a.Ti(c)
            }, b);
            this.yc("pointermove", function(c) {
                a.Qg(c)
            }, b);
            this.yc("pointerout", function(c) {
                a.Bw(c)
            }, b)
        } else y.i("Mouse-Handling using MouseEvents"), this.yc("mouseup", function(c) {
            a.Si(c)
        }, !1), this.yc("mousedown",
            function(c) {
                a.Qi(c)
            }, !1), this.yc("mousemove", function(c) {
            a.Ri(c)
        }, !1), this.yc("mouseout", function(c) {
            a.yw(c)
        }, !1), this.yc("touchstart", function(c) {
            a.Vd(c)
        }, !0), this.yc("touchmove", function(c) {
            a.Vd(c)
        }, !0), this.yc("touchend", function(c) {
            a.Vd(c)
        }, !0)
    },
    Qk: function() {
        return this.a.ba ? this.a.ab() : this.a.Da().he().canvas
    },
    yc: function(a, b, c) {
        this.Qk().addEventListener(a, b, c, {
            passive: !1
        });
        this.$v.push({
            type: a,
            uj: b,
            VB: c
        })
    },
    mi: function(a, b) {
        if (null !== this.a.s) {
            var c = q.Dd(a);
            this.a.ba && (a = t.lb(a.target, this.Qk()),
                c = c.offset(a));
            b = n.b(b, this.a.s.L, c);
            this.a.$b(b)
        }
    },
    Gi: function(a) {
        return null !== this.a.getConfiguration() && this.a.getConfiguration().TouchHandlingActive ? "touch" !== a.pointerType : a.isPrimary
    },
    Ti: function(a) {
        this.Gi(a) && (a.preventDefault(), this.Ko(a))
    },
    Rg: function(a) {
        this.Gi(a) && (a.preventDefault(), this.No(a))
    },
    Qg: function(a) {
        this.Gi(a) && (a.preventDefault(), this.Lo(a))
    },
    Bw: function(a) {
        this.Gi(a) && (a.preventDefault(), this.Mo(a))
    },
    No: function(a) {
        t.$c(a) && this.mi(a, H.i)
    },
    Ko: function(a) {
        t.$c(a) && (this.a.Sc.vj(a),
            this.a.wc.Wq(a), this.mi(a, H.A))
    },
    Lo: function(a) {
        this.Bi || this.mi(a, H.b)
    },
    Mo: function(a) {
        null !== a.relatedTarget && void 0 !== a.relatedTarget && "string" === typeof a.relatedTarget.nodeName && "html" !== a.relatedTarget.nodeName.toLowerCase() || this.mi(a, 4096)
    },
    Si: function(a) {
        t.b() < this.Zk ? y.i("Dropping mouse up due to required delay!") : this.No(a)
    },
    Qi: function(a) {
        t.b() < this.Zk ? y.i("Dropping mouse down due to required delay!") : this.Ko(a)
    },
    Ri: function(a) {
        this.Lo(a)
    },
    yw: function(a) {
        this.Mo(a)
    },
    Vd: function(a) {
        if (null !==
            this.a.getConfiguration() && this.a.getConfiguration().HandleTouchEvents && !this.a.getConfiguration().TouchHandlingActive) {
            var b = null;
            switch (a.type) {
                case "touchstart":
                    var c = H.A;
                    this.Bi = !0;
                    break;
                case "touchmove":
                    c = H.b;
                    break;
                case "touchend":
                    c = H.i;
                    this.Bi = !1;
                    break;
                default:
                    return
            }
            a.touches && 1 <= a.touches.length ? b = q.qe(a.touches[0]) : a.changedTouches && 1 <= a.changedTouches.length && (b = q.qe(a.changedTouches[0]));
            null !== b && (null !== this.a.s && (c === H.A && this.a.wc.kB(b), c = n.b(c, this.a.s.L, b), this.a.$b(c)), a.preventDefault())
        }
    }
};
var pa;
pa = function(a, b, c) {
    this.Jd = a;
    this.bu = b;
    this.uk = c;
    this.op = p.b(1E3)
};
pa.prototype = {
    Jz: function() {
        return this.bu - this.op.size()
    },
    Hc: function() {
        return this.op
    },
    finish: function() {
        this.uk = 0
    },
    je: function() {
        return 0 === this.uk
    }
};
var qa;
qa = function(a, b) {
    this.a = a;
    this.ci = b
};
qa.prototype = {
    b: function() {
        var a = this.a.Ga(),
            b = this.a.Na(this.ci);
        b.Qm(this.ci.L);
        a.Za(b.Oa(), this, !0)
    },
    hb: function() {},
    H: function() {}
};
var ra;
ra = function(a, b, c, d, e) {
    this.a = a;
    b = this.b(b);
    var f = 1;
    e ? c = b : (this.Cc = new sa, c = this.b(c));
    if (b.width !== c.width || b.height !== c.height) throw Error("Expected two canvasses of the same size");
    q.zB(b, c);
    this.Ea = this.i(b);
    this.Y = this.i(c);
    this.by = C.jn(this.a.jh, "WorkaroundDisableDPRBasedZoom", !1);
    d && (this.Pq() && (f = q.pa()), this.Dq(f));
    this.ti = new ta;
    this.Ak = q.pa();
    this.ui = new ua(this.Y);
    this.xe = new ua(this.Ea);
    this.Ie = !1;
    this.Di = new va;
    this.$k = new wa(this.a);
    this.ej = new xa(this);
    this.Rl = new ya(this);
    this.sk = !1;
    this.mu = new za(a)
};
ra.prototype = {
    fe: function() {
        return new I(0, 0, this.Ea.canvas.width, this.Ea.canvas.height)
    },
    he: function() {
        return this.a.ba ? this.Ea : this.Y
    },
    clear: function() {
        this.a.kc && this.a.kc.Em();
        this.a.ai && this.a.ai.Em();
        this.Y.clearRect(0, 0, this.Y.canvas.width, this.Y.canvas.height);
        this.Ea.fillStyle = "#ffffff";
        this.Ea.fillRect(0, 0, this.Ea.canvas.width, this.Ea.canvas.height)
    },
    bz: function() {
        var a = t.Dd(this.Ea.canvas);
        return new w(a.m, a.o)
    },
    getContext: function() {
        if (this.a.ba) {
            var a = this.a.U().ma();
            a = this.Ie ? null !==
                a ? a.Da() : this.Ea : null !== a ? a.Da() : this.Y;
            this.getState().Ah(a);
            return a
        }
        a = null;
        var b = this.Cc.bm(); - 1 !== b && (a = this.Cc.Nj(b));
        return this.Ie ? null !== a ? a.Ea : this.Ea : null !== a ? a.ei : this.Y
    },
    wy: function() {
        var a = this.getContext();
        a.clearRect(0, 0, a.canvas.width, a.canvas.height)
    },
    getState: function() {
        if (this.a.ba) return this.xe;
        var a = null;
        var b = this.Cc.bm(); - 1 !== b && (a = this.Cc.Nj(b));
        return this.Ie ? null !== a ? a.xe : this.xe : null !== a ? a.ct : this.ui
    },
    kA: function() {
        this.Ie = !0;
        this.a.ba && (this.xe.Ah(this.Ea), this.xe.apply())
    },
    lA: function() {
        this.Ie = !1;
        this.a.ba && (this.ui.Ah(this.Y), this.ui.apply())
    },
    zy: function() {
        this.sk = !0
    },
    Cq: function(a, b) {
        this.a.wc.eB(m.dk);
        this.ti.clear();
        this.Y.save();
        this.ui.Ah(this.Y);
        this.xe.Ah(this.Ea);
        var c = this.Xw(a),
            d = !1,
            e = this;
        for (a = 0; a < c.length; ++a) c[a] instanceof Aa && !c[a].qz(this.$k, this.Di) && (d = !0), c[a] instanceof Ba && !this.a.ba && c[a].h(this);
        this.ot() ? (d ? (y.b("Waiting for image(s) to load"), this.$k.qy(function() {
            y.b("Loading image(s) finished so continue with drawing");
            e.lo(c, b)
        })) : this.lo(c,
            b), null !== this.a.W && this.a.W.a.D.zf && this.su()) : b()
    },
    Pz: function() {
        this.Ak = q.pa();
        (new Ca).b("DevicePixelRatioChanged", "true")
    },
    Pq: function() {
        return (new Ca).i("DevicePixelRatioChanged")
    },
    nk: function(a) {
        this.Ea.canvas.width = this.Y.canvas.width = a.O;
        this.Ea.canvas.height = this.Y.canvas.height = a.Z;
        var b = this.a.ab();
        null !== b && (b.style.height = a.Z + "px", b.style.width = a.O + "px", b.style.overflow = "hidden")
    },
    ho: function() {
        return new A(document.documentElement.clientWidth, document.documentElement.clientHeight)
    },
    Dq: function(a) {
        this.by && (a = 1);
        try {
            var b = this.ho();
            this.nk(b.scale(a));
            var c = this.ho();
            (c.O > b.O || c.Z > b.Z) && this.nk(c.scale(a))
        } catch (d) {
            y.warn("Exception during resizing canvasses: " + d), this.nk((new A(window.innerWidth, window.innerHeight)).scale(a))
        }
    },
    lo: function(a, b) {
        this.sk && (this.a.kq(), this.sk = !1);
        var c, d = this;
        if (this.a.fb.$j) {
            for (c = 0; c < a.length; ++c) {
                var e = a[c];
                (e instanceof Da || e instanceof Ea || e instanceof Fa) && e.h(this)
            }
            for (c = 0; c < a.length; ++c) e = a[c];
            this.Y.restore()
        } else if (this.a.ba) {
            for (c =
                0; c < a.length; ++c) a[c] instanceof Ga && a[c].h(this);
            this.ti.eq(this.Y);
            for (c = 0; c < a.length; ++c) e = a[c], e instanceof Ga || a[c].h(this);
            this.Y.restore()
        } else {
            var f = [];
            for (c = 0; c < a.length; ++c) e = a[c], e instanceof Ga ? e.h(this) : e instanceof Ha && f.push(e);
            this.ti.eq(this.Y);
            for (c = 0; c < a.length; ++c) e = a[c], e instanceof Ga || e instanceof Ha || e instanceof Ba || a[c].h(this);
            this.Y.restore();
            for (c = 0; c < f.length; ++c) f[c].h(this)
        }
        this.Hw();
        this.mu.yj(this.Y);
        this.a.Pf(function() {
            d.Ru()
        });
        this.Qu();
        this.a.wc.Xy(0 === a.length,
            m.dk);
        b()
    },
    Ru: function() {
        var a = this.a.fz();
        0 !== a.length && setTimeout(function() {
            window.requestAnimationFrame(function() {
                a.forEach(function(b) {
                    b()
                })
            })
        })
    },
    Qu: function() {
        var a = this.a.dz();
        0 !== a.length && window.requestAnimationFrame(function() {
            a.forEach(function(b) {
                b()
            })
        })
    },
    ot: function() {
        return null === this.a.W || this.a.W.a.D.zf || !this.a.W.a.D.Hj()
    },
    Hw: function() {
        if (!(this.a.s.Hh || (void 0 === this.Ao && (this.Ao = t.b()), 3E4 > t.b() - this.Ao))) {
            var a = new I(this.Y.canvas.width - 160, 10, this.Y.canvas.width - 10, 50);
            if (this.a.ba) {
                var b =
                    document.getElementById("cdsDemoMode");
                if (null === b) {
                    var c = this.a.ab();
                    b = this.Ot(a.m, a.o);
                    c.appendChild(b)
                } else b.style.left = a.m + "px", b.style.top = a.o + "px"
            } else this.Y.save(), this.Y.strokeStyle = "#808080", this.Y.fillStyle = "#c7c7c7", this.Y.lineWidth = 2, G.mg(this.Y, a.m, a.o, a.w(), a.v(), !0, !0, -1, -1), this.Y.fillStyle = "#ffffff", this.Y.font = "16px Arial", this.Y.textAlign = "center", this.Y.textBaseline = "middle", this.Y.fillText("Demo Mode", a.m + a.w() / 2, a.o + a.v() / 2), this.Y.restore()
        }
    },
    Ot: function(a, b) {
        var c = document.createElement("div");
        c.id = "cdsDemoMode";
        c.style.userSelect = "none";
        c.style.position = "absolute";
        c.style.left = a + "px";
        c.style.top = b + "px";
        c.style.color = "#ffffff";
        c.innerHTML = "Demo Mode";
        c.style.font = "16px Arial";
        c.style.border = "#808080";
        c.style.borderRadius = "4px";
        c.style.borderStyle = "solid";
        c.style.borderWidth = "2px";
        c.style.padding = "10px 30px 10px 30px";
        c.style.backgroundColor = "#c7c7c7";
        c.style.zIndex = E.gg;
        return c
    },
    Xw: function(a) {
        var b = Array(a.Jd),
            c;
        if (0 < a.Jd) {
            var d = J.b(a.Hc().Hc(), this.a.s.Ja, this.a.ya());
            d = new Ia(d);
            for (c =
                0; c < a.Jd; ++c)
                if (d.S() < d.size() - 4) {
                    var e = d.S(),
                        f = d.getUint32(),
                        g = d.getUint32();
                    b[c] = Ja.mz(g, d, f, this);
                    d.seek(e + f)
                }
        }
        return b
    },
    b: function(a) {
        var b = window.document.getElementById(a);
        if (null === b) throw Error("Canvas " + a + " does not exist");
        return b
    },
    i: function(a) {
        a = a.getContext("2d");
        if (null === a) throw Error("Creating graphics context failed");
        return a
    },
    su: function() {
        var a, b = this.a.W;
        if (null !== b)
            for (a = 0; a < b.sa.P.length; ++a) {
                var c = b.sa.Fj(a);
                if (null !== c.info().Fm(0)) {
                    var d = b.oc;
                    if (null !== d) {
                        var e = this.he();
                        e.save();
                        d.Kj(this, c);
                        e.restore()
                    }
                }
            }
    }
};
var Ka;
Ka = function(a, b, c) {
    this.Cf = !1;
    this.ei = a;
    this.Ea = b;
    this.ct = new ua(this.ei);
    this.xe = new ua(this.Ea);
    this.Mf = c
};
Ka.prototype = {
    LA: function(a) {
        this.Cf = a
    },
    size: function() {
        return this.Mf
    }
};
var ua;
ua = function(a) {
    this.wf = null;
    this.oi = "#ffffff";
    this.Oo = !1;
    this.Ii = "#000000";
    this.yf = !1;
    this.Ji = .5;
    this.Op = "#000000";
    this.Ib = "12px Arial";
    this.Bg = 12;
    a.font = this.Ib;
    this.la = a;
    this.Qo = this.Po = -1;
    this.zl = new w(0, 0);
    this.wl = new w(0, 0)
};
ua.prototype = {
    Ah: function(a) {
        null !== a && void 0 !== a && (this.la = a, this.apply(), this.En())
    },
    EA: function(a, b) {
        this.oi = a;
        this.Oo = b;
        this.la.fillStyle = this.oi
    },
    OA: function(a, b, c, d, e, f) {
        this.Ji = a;
        this.Ii = b;
        this.qd = c;
        this.fd = d;
        this.gd = e;
        this.Ed = f;
        this.la.strokeStyle = this.Ii;
        this.la.lineWidth = Math.max(1, this.Ji);
        this.la.lineCap = this.fd;
        this.la.lineJoin = this.gd;
        this.la.miterLimit = this.Ed;
        "function" === typeof this.la.setLineDash ? (this.yf = !1, this.En()) : this.yf = 5 === this.qd
    },
    TA: function(a, b) {
        if ("number" !== typeof a) throw new TypeError("Expected numeric value");
        if ("number" !== typeof b) throw new TypeError("Expected numeric value");
        this.Po = a;
        this.Qo = b
    },
    ZA: function(a, b, c) {
        this.Ib = a;
        this.Bg = b;
        this.Op = c
    },
    apply: function() {
        this.la.fillStyle !== this.oi && (this.la.fillStyle = this.oi);
        this.la.strokeStyle !== this.Ii && (this.la.strokeStyle = this.Ii);
        this.la.lineWidth !== this.Ji && (this.la.lineWidth = this.Ji);
        this.la.lineCap !== this.fd && (this.la.lineCap = this.fd);
        this.la.lineJoin !== this.gd && (this.la.lineJoin = this.gd);
        this.la.miterLimit !== this.Ed && (this.la.miterLimit = this.Ed)
    },
    wm: function() {
        return null ===
            this.wf ? this.Oo : this.wf.Uk
    },
    ie: function() {
        return null !== this.wf
    },
    HA: function(a) {
        this.wf = a
    },
    Oj: function() {
        this.wf = null;
        this.apply()
    },
    qj: function(a) {
        this.la.fillStyle = this.wf.gz(this.la, a)
    },
    ur: function(a) {
        this.Bg = a
    },
    tr: function(a) {
        this.Ib = a
    },
    En: function() {
        "function" === typeof this.la.setLineDash && (0 === this.qd && this.la.setLineDash([]), 1 === this.qd && this.la.setLineDash([8, 3]), 2 === this.qd && this.la.setLineDash([3, 3]), 3 === this.qd && this.la.setLineDash([8, 3, 3, 3]), 4 === this.qd && this.la.setLineDash([8, 3, 3, 3, 3,
            3
        ]), 5 === this.qd && (this.yf = !0, this.la.setLineDash([0, 0])))
    }
};
var sa;
sa = function() {
    this.ah = [];
    this.og = []
};
sa.prototype = {
    Nj: function(a) {
        return this.ah.length > a ? this.ah[a] : null
    },
    ky: function(a, b) {
        this.ah[a] = b
    },
    jA: function(a) {
        this.ah.length > a && (this.ah[a] = null)
    },
    bm: function() {
        return 0 < this.og.length ? this.og[this.og.length - 1] : -1
    },
    Yz: function(a) {
        this.og.push(a)
    },
    Wz: function() {
        return this.og.pop()
    }
};
var La;
La = function() {};
La.b = "3.5.17.0";
La.i = La.b;
var Webvisu;
Webvisu = function(a, b, c, d) {
    this.jh = C.As();
    this.Gv();
    y.info("Webvisualization starting");
    y.info("Version: " + La.i);
    this.Bt();
    this.ki = this.ae = this.Pd = this.D = this.W = this.Lf = null;
    this.ba = d;
    this.Pk = [];
    this.Bk = [];
    this.rt = t.ab();
    this.Sc = new Ma(this);
    this.Dl();
    this.Tl = new Na;
    this.Va = new ra(this, a, b, c, d);
    this.bl();
    this.On = new ca(this);
    new na(this);
    this.Mi = new oa(this);
    this.Hk = new Oa(this);
    this.hv = new Pa;
    this.ai = K.Qz(this.On.mq(Qa.rs));
    this.kc = K.zz(this.On.mq(Qa.Vz));
    this.wc = new Sa(this);
    this.Hv(this.Va.he().canvas.id);
    this.ak = new F;
    this.fb = new Ta;
    this.eh = null;
    this.Ek = new Ua(new Configuration);
    this.Ac || this.$i("Loading Webvisualization");
    this.li = null;
    this.gb = -1;
    this.ye = new Va(this);
    this.xo()
};
window.Webvisu = Webvisu;
Webvisu.prototype = {
    U: function() {
        return this.kc.wz() ? this.kc : this.ai
    },
    openDialog: function(a, b) {
        this.kc.gy(a, b)
    },
    Kb: function() {
        return this.hv
    },
    ab: function() {
        return this.rt
    },
    yy: function(a) {
        this.kc.fA(a)
    },
    cB: function(a) {
        this.kc.Zz(a)
    },
    Vy: function() {
        return this.kc.Xz()
    },
    xo: function() {
        var a = this.ye;
        null !== this.li && (null !== this.Sa && this.Sa.push(this.li), this.li = null);
        this.ye = null;
        try {
            a.h()
        } catch (b) {
            this.error("Unexpected Exception: " + b)
        }
    },
    Dl: function() {
        this.Sa = this.ob = this.g = this.s = null;
        this.qp = !1;
        null !==
            this.W && (this.W.Xa(), this.W = null);
        this.Sc.xm() && this.Sc.close();
        null !== this.Lf && this.Lf.detach();
        WebvisuExtensionMgr.My()
    },
    bl: function() {
        var a = this;
        window.addEventListener("unload", function(b) {
            a.vw(b)
        }, !1)
    },
    Hv: function(a) {
        window.WebvisuAutotestInst = new WebvisuAutotest(this, a);
        window.WebvisuAutotest_raiseMouse = window.WebvisuAutotestInst.raiseMouse;
        window.WebvisuAutotest_raiseKey = window.WebvisuAutotestInst.raiseKey;
        window.WebvisuExtensionMgr = WebvisuExtensionMgr;
        WebvisuExtensionMgr.RA(this.ba);
        window.WebvisuExtensionMgr_register =
            window.WebvisuExtensionMgr.register;
        window.WebvisuExtensionMgr_openControlRelative = window.WebvisuExtensionMgr.openControlRelative;
        window.WebvisuInst = this
    },
    Pf: function(a) {
        this.Bk.push(a)
    },
    dz: function() {
        var a = this.Bk;
        this.Bk = [];
        return a
    },
    nj: function(a) {
        this.Pk.push(a)
    },
    fz: function() {
        var a = this.Pk;
        this.Pk = [];
        return a
    },
    Gv: function() {
        var a = C.Ih(this.jh, "CFG_LogLevel");
        "TRACE" === a ? y.A(M.jk) : "DEBUG" === a ? y.A(M.Zj) : y.A(M.Gh)
    },
    $i: function(a) {
        var b = 0;
        null !== this.eh && this.kq();
        "" !== this.Nq() && (b = 5E3);
        this.eh =
            new Wa(a, this.Va, this.Ac, b)
    },
    kq: function() {
        null !== this.eh && this.eh.close();
        this.eh = null
    },
    Ga: function() {
        return new Xa(this)
    },
    Na: function(a) {
        a = void 0 !== a ? a : this.s;
        return null === a ? new Ya(!0, D.R, 5E4) : new Ya(a.Ja, a.bg, a.CommBufferSize)
    },
    setConfiguration: function(a) {
        "TRACE" === a.LogLevel ? y.A(M.jk) : "DEBUG" === a.LogLevel ? y.A(M.Zj) : "INFO" === a.LogLevel ? y.A(M.Gh) : "WARNING" === a.LogLevel ? y.A(M.vn) : "ERROR" === a.LogLevel ? y.A(M.cn) : "FATAL" === a.LogLevel ? y.A(M.Vr) : y.warn("Unexpected loglevel: " + a.LogLevel);
        this.ob = a;
        this.Ek = new Ua(a);
        this.ob.TouchHandlingActive && (this.ae = new Za, this.Pd = new $a(this.getConfiguration()), this.W = new ab(this, new bb(this)), this.D = new cb);
        this.Mi.aB(this.ob.HandleTouchEvents || this.ob.TouchHandlingActive);
        this.ob.BestFit && !this.ob.WorkaroundDisableResizeHandling && (null === this.Lf && (this.Lf = new db(this)), this.Lf.py());
        this.ba && this.ob.BestFit && (this.ab().style.overflow = "hidden");
        this.Ac && (this.ak.ProgrammingSystemModeErrorText = a.ProgrammingSystemModeErrorText, this.ak.ProgrammingSystemModeWaitingText =
            a.ProgrammingSystemModeWaitingText, this.$i(this.ob.ProgrammingSystemModeWaitingText))
    },
    getConfiguration: function() {
        return this.ob
    },
    ya: function() {
        return this.Ek.yk
    },
    sh: function() {
        return this.Ek.rf
    },
    Fr: function(a) {
        !window.btoa && a && (y.warn("POST data in header should be done but is not supported by the browser"), a = !1);
        this.qp = a
    },
    wA: function(a) {
        this.s = a
    },
    $f: function(a) {
        null === a ? this.g = null : this.g = a
    },
    Nq: function() {
        var a = location.hash;
        var b = "";
        "" !== a && (b = a.split("CKT=").pop().split("#")[0]);
        return b
    },
    I: function(a,
        b) {
        this.ye = a;
        0 >= b && (b = 0);
        this.Kl(b)
    },
    CA: function(a) {
        this.li = a
    },
    yx: function(a) {
        this.ye = a
    },
    Da: function() {
        return this.Va
    },
    error: function(a) {
        this.Ac || y.error(a);
        var b = null !== this.ob ? this.ob.ErrorReconnectTime : 1E4;
        y.info("Will restart in " + b + "ms");
        null !== this.s && (this.ki = new eb(this.s, this.ob));
        this.Dl();
        this.gx();
        if (this.Ac) {
            var c = this.ak.ProgrammingSystemModeErrorText;
            window.ProgrammingSystemAccess && window.ProgrammingSystemAccess.errorOccurred(c, a)
        } else c = "An error happened; will automatically restart";
        this.$i(c);
        this.I(new fb(this), b)
    },
    Gz: function() {
        this.Hr("The webvisualization license expired.", "License Expired")
    },
    Hr: function(a, b) {
        y.warn(a + " Webvisualization is stopped");
        this.$i(b);
        this.Dl();
        this.yx(new fb(this))
    },
    BA: function(a) {
        this.Sa = a
    },
    Kl: function(a) {
        var b = this;
        this.gb = window.setTimeout(function() {
            b.xo()
        }, a)
    },
    $b: function(a) {
        null !== this.Sa && (this.Sa.push(a), null !== this.ye && this.ye.gm() && (clearTimeout(this.gb), this.Kl(0)))
    },
    vw: function() {
        if (!this.Ac) {
            var a = this.s;
            null === a && null !== this.ki &&
                this.ki.gB() && (a = this.ki.ci);
            null !== a && a.L !== D.i && a.bg !== D.R && (new qa(this, a)).b()
        }
    },
    gx: function() {
        var a = this.Va.Y,
            b;
        for (b = 0; 20 > b; ++b) a.restore()
    },
    Bt: function() {
        C.jn(this.jh, "ProgrammingSystemMode", !1) ? (this.Ac = !0, CefSharp.BindObjectAsync("ProgrammingSystemAccess")) : this.Ac = !1
    },
    changeUpdateRate: function(a) {
        null !== this.ob && (a < this.ob.UpdateRate && null !== this.ye && (clearTimeout(this.gb), this.Kl(0)), this.ob.UpdateRate = a)
    }
};
var WebvisuAutotest;
WebvisuAutotest = function(a, b) {
    this.a = a;
    this.qt = b
};
WebvisuAutotest.prototype = {
    raiseMouse: function(a, b, c) {
        var d = window.document.elementFromPoint(b, c);
        var e = {
            bubbles: !0,
            cancelable: "mousemove" !== a,
            view: window,
            detail: 0,
            screenX: b,
            screenY: c,
            clientX: b,
            clientY: c,
            ctrlKey: !1,
            altKey: !1,
            shiftKey: !1,
            metaKey: !1,
            button: 0,
            relatedTarget: d
        };
        if (q.R()) {
            a = this.Ir(a);
            var f = {};
            this.Qq(f, e, d);
            f.pointerType = "mouse";
            f = new PointerEvent(a, f)
        } else f = window.document.createEvent("MouseEvents"), f.initMouseEvent(a, e.bubbles, e.cancelable, e.view, e.detail, e.screenX, e.screenY, e.clientX,
            e.clientY, e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.button, d);
        this.uq(f, b, c, d)
    },
    raiseTouch: function(a, b, c, d) {
        var e = window.document.elementFromPoint(b, c);
        d = {
            bubbles: !0,
            cancelable: "touchmove" !== a,
            view: window,
            detail: 0,
            screenX: b,
            screenY: c,
            clientX: b,
            clientY: c,
            pointerId: d,
            ctrlKey: !1,
            altKey: !1,
            shiftKey: !1,
            metaKey: !1,
            button: 0,
            relatedTarget: e
        };
        a = this.Ir(a);
        var f = {};
        this.Qq(f, d, e);
        f.pointerId = d.pointerId;
        f.pointerType = "touch";
        a = new PointerEvent(a, f);
        this.uq(a, b, c, e)
    },
    Qq: function(a, b, c) {
        a.isPrimary = !0;
        a.bubbles =
            b.bubbles;
        a.cancelable = b.cancelable;
        a.view = b.view;
        a.detail = b.detail;
        a.screenX = b.screenX;
        a.clientX = b.clientX;
        a.screenY = b.screenY;
        a.clientY = b.clientY;
        a.ctrlKey = b.ctrlKey;
        a.altKey = b.altKey;
        a.shiftKey = b.shiftKey;
        a.metaKey = b.metaKey;
        a.button = b.button;
        a.relatedTarget = c
    },
    uq: function(a, b, c, d) {
        Object.defineProperty(a, "layerX", {
            value: b
        });
        Object.defineProperty(a, "layerY", {
            value: c
        });
        a.button = 1;
        a.which = 1;
        d.dispatchEvent(a)
    },
    Ir: function(a) {
        switch (a) {
            case "touchmove":
            case "mousemove":
                return "pointermove";
            case "touchup":
            case "mouseup":
                return "pointerup";
            case "touchdown":
            case "mousedown":
                return "pointerdown"
        }
    },
    raiseKey: function(a, b, c, d, e) {
        var f = this.a.Sc.Hb;
        null !== f ? this.el(b) ? this.tp(f, a, b, c, d, e, !0) : this.Uw(f, b, a, c) : this.tp(window.document.getElementById(this.qt), a, b, c, d, e, !1)
    },
    el: function(a) {
        return 13 === a || 27 === a || 37 === a || 38 === a || 39 === a || 40 === a
    },
    Uw: function(a, b, c, d) {
        if ("keypress" === c) {
            c = a.selectionStart;
            var e = a.selectionEnd;
            b = String.fromCharCode(b);
            d || (b = b.toLowerCase());
            a.value = a.value.substr(0, c) + b + a.value.substr(e);
            c === e && this.jv(a);
            this.wx(a,
                c + 1)
        }
    },
    wx: function(a, b) {
        a.setSelectionRange ? (a.focus(), a.setSelectionRange(b, b)) : a.createTextRange && (a = a.createTextRange(), a.collapse(!0), a.moveEnd("character", b), a.moveStart("character", b), a.select())
    },
    jv: function(a) {
        var b = 0;
        if (document.selection) a.focus(), b = document.selection.createRange(), b.moveStart("character", -a.value.length), b = b.text.length;
        else if (a.selectionStart || "0" === a.selectionStart) b = a.selectionStart;
        return b
    },
    Xv: function(a, b) {
        return b || this.el(a) ? a : String.fromCharCode(a).toLowerCase().charCodeAt(0) &
            255
    },
    tp: function(a, b, c, d, e, f, g) {
        var h, l, r = c;
        "keypress" === b && (r = this.Xv(c, d));
        if (void 0 !== window.document.createEventObject) c = document.createEvent("Events"), c.initEvent(b, !0, !0), c.which = r, c.keyCode = r, c.shiftKey = d, c.ctrlKey = f, c.altKey = e, c.metaKey = !1;
        else {
            var v = l = h = r;
            c = window.document.createEvent("KeyboardEvent");
            void 0 === c.initKeyboardEvent ? c.initKeyEvent(b, !0, !0, null, f, e, d, !1, h, l, v, a) : c.initKeyboardEvent(b, !0, !0, null, f, e, d, !1, h, l, v, a);
            delete c.keyCode;
            Object.defineProperty(c, "keyCode", {
                value: r
            });
            delete c.charCode;
            Object.defineProperty(c, "charCode", {
                value: 0
            });
            delete c.shiftKey;
            Object.defineProperty(c, "shiftKey", {
                value: d
            });
            delete c.ctrlKey;
            Object.defineProperty(c, "ctrlKey", {
                value: f
            });
            delete c.altKey;
            Object.defineProperty(c, "altKey", {
                value: e
            });
            delete c.metaKey;
            Object.defineProperty(c, "metaKey", {
                value: !1
            });
            delete c.which;
            d = r;
            if ("keypress" === b && this.el(r) && 13 !== r || g) d = 0;
            Object.defineProperty(c, "which", {
                value: d
            });
            delete c.target;
            Object.defineProperty(c, "target", {
                value: a
            })
        }
        a.dispatchEvent(c)
    }
};
var WebvisuExtensionMgr;
(function() {
    var a = function() {
        this.Lk = [];
        this.gf = {}
    };
    a.prototype = {
        register: function(b) {
            if (null === b) throw Error("null value not expected");
            if ("function" !== typeof b.instantiateIf) throw Error("function instantiateIf of extensionFactory expected");
            this.Lk.push(b)
        },
        RA: function(b) {
            this.ba = b
        },
        openControlRelative: function(b, c, d, e, f, g) {
            if (null === b) throw Error("null value not expected");
            if ("number" !== typeof c) throw new TypeError("Expected numeric value");
            if ("number" !== typeof d) throw new TypeError("Expected numeric value");
            if ("number" !== typeof e) throw new TypeError("Expected numeric value");
            if ("number" !== typeof f) throw new TypeError("Expected numeric value");
            if (null === g) throw Error("null value not expected");
            c = new I(c, d, c + e, d + f);
            d = t.Dd(g);
            c = c.ac(d.m, d.o);
            this.ba ? g.appendChild(b) : (t.Cd(b, c), b.style.zIndex = 300, g.parentNode.appendChild(b));
            g.dn = b
        },
        lB: function(b) {
            var c;
            for (c = 0; c < this.Lk.length; ++c) {
                var d = this.Lk[c].instantiateIf(b);
                if (null !== d && void 0 !== d) {
                    if (this.Zx(d)) return d;
                    break
                }
            }
            return null
        },
        My: function() {
            var b;
            for (b = 0; b < this.gf.length; ++b) this.gf[b] && this.pm(b);
            this.gf = []
        },
        Fy: function(b, c, d, e) {
            b.create(d.m, d.o, d.w(), d.v(), e);
            this.gf[c] = b
        },
        pm: function(b) {
            var c = this.xi(b);
            null !== c && (c.destroy(), delete this.gf[b])
        },
        Ey: function(b, c) {
            b = this.xi(b);
            null !== b && b.setVisibility(c)
        },
        Dy: function(b, c) {
            b = this.xi(b);
            null !== b && b.move(c.m, c.o, c.w(), c.v())
        },
        Cy: function(b, c, d) {
            b = this.xi(b);
            return null === b ? null : b.invoke(c, d)
        },
        xi: function(b) {
            var c = this.gf[b];
            return c ? c : (y.warn("Not existing extension with id " + b + " accessed; ignored"),
                null)
        },
        Zx: function(b) {
            return this.rg(b, "create") && this.rg(b, "setVisibility") && this.rg(b, "move") && this.rg(b, "invoke") && this.rg(b, "destroy") ? !0 : !1
        },
        rg: function(b, c) {
            return "function" !== typeof b[c] ? (y.warn("Extension object is missing an implementation of '" + c + "'"), !1) : !0
        }
    };
    WebvisuExtensionMgr = new a
})();
var p;
p = function(a) {
    void 0 === a && (a = 10);
    this.M = new ArrayBuffer(a);
    this.Qc = new Uint8Array(this.M);
    this.Ca = 0
};
p.b = function(a) {
    return q.bd() ? new ea : new p(a)
};
p.prototype = {
    hx: function() {
        this.Ap(this.kw(this.M.byteLength))
    },
    Ap: function(a) {
        var b = this.Qc;
        this.M = new ArrayBuffer(a);
        this.Qc = new Uint8Array(this.M);
        for (a = 0; a < this.Ca; ++a) this.Qc[a] = b[a]
    },
    kw: function(a) {
        return 500 > a ? 2 * a : Math.floor(1.3 * a)
    },
    Zi: function(a, b) {
        this.Qc[a] = b
    },
    hr: function(a) {
        a > this.M.byteLength && this.Ap(a)
    },
    oj: function(a) {
        this.Ca >= this.M.byteLength && this.hx();
        var b = this.Ca;
        this.Ca++;
        this.Zi(b, a)
    },
    fm: function(a, b, c) {
        var d = new Uint8Array(a);
        this.hr(this.size() + c);
        if (200 < c && 0 === b % 4 && 0 === this.Ca %
            4 && !q.fs()) {
            var e = Math.floor(c / 4);
            var f = Math.floor(this.Ca / 4);
            a = new Uint32Array(a, 4 * Math.floor(b / 4), e);
            var g = new Uint32Array(this.M, 4 * f, e),
                h = c - 4 * e;
            for (f = 0; f < e; ++f) g[f] = a[f];
            for (f = 0; f < h; ++f) this.Qc[this.Ca + f + 4 * e] = d[b + f + 4 * e]
        } else if (d.slice) this.Qc.set(d.slice(b, b + c), this.Ca);
        else
            for (f = 0; f < c; ++f) this.Qc[this.Ca + f] = d[b + f];
        this.Ca += c
    },
    Hm: function(a, b) {
        this.Zi(a, b)
    },
    Hq: function(a) {
        return this.Qc[a]
    },
    size: function() {
        return this.Ca
    },
    Hc: function() {
        var a = new ArrayBuffer(this.Ca),
            b = new Uint8Array(this.M),
            c = new Uint8Array(a);
        if (b.slice) c.set(b.slice(0, this.Ca), 0);
        else {
            var d;
            for (d = 0; d < this.Ca; ++d) c[d] = b[d]
        }
        return a
    }
};
var ea;
(function() {
    function a(b) {
        return String.fromCharCode((b >> 4) + 65) + String.fromCharCode((b & 15) + 65)
    }
    ea = function() {
        this.M = "";
        this.Ca = 0
    };
    ea.prototype = {
        Zi: function(b, c) {
            var d = null,
                e = null;
            0 < b && (d = this.M.substr(0, 2 * b));
            b < this.Ca - 1 && (e = this.M.substr(2 * b + 2, this.M.length - 2 * b - 2));
            b = "";
            null !== d && (b = d);
            b = b.concat(a(c));
            null !== e && (b = b.concat(e));
            this.M = b
        },
        hr: function() {},
        oj: function(b) {
            this.M = this.M.concat(a(b));
            this.Ca++
        },
        oy: function(b) {
            var c = "",
                d;
            for (d = 0; d < b.length; ++d) c = c.concat(a(b.charCodeAt(d)));
            this.M = this.M.concat(c);
            this.Ca += c.length / 2
        },
        fm: function(b, c, d) {
            this.M = this.M.concat(b.substr(2 * c, 2 * d));
            this.Ca += d
        },
        Hm: function(b, c) {
            this.Zi(b, c)
        },
        Hq: function(b) {
            return this.M.charCodeAt(2 * b) - 65 << 4 | this.M.charCodeAt(2 * b + 1) - 65
        },
        size: function() {
            return this.Ca
        },
        Hc: function() {
            return this.M
        }
    }
})();
var J;
(function() {
    function a(g, h, l) {
        return function() {
            if (0 === this.j % l && (1 === l || this.ca)) try {
                return (new g[h + "Array"](this.M, this.j, 1))[0]
            } catch (r) {}
            return null
        }
    }

    function b(g, h, l) {
        return function() {
            var r = this["getOptimized" + h]();
            null === r && (r = this["_get" + h]());
            this.j += l;
            return r
        }
    }

    function c(g, h, l) {
        J.prototype["getOptimized" + h] = a(this, h, l);
        J.prototype["get" + h] = b(this, h, l)
    }
    J = function(g, h, l, r, v) {
        if (!(g instanceof ArrayBuffer)) throw new TypeError("BinaryReader requires an ArrayBuffer");
        if (void 0 === h) throw Error("Byteorder must be explicitly assigned");
        void 0 === l && (l = (new Configuration).ya());
        void 0 === r && (r = 0);
        void 0 === v && (v = g.byteLength);
        if (!(l instanceof aa)) throw new TypeError("BinaryReader requires a WebVisuTextDecoder");
        if (0 > r) throw Error("Invalid start offset");
        if (0 === v || r + v > g.byteLength) throw Error("Valid data range exceeded");
        this.ca = h;
        this.Gd = v;
        this.M = g;
        this.j = r;
        this.Qc = new Uint8Array(this.M);
        this.Zd = l;
        this.F = new gb(this, this.ca)
    };
    J.b = function(g, h, l, r, v) {
        return q.$z() ? new hb(g, h, l, r, v) : q.bd() ? new ib(g, h, l, r, v) : new J(g, h, l, r, v)
    };
    J.prototype = {
        Se: function() {
            return this.ca
        },
        Ue: function() {
            return this.Zd
        },
        aa: function(g, h) {
            var l = g * (h ? 2 : 1);
            if (0 > g || this.j + l > this.M.byteLength) throw Error("INDEX_SIZE_ERR: DOM Exception 1");
            g = this.F.er(this.M, this.j, g, l, h, this.Zd);
            this.j += l;
            return g
        },
        Ic: function(g) {
            return this.F.Ic(g)
        },
        Vf: function() {
            return String.fromCharCode(this.getUint8())
        },
        Qe: function() {
            return this.j >= this.Gd
        },
        S: function() {
            return this.j
        },
        seek: function(g) {
            this.j = g
        },
        size: function() {
            return this.Gd
        },
        i: function() {
            return this.F.qq()
        },
        b: function() {
            return this.F.pq()
        },
        R: function() {
            return this.F.sq()
        },
        lb: function() {
            return this.F.om()
        },
        A: function() {
            return this.F.rq()
        },
        Ia: function() {
            return this.F.nm()
        },
        pa: function() {
            return this.F.tq()
        },
        fa: function() {
            return this.F.ge()
        },
        Lb: function() {
            return this.F.zd()
        },
        ja: function(g) {
            return this.Qc[g]
        },
        getUint8: function() {
            var g = this.ja(this.j);
            this.j++;
            return g
        },
        Uf: function() {
            return this.M
        }
    };
    var d = {
            Int8: 1,
            Int16: 2,
            Int32: 4,
            Uint16: 2,
            Uint32: 4,
            Float32: 4,
            Float64: 8
        },
        e;
    for (e in d)
        if (d.hasOwnProperty(e)) {
            c(this, e, d[e]);
            var f = "_getFloat64";
            J.prototype[f] = J.prototype.i;
            f = "_getFloat32";
            J.prototype[f] = J.prototype.b;
            f = "_getInt64";
            J.prototype[f] = J.prototype.fa;
            f = "_getUint64";
            J.prototype[f] = J.prototype.Lb;
            f = "_getInt32";
            J.prototype[f] = J.prototype.R;
            f = "_getUint32";
            J.prototype[f] = J.prototype.lb;
            f = "_getInt16";
            J.prototype[f] = J.prototype.A;
            f = "_getUint16";
            J.prototype[f] = J.prototype.Ia;
            f = "_getInt8";
            J.prototype[f] = J.prototype.pa
        }
})();
var Ia;
Ia = function(a) {
    this.F = a
};
Ia.prototype = {
    Se: function() {
        return this.F.Se()
    },
    Ue: function() {
        return this.F.Ue()
    },
    aa: function(a, b) {
        return this.F.aa(a, b)
    },
    Ic: function(a) {
        return this.F.Ic(a)
    },
    Vf: function() {
        return this.F.Vf()
    },
    Qe: function() {
        return this.F.Qe()
    },
    S: function() {
        return this.F.S()
    },
    seek: function(a) {
        this.F.seek(a)
    },
    size: function() {
        return this.F.size()
    },
    getFloat64: function() {
        this.hf(8);
        return this.F.getFloat64()
    },
    getFloat32: function() {
        this.hf(4);
        return this.F.getFloat32()
    },
    getInt32: function() {
        this.hf(4);
        return this.F.getInt32()
    },
    getUint32: function() {
        this.hf(4);
        return this.F.getUint32()
    },
    getInt16: function() {
        this.hf(2);
        return this.F.getInt16()
    },
    getUint16: function() {
        this.hf(2);
        return this.F.getUint16()
    },
    getInt8: function() {
        return this.F.getInt8()
    },
    getUint8: function() {
        return this.F.getUint8()
    },
    ja: function(a) {
        return this.F.ja(a)
    },
    Uf: function() {
        return this.F.Uf()
    },
    hf: function(a) {
        if (8 === a || 4 === a || 2 === a) {
            var b = this.F.S();
            0 !== b % a && this.F.seek(b + a - b % a)
        }
    }
};
var hb;
hb = function(a, b, c, d, e) {
    if (!(a instanceof ArrayBuffer)) throw new TypeError("BinaryReader_DataView requires an ArrayBuffer");
    if (void 0 === b) throw Error("Byteorder must be explicitly assigned");
    void 0 === c && (c = (new Configuration).ya());
    void 0 === d && (d = 0);
    void 0 === e && (e = a.byteLength);
    if (!(c instanceof aa)) throw new TypeError("BinaryReader_DataView requires a WebVisuTextDecoder");
    if (0 > d) throw Error("Invalid start offset");
    if (0 === e || d + e > a.byteLength) throw Error("Valid data range exceeded");
    this.ca = b;
    this.pc =
        new DataView(a, 0, e + d);
    this.Gd = e;
    this.M = a;
    this.j = d;
    this.Zd = c;
    this.F = new gb(this, this.ca)
};
hb.prototype = {
    Se: function() {
        return this.ca
    },
    Ue: function() {
        return this.Zd
    },
    aa: function(a, b) {
        var c = a * (b ? 2 : 1);
        if (0 > a || 2 * (this.j + c) > this.M.length) throw Error("INDEX_SIZE_ERR: DOM Exception 1");
        a = this.F.er(this.M, this.j, a, c, b, this.Zd);
        this.j += c;
        return a
    },
    Ic: function(a) {
        return this.F.Ic(a)
    },
    Vf: function() {
        return String.fromCharCode(this.getUint8())
    },
    Qe: function() {
        return this.j >= this.Gd
    },
    S: function() {
        return this.j
    },
    seek: function(a) {
        this.j = a
    },
    size: function() {
        return this.Gd
    },
    getFloat64: function() {
        var a = this.pc.getFloat64(this.j,
            this.ca);
        this.j += 8;
        return a
    },
    getFloat32: function() {
        var a = this.pc.getFloat32(this.j, this.ca);
        this.j += 4;
        return a
    },
    ge: function() {
        if ("function" === typeof this.pc.ge) {
            var a = this.pc.ge(this.j, this.ca);
            this.j += 8
        } else a = this.F.ge();
        return a
    },
    zd: function() {
        if ("function" === typeof this.pc.zd) {
            var a = this.pc.zd(this.j, this.ca);
            this.j += 8
        } else a = this.F.zd();
        return a
    },
    getInt32: function() {
        var a = this.pc.getInt32(this.j, this.ca);
        this.j += 4;
        return a
    },
    getUint32: function() {
        var a = this.pc.getUint32(this.j, this.ca);
        this.j +=
            4;
        return a
    },
    getInt16: function() {
        var a = this.pc.getInt16(this.j, this.ca);
        this.j += 2;
        return a
    },
    getUint16: function() {
        var a = this.pc.getUint16(this.j, this.ca);
        this.j += 2;
        return a
    },
    getInt8: function() {
        var a = this.pc.getInt8(this.j);
        this.j++;
        return a
    },
    getUint8: function() {
        var a = this.ja(this.j);
        this.j++;
        return a
    },
    ja: function(a) {
        return this.pc.getUint8(a)
    },
    Uf: function() {
        return this.M
    }
};
var ib;
ib = function(a, b, c, d, e) {
    if ("string" !== typeof a) throw new TypeError("BinaryReader_StringBased expects a string");
    if (void 0 === b) throw Error("Byteorder must be explicitly assigned");
    void 0 === c && (c = (new Configuration).ya());
    void 0 === d && (d = 0);
    void 0 === e && (e = a.length / 2);
    if (!(c instanceof aa)) throw new TypeError("BinaryReader requires a WebVisuTextDecoder");
    if (0 > d) throw Error("Invalid start offset");
    if (0 === e || d + e > a.length / 2) throw Error("Valid data range exceeded");
    this.ca = b;
    this.Gd = e;
    this.M = a;
    this.j = d;
    this.Zd =
        c;
    this.F = new gb(this, b)
};
ib.prototype = {
    Se: function() {
        return this.ca
    },
    Ue: function() {
        return this.Zd
    },
    aa: function(a, b) {
        var c = a * (b ? 2 : 1);
        if (0 > a || 2 * (this.j + c) > this.M.length) throw Error("INDEX_SIZE_ERR: DOM Exception 1");
        var d = Array(a);
        if (b) {
            if (this.ca)
                for (b = 0; b < a; ++b) {
                    var e = 2 * b + this.j;
                    d[b] = (this.ja(e + 1) << 8) + this.ja(e)
                } else
                    for (b = 0; b < a; ++b) e = 2 * b + this.j, d[b] = this.ja(e + 1) + (this.ja(e) << 8);
            a = String.fromCharCode.apply(null, d)
        } else {
            for (b = this.j; b < this.j + a; ++b) d[b - this.j] = this.ja(b);
            a = this.Zd.Ly(d)
        }
        this.j += c;
        return a
    },
    Ic: function(a) {
        return this.F.Ic(a)
    },
    Vf: function() {
        return String.fromCharCode(this.getUint8())
    },
    Qe: function() {
        return this.j >= this.Gd
    },
    S: function() {
        return this.j
    },
    seek: function(a) {
        this.j = a
    },
    size: function() {
        return this.Gd
    },
    getFloat64: function() {
        var a = this.F.qq();
        this.j += 8;
        return a
    },
    getFloat32: function() {
        var a = this.F.pq();
        this.j += 4;
        return a
    },
    ge: function() {
        return this.F.ge()
    },
    zd: function() {
        return this.F.zd()
    },
    getInt32: function() {
        var a = this.F.sq();
        this.j += 4;
        return a
    },
    getUint32: function() {
        var a = this.F.om();
        this.j += 4;
        return a
    },
    getInt16: function() {
        var a =
            this.F.rq();
        this.j += 2;
        return a
    },
    getUint16: function() {
        var a = this.F.nm();
        this.j += 2;
        return a
    },
    getInt8: function() {
        var a = this.F.tq();
        this.j++;
        return a
    },
    getUint8: function() {
        var a = this.ja(this.j);
        this.j++;
        return a
    },
    ja: function(a) {
        return this.M.charCodeAt(2 * a) - 65 << 4 | this.M.charCodeAt(2 * a + 1) - 65
    },
    Uf: function() {
        return this.M
    }
};
var gb;
gb = function(a, b) {
    this.da = a;
    this.ca = b
};
gb.prototype = {
    Ic: function(a) {
        var b = this.da.S(),
            c = 0;
        if (a)
            for (; 0 !== this.da.getUint16();) c++;
        else
            for (; 0 !== this.da.getUint8();) c++;
        this.da.seek(b);
        b = this.da.aa(c, a);
        a ? this.da.getUint16() : this.da.getUint8();
        return b
    },
    qq: function() {
        var a = this.da.S(),
            b = this.da.ja(this.bb(a, 0, 8)),
            c = this.da.ja(this.bb(a, 1, 8)),
            d = this.da.ja(this.bb(a, 2, 8)),
            e = this.da.ja(this.bb(a, 3, 8)),
            f = this.da.ja(this.bb(a, 4, 8)),
            g = this.da.ja(this.bb(a, 5, 8)),
            h = this.da.ja(this.bb(a, 6, 8)),
            l = this.da.ja(this.bb(a, 7, 8));
        a = 1 - 2 * (b >> 7);
        b = ((b << 1 & 255) <<
            3 | c >> 4) - (Math.pow(2, 10) - 1);
        c = (c & 15) * Math.pow(2, 48) + d * Math.pow(2, 40) + e * Math.pow(2, 32) + f * Math.pow(2, 24) + g * Math.pow(2, 16) + h * Math.pow(2, 8) + l;
        return 1024 === b ? 0 !== c ? NaN : Infinity * a : -1023 === b ? a * c * Math.pow(2, -1074) : a * (1 + c * Math.pow(2, -52)) * Math.pow(2, b)
    },
    pq: function() {
        var a = this.da.S(),
            b = this.da.ja(this.bb(a, 0, 4)),
            c = this.da.ja(this.bb(a, 1, 4)),
            d = this.da.ja(this.bb(a, 2, 4)),
            e = this.da.ja(this.bb(a, 3, 4));
        a = 1 - 2 * (b >> 7);
        b = (b << 1 & 255 | c >> 7) - 127;
        c = (c & 127) << 16 | d << 8 | e;
        return 128 === b ? 0 !== c ? NaN : Infinity * a : -127 === b ? a * c * Math.pow(2,
            -149) : a * (1 + c * Math.pow(2, -23)) * Math.pow(2, b)
    },
    sq: function() {
        var a = this.om();
        return a > Math.pow(2, 31) - 1 ? a - Math.pow(2, 32) : a
    },
    om: function() {
        var a = this.da.S(),
            b = this.da.ja(this.bb(a, 0, 4)),
            c = this.da.ja(this.bb(a, 1, 4)),
            d = this.da.ja(this.bb(a, 2, 4));
        a = this.da.ja(this.bb(a, 3, 4));
        return b * Math.pow(2, 24) + (c << 16) + (d << 8) + a
    },
    rq: function() {
        var a = this.nm();
        return a > Math.pow(2, 15) - 1 ? a - Math.pow(2, 16) : a
    },
    nm: function() {
        var a = this.da.S(),
            b = this.da.ja(this.bb(a, 0, 2));
        a = this.da.ja(this.bb(a, 1, 2));
        return (b << 8) + a
    },
    tq: function() {
        var a =
            this.da.ja(this.da.S());
        return a > Math.pow(2, 7) - 1 ? a - Math.pow(2, 8) : a
    },
    er: function(a, b, c, d, e, f) {
        var g = null;
        if (e) {
            if (this.ca && 0 === b % 2) try {
                g = new Int16Array(a, b, c)
            } catch (h) {}
            if (null === g)
                if (g = new Int16Array(Array(c)), b = new Uint8Array(a, b, d), this.ca)
                    for (a = 0; a < c; ++a) g[a] = (b[2 * a + 1] << 8) + b[2 * a];
                else
                    for (a = 0; a < c; ++a) g[a] = b[2 * a + 1] + (b[2 * a] << 8);
            b = [];
            for (a = 0; a < c; ++a) b[a] = g[a];
            return String.fromCharCode.apply(null, b)
        }
        g = new Int8Array(a, b, c);
        return f.decode(g)
    },
    zd: function() {
        var a = this.da.getUint32(),
            b = this.da.getUint32();
        return this.ca ? a + b * Math.pow(2, 32) : a * Math.pow(2, 32) + b
    },
    ge: function() {
        var a = this.zd();
        return a > Math.pow(2, 63) - 1 ? a - Math.pow(2, 64) : a
    },
    bb: function(a, b, c) {
        return a + (this.ca ? c - b - 1 : b)
    }
};
var O;
O = function(a, b, c) {
    if (!(a instanceof p)) throw new TypeError("BinaryWriter expects a BinaryBuffer");
    if (void 0 === b) throw Error("Byteorder must be explicitly assigned");
    this.ze = a;
    this.ca = b;
    this.Ub = -1;
    this.Fk = c
};
O.b = function(a, b, c) {
    c = new jb(c);
    return q.bd() ? new kb(a, b, c) : new O(a, b, c)
};
O.prototype = {
    Hx: function(a) {
        var b = a.length / 2,
            c;
        if (1 !== b && 2 !== b && 4 !== b) throw Error("Unexpected size for swapping");
        for (c = 0; c < b; ++c) {
            var d = a[c];
            a[c] = a[a.length - c - 1];
            a[a.length - c - 1] = d
        }
    },
    we: function(a, b, c) {
        var d = new ArrayBuffer(c);
        b = new b(d);
        d = new Uint8Array(d);
        b[0] = a;
        1 < c && !this.ca && this.Hx(d, c);
        for (a = 0; a < c; ++a) this.Cn(d[a])
    },
    Cn: function(a) {
        -1 !== this.Ub ? (this.ze.Hm(this.Ub, a), this.Ub++) : this.ze.oj(a)
    },
    seek: function(a) {
        this.Ub = a
    },
    S: function() {
        return -1 !== this.Ub ? this.Ub : this.ze.size()
    },
    pj: function(a) {
        var b = [204, 221],
            c;
        for (c = 0; c < a; ++c) this.va(b[c % 2])
    },
    va: function(a) {
        this.Cn(a)
    },
    cq: function(a) {
        this.we(a, Int8Array, 1)
    },
    Wa: function(a) {
        this.we(a, Uint16Array, 2)
    },
    Db: function(a) {
        this.we(a, Int16Array, 2)
    },
    B: function(a) {
        this.we(a, Uint32Array, 4)
    },
    bq: function(a) {
        this.we(a, Int32Array, 4)
    },
    em: function(a) {
        this.we(a, Float32Array, 4)
    },
    aq: function(a) {
        this.we(a, Float64Array, 8)
    },
    ee: function(a, b) {
        this.pg(a, b, !1)
    },
    Eb: function(a, b) {
        this.pg(a, b, !0)
    },
    pg: function(a, b, c) {
        for (var d = 0; d < a.length; ++d) {
            var e = a.charCodeAt(d);
            b ? this.Wa(e) :
                128 > e ? this.va(e) : this.va(this.Fk.yq(e))
        }
        c && (b ? this.Wa(0) : this.va(0))
    }
};
var kb;
kb = function(a, b, c) {
    if (!(a instanceof ea)) throw new TypeError("BinaryWriter expects a BinaryBuffer_StringBased");
    if (void 0 === b) throw Error("Byteorder must be explicitly assigned");
    this.ze = a;
    this.ca = b;
    this.Ub = -1;
    this.Fk = c
};
kb.prototype = {
    Fd: function(a) {
        if (-1 !== this.Ub)
            for (var b = 0; b < a.length; ++b) this.ze.Hm(this.Ub, a.charCodeAt(b) & 255), this.Ub++;
        else this.ze.oy(a)
    },
    seek: function(a) {
        this.Ub = a
    },
    S: function() {
        return -1 !== this.Ub ? this.Ub : this.ze.size()
    },
    pj: function(a) {
        var b = [204, 221],
            c;
        for (c = 0; c < a; ++c) this.va(b[c % 2])
    },
    va: function(a) {
        this.Fd(this.qf(a, 8, !1))
    },
    cq: function(a) {
        this.Fd(this.qf(a, 8, !0))
    },
    Wa: function(a) {
        this.Fd(this.qf(a, 16, !1))
    },
    Db: function(a) {
        this.Fd(this.qf(a, 16, !0))
    },
    B: function(a) {
        this.Fd(this.qf(a, 32, !1))
    },
    bq: function(a) {
        this.Fd(this.qf(a,
            32, !0))
    },
    em: function(a) {
        this.Fd(this.vo(a, 23, 8))
    },
    aq: function(a) {
        this.Fd(this.vo(a, 52, 11))
    },
    ee: function(a, b) {
        this.pg(a, b, !1)
    },
    Eb: function(a, b) {
        this.pg(a, b, !0)
    },
    pg: function(a, b, c) {
        for (var d = 0; d < a.length; ++d) {
            var e = a.charCodeAt(d);
            b ? this.Wa(e) : 128 > e ? this.va(e) : this.va(this.Fk.yq(e))
        }
        c && (b ? this.Wa(0) : this.va(0))
    },
    vo: function(a, b, c) {
        var d = Math.pow(2, c - 1) - 1,
            e = -d + 1,
            f = e - b,
            g = parseFloat(a),
            h = isNaN(g) || -Infinity === g || Infinity === g ? g : 0,
            l = 0,
            r = 2 * d + 1 + b + 3,
            v = Array(r),
            u = 0 > (g = 0 !== h ? 0 : g),
            x = Math.floor(g = Math.abs(g)),
            z = g - x,
            B;
        for (a = r; a; v[--a] = 0);
        for (a = d + 2; x && a; v[--a] = x % 2, x = Math.floor(x / 2));
        for (a = d + 1; 0 < z && a;
            (v[++a] = (1 <= (z *= 2)) - 0) && --z);
        for (a = -1; ++a < r && !v[a];);
        if (v[(g = b - 1 + (a = (l = d + 1 - a) >= e && l <= d ? a + 1 : d + 1 - (l = e - 1))) + 1]) {
            if (!(B = v[g]))
                for (z = g + 2; !B && z < r; B = v[z++]);
            for (z = g + 1; B && 0 <= --z;
                (v[z] = !v[z] - 0) && (B = 0));
        }
        for (a = 0 > a - 2 ? -1 : a - 3; ++a < r && !v[a];);
        (l = d + 1 - a) >= e && l <= d ? ++a : l < e && (l !== d + 1 - r && l < f && this.warn("encodeFloat::float underflow"), a = d + 1 - (l = e - 1));
        if (x || 0 !== h) this.warn(x ? "encodeFloat::float overflow" : "encodeFloat::" + h), l = d + 1, a =
            d + 2, -Infinity === h ? u = 1 : isNaN(h) && (v[a] = 1);
        g = Math.abs(l + d);
        z = c + 1;
        for (c = ""; --z; c = g % 2 + c, g = g >>= 1);
        z = g = 0;
        a = (c = (u ? "1" : "0") + c + v.slice(a, a + b).join("")).length;
        for (b = []; a; z = (z + 1) % 8) g += (1 << z) * c.charAt(--a), 7 === z && (b[b.length] = String.fromCharCode(g), g = 0);
        b[b.length] = g ? String.fromCharCode(g) : "";
        return (this.ca ? b : b.reverse()).join("")
    },
    qf: function(a, b, c) {
        var d = [],
            e = Math.pow(2, b);
        if (c) {
            if (c = -Math.pow(2, b - 1), a > -c - 1 || a < c) this.Vp("encodeInt::overflow"), a = 0
        } else if (a > e || 0 > a) this.Vp("encodeInt::overflow"), a = 0;
        for (0 > a &&
            (a += e); a; a = Math.floor(a / 256)) d[d.length] = String.fromCharCode(a % 256);
        for (b = -(-b >> 3) - d.length; b; b--) d[d.length] = String.fromCharCode(0);
        return (this.ca ? d : d.reverse()).join("")
    },
    Vp: function(a) {
        throw Error(a);
    }
};
var lb;
lb = function(a, b, c) {
    this.F = J.b(a, b, c, void 0, void 0)
};
lb.prototype = {
    Wf: function() {
        var a = 0,
            b = 0;
        do {
            var c = this.F.getUint8();
            a |= (c & 127) << b;
            b += 7
        } while (0 !== (c & 128));
        return a
    }
};
var mb;
mb = function(a, b, c) {
    this.jd = O.b(a, b, c)
};
mb.prototype = {
    u: function(a, b) {
        var c;
        b = void 0 !== b ? b : this.Mq(a);
        if (0 === b) throw Error("Expected value for MBui greater then zero");
        var d = a;
        for (c = 0; c < b - 1; c++) this.jd.va(d & 127 | 128), d >>= 7;
        this.jd.va(d & 127);
        if (0 !== d >> 7) throw Error("Value " + a + " cannot be written as an MBUI with " + b + " bytes");
    },
    Mq: function(a) {
        var b = 0;
        do a >>= 7, b++; while (0 < a);
        return b
    }
};
var nb;
nb = function(a) {
    16 <= a && (a = 0);
    this.jf = a
};
nb.prototype = {
    sr: function(a) {
        16 <= a && (a = 0);
        this.jf = a
    },
    Lz: function() {
        return 0 === this.jf
    },
    right: function() {
        return 0 !== (this.jf & 1)
    },
    left: function() {
        return 0 !== (this.jf & 2)
    },
    top: function() {
        return 0 !== (this.jf & 4)
    },
    bottom: function() {
        return 0 !== (this.jf & 8)
    }
};
var K;
K = function() {};
K.Kz = function(a, b, c, d, e, f, g, h) {
    var l = window.document.createElement("div");
    l.id = "cdsClientObject";
    l.style.position = "absolute";
    if (b) return new ob(l, new pb, h);
    if (c) return new qb(l, new pb, h);
    var r = c = b = null;
    e && (c = new rb(g));
    d && (b = this.xk());
    return f ? (e && (r = window.document.createElement("div"), r.id = "cdsTouchScrollable", r.style.position = "absolute", r.style.cssText += "outline: none; -webkit-tap-highlight-color: transparent;"), new sb(l, new pb, h, b, c, new tb, r, a)) : new P(l, new pb, h, b, c, a)
};
K.pz = function(a, b, c, d) {
    var e = window.document.createElement("div");
    a = a ? window.document.createElement("div") : null;
    var f = this.xk(),
        g = new rb(!1);
    e.id = "cdsDialog";
    e.style.position = "absolute";
    e.style.overflow = "hidden";
    e.style.zIndex = E.Ze;
    a && (a.id = "cdsModal", a.style.top = "0", a.style.left = "0", a.style.width = "100%", a.style.height = "100%", b && (a.style.backgroundColor = "rgb(0,0,0)", a.style.backgroundColor = "rgba(0,0,0,0.4)"), a.style.zIndex = E.Ze, a.style.position = "fixed");
    return new ub(e, new pb, f, g, a, b, c, d)
};
K.Iz = function(a) {
    if ("EmbeddedBrowser" === a || "JustGage" === a) return window[a + "ElementFactory"].createElement()
};
K.Qz = function(a) {
    var b = new rb(!1);
    b.bc(t.ab());
    b.oe(a);
    return b
};
K.zz = function(a) {
    var b = new vb;
    b.bc(t.ab());
    b.oe(a);
    return b
};
K.Dz = function(a, b) {
    var c = this.xk(a ? E.hs : E.Or),
        d;
    a && (c.canvas.id = "cdsSelectionCanvas", c.canvas.style.pointerEvents = "none");
    b ? d = this.Nt() : d = null;
    return new wb(c, d)
};
K.Nt = function() {
    var a = window.document.createElement("div");
    a.id = "cdsClip";
    a.style.overflow = "hidden";
    a.style.position = "absolute";
    a.style.top = "0 px";
    a.style.left = "0 px";
    a.style.width = "-1 px";
    a.style.height = "-1 px";
    a.style.touchAction = "none";
    a.style.zIndex = E.Ye;
    return a
};
K.xk = function(a) {
    var b = window.document.createElement("canvas").getContext("2d");
    b.canvas.id = "cdsCanvas";
    b.canvas.style.position = "absolute";
    b.canvas.style.width = "100%";
    b.canvas.style.height = "100%";
    b.canvas.style.zIndex = void 0 !== a ? a : E.Ye;
    return b
};
K.Az = function(a) {
    return new xb(a)
};
var pb;
pb = function() {
    this.Uc = null
};
pb.prototype = {
    sr: function(a) {
        this.Uc = a
    },
    Sq: function() {
        return 0 !== (this.Uc & 1)
    },
    $y: function() {
        return 0 !== (this.Uc & 2)
    }
};
var xb;
xb = function(a) {
    this.sa = [];
    this.W = null;
    this.Lm(a)
};
xb.prototype = {
    Xa: function() {
        null !== this.W && this.W.Xa()
    },
    handleEvent: function(a, b) {
        return null !== this.W ? this.W.handleEvent(a, b) : !1
    },
    mj: function() {
        null !== this.W && this.W.mj()
    },
    Jc: function(a, b, c) {
        this.W = new ab(a, new Q(a, c, b));
        a = a.W;
        null !== a && (this.W.a.D.vr(a.a.D.Xk), this.W.a.D.Sj(a.a.D.zf));
        this.Lm(this.sa)
    },
    Lm: function(a) {
        this.sa = a;
        if (null !== this.W) {
            this.W.jq();
            for (a = 0; a < this.sa.length; ++a) this.W.Zp(this.sa[a]);
            this.W.Ra instanceof Q && (a = this.W.Ra.wj(), null !== a && void 0 !== a && a instanceof tb && a.Jr(this))
        }
    },
    sB: function(a, b, c, d) {
        var e = this.W.sa.P.length,
            f;
        for (f = 0; f < e; ++f) {
            var g = this.W.sa.Fj(f),
                h = g.info().scroll().wa,
                l = g.info().zoom().wa;
            h.Ar(new w(c, d));
            h.yr(new w(a, b));
            l.Br(1);
            l.zr(1);
            g.K(R.Mh) || g.nh(R.Mh)
        }
    }
};
var tb;
tb = function() {
    this.ih = null;
    this.jl = this.il = this.ld = this.kd = this.Mg = this.Lg = this.Og = this.Ng = 0
};
tb.prototype = {
    Jc: function(a) {
        this.ih = a
    },
    update: function(a, b, c, d, e, f) {
        this.Ng = a;
        this.Og = b;
        this.Lg = c;
        this.Mg = d;
        this.kd = e;
        this.ld = f;
        this.ih(this.kd, this.ld)
    },
    Jr: function(a) {
        null !== a && a.sB(this.kd - this.Ng, this.ld - this.Og, this.kd - this.Lg, this.ld - this.Mg)
    },
    rA: function() {
        return this.Lg - this.Ng
    },
    sA: function() {
        return this.Mg - this.Og
    },
    Jj: function(a, b) {
        this.wv(b.info().scroll())
    },
    Kj: function() {},
    im: function() {},
    wv: function(a) {
        var b = this.jl - a.Fa.f;
        this.kd += this.il - a.Fa.c;
        this.ld += b;
        this.il = a.Fa.c;
        this.jl = a.Fa.f;
        this.ih(this.kd, this.ld)
    },
    zm: function(a) {
        this.jl = this.il = 0;
        return a.info().scroll().ug.ac(a.info().scroll().Fa)
    }
};
var Na;
Na = function() {
    this.Bp = t.ab();
    this.hj = this.gj = this.wd = null
};
Na.prototype = {
    Uz: function(a, b, c, d, e) {
        this.wd = this.Yt(a, b, c, d, e);
        this.Bp.appendChild(this.wd)
    },
    lq: function() {
        null !== this.wd && this.Bp.removeChild(this.wd);
        this.wd = null
    },
    ty: function(a, b, c) {
        this.wd.innerHTML != a && (this.wd.innerHTML = a, this.vt(b, c))
    },
    vt: function(a, b, c) {
        this.gj + a.O > b && (this.gj = b - a.O, this.wd.style.left = this.gj + "px");
        this.hj + a.Z > c && (this.hj = c - a.Z, this.wd.style.top = this.hj + "px")
    },
    Yt: function(a, b, c, d, e) {
        var f = document.createElement("div");
        f.id = "cdsTooltip";
        f.style.msUserSelect = "none";
        f.style.WebkitUserSelect =
            "none";
        f.style.MozUserSelect = "none";
        f.style.userSelect = "none";
        f.style.position = "absolute";
        f.style.left = a + "px";
        f.style.top = b + "px";
        this.gj = a;
        this.hj = b;
        f.innerHTML = c;
        f.style.font = d;
        f.style.borderStyle = "solid";
        f.style.borderWidth = "1px";
        f.style.padding = "2px 3px 1px 3px";
        f.style.backgroundColor = e;
        f.style.zIndex = E.ks;
        return f
    }
};
var S;
S = function(a, b, c) {
    this.Ba = null;
    this.Ce = this.Ka = this.Ne = this.Me = this.Xc = this.Wc = this.za = this.ua = this.Ec = this.Dc = 0;
    this.uf = "solid";
    this.tf = "";
    this.Od = null;
    this.Qj = this.Pj = 1;
    this.mf = a;
    c ? (this.ha = window.document.createElement("div"), this.ha.id = "cdsClip", this.ha.style.overflow = "hidden", this.ha.style.position = "relative", this.mf.appendChild(this.ha)) : this.ha = this.mf;
    this.ka = b;
    this.Td = null;
    this.Ua = "";
    this.zk = E.Ye
};
S.prototype = {
    Jc: function() {},
    iq: function() {},
    Xa: function() {
        this.Ba && this.Ba.removeChild(this.ia())
    },
    update: function(a, b, c, d, e, f, g, h, l, r, v) {
        this.Dc = a;
        this.Ec = b;
        this.ua = c;
        this.za = d;
        this.Wc = e;
        this.Xc = f;
        this.Me = g;
        this.Ne = h;
        this.Ka = l;
        this.ka.sr(r);
        this.Tx(a, b, c, d, e, f, g, h, l, v)
    },
    bB: function(a, b) {
        this.Pj = a;
        this.Qj = b
    },
    ia: function() {
        return this.mf
    },
    Tx: function(a, b, c, d, e, f, g, h, l, r) {
        var v = this;
        e = void 0 === this.lh;
        void 0 !== this.lh && this.lh !== this.ka.Sq() ? window.WebvisuInst.Pf(function() {
                v.nf(a, b, c, d, g, h, l, r)
            }) :
            (this.lh = !this.ka.Sq()) ? (null !== this.Td && (this.ia().removeEventListener("transitionend", this.Td, !1), this.Td = null), e ? (window.WebvisuInst.Pf(function() {
                v.nf(a, b, c, d, g, h, l, r, 100)
            }), window.WebvisuInst.nj(function() {
                v.If()
            })) : (this.If(), window.WebvisuInst.nj(function() {
                v.nf(a, b, c, d, g, h, l, r, 100)
            }))) : (e || "" === r ? window.WebvisuInst.nj(function() {
                v.If()
            }) : (this.Td = function() {
                v.If()
            }, this.ia().addEventListener("transitionend", this.Td, !1)), window.WebvisuInst.Pf(function() {
                v.nf(a, b, c, d, g, h, l, r, 0)
            }))
    },
    nf: function(a,
        b, c, d, e, f, g, h, l) {
        c = this.ia();
        d = this.ha;
        g = 1 / this.Pj;
        var r = 1 / this.Qj;
        c.style.left = a + "px";
        c.style.top = b + "px";
        c.style.width = this.Dg() + "px";
        c.style.height = this.Cg() + "px";
        d.style.width = this.Dg() + "px";
        d.style.height = this.Cg() + "px";
        0 < this.Ce && (d.style.border = this.Ce + "px " + this.uf + " " + this.tf);
        c.style.transformOrigin = e + .5 + "px " + (f + .5) + "px";
        c.style.transform = "";
        0 !== this.Ka && (c.style.transform = 1 !== (this.Pj || this.Qj) ? c.style.transform + ("scale(" + this.Pj + "," + this.Qj + ") rotate(" + this.Ka + "deg) scale(" + g + "," + r + ")") :
            c.style.transform + (" rotate(" + this.Ka + "deg)"));
        void 0 !== l && (c.style.opacity = l);
        c.style.zIndex = this.ka.$y() ? E.gg : this.zk;
        delete c.tabIndex;
        c.style.transition = h
    },
    Da: function() {
        return null
    },
    Pe: function() {},
    bc: function(a, b) {
        this.Ba = a;
        void 0 === b ? this.Ba.appendChild(this.ia()) : this.Ba.insertBefore(this.ia(), this.Ba.children[b])
    },
    ma: function() {
        return this
    },
    Te: function() {
        return -1
    },
    oe: function(a) {
        this.Od = a
    },
    kz: function() {
        var a = t.lb(this.ha, t.ab());
        return new I(a.c, a.f, a.c + this.ua, a.f + this.za)
    },
    le: function(a) {
        this.mf.id +=
            "_" + a;
        this.Ua += "_" + a;
        this.ha !== this.mf && (this.ha.id += "_" + a)
    },
    ke: function() {},
    If: function() {
        this.ia().style.display = this.lh ? "" : "none";
        this.Td && (this.ia().removeEventListener("transitionend", this.Td, !1), this.Td = null)
    },
    Dg: function() {
        return Math.max(0, this.ua - 2 * this.Ce)
    },
    Cg: function() {
        return Math.max(0, this.za - 2 * this.Ce)
    },
    Jm: function() {},
    Ij: function() {
        return !1
    }
};
var P;
P = function(a, b, c, d, e, f) {
    S.call(this, a, b, c);
    this.Va = d;
    this.$ = e;
    this.cl();
    this.ji = this.Ci = this.Sd = null;
    this.Ff = [];
    this.rb = [];
    this.Yd = null;
    this.Bf = -1;
    this.Zh = !1;
    this.mc = null;
    this.de = f;
    this.Ei = this.$ && this.$.Fe ? !0 : !1
};
P.prototype = Object.create(S.prototype);
k = P.prototype;
k.constructor = P;
k.Jc = function() {
    this.Ei || this.Qs(this.ha)
};
k.mr = function(a) {
    this.Zh = a
};
k.If = function() {
    this.Xh(this.Va, this.Rd(), this.Qd());
    S.prototype.If.call(this)
};
k.Pe = function(a) {
    this.$ && this.$.Pe(a);
    this.Va.clearRect(a.m, a.o, a.w(), a.v())
};
k.ke = function() {
    this.de.Hk.gA(this);
    this.$ && this.$.ke();
    S.prototype.ke.call(this)
};
k.Xa = function() {
    this.Al();
    this.$ && this.$.Dm();
    this.mc && this.mc.Xa();
    S.prototype.Xa.call(this)
};
k.iq = function() {
    for (var a in this.rb) this.ha.removeChild(this.rb[a].ia());
    this.Bf = -1;
    this.rb = []
};
k.Da = function() {
    var a;
    (a = this.Fo()) ? (a = a.ra, this.Xh(a, -1 === a.width ? this.Dg() : a.width, -1 === a.height ? this.Cg() : a.height)) : (a = this.Va, this.Xh(a, this.Rd(), this.Qd()), a.setTransform(1, 0, 0, 1, this.Wc, this.Xc));
    return a
};
k.ma = function() {
    if (this.$) {
        var a = this.$.ma();
        if (null !== a) return a
    }
    this.Xh(this.Va, this.Rd(), this.Qd());
    return this
};
k.U = function() {
    return this.$
};
k.wh = function(a) {
    this.$.wh(a)
};
k.Te = function() {
    return this.$ ? this.$.Te() : S.prototype.Te.call(this)
};
k.fy = function(a, b) {
    this.$.Xp(a, b)
};
k.eA = function() {
    this.$ && this.$.Dm()
};
k.oe = function(a) {
    S.prototype.oe.call(this, a);
    this.$ && this.$.oe(this.Od)
};
k.FA = function(a, b, c) {
    this.Ce = a;
    this.uf = b;
    this.tf = c
};
k.update = function(a, b, c, d, e, f, g, h, l, r, v) {
    this.Tp();
    S.prototype.update.call(this, a, b, c, d, e, f, g, h, l, r, v)
};
k.KA = function(a, b) {
    var c = this,
        d = b.Fj(),
        e = !1,
        f;
    this.Ei && null !== this.Sd && this.Sd.src === a.src || (a.onload = function() {
        b.si && b.Ag && (a.width = Math.round(b.Jk * a.width), a.height = Math.round(b.Kk * a.height), e = !0, f = new A(a.width, a.height), d = t.qe(d, f, b));
        if (b.Uh && !e) a.width = d.w(), a.height = d.v();
        else if (b.fl && !e) {
            if (d.w() / a.width < d.v() / a.height) {
                var g = Math.round(d.w() * a.height / a.width);
                var h = d.w()
            } else g = d.v(), h = Math.round(d.v() * a.width / a.height);
            a.width = h;
            a.height = g;
            h = new I(d.m, d.o, d.m + h, d.o + g);
            d = t.re(h, d, b)
        }
        c.Sd ?
            c.ha.replaceChild(a, c.Sd) : c.ha.insertBefore(a, c.Va.canvas);
        c.Sd = a;
        c.Ci = d.vb().clone();
        c.Tp()
    })
};
k.MA = function(a, b) {
    null !== this.mc && this.mc.Xa();
    this.mc = b;
    this.mc.Jc(a, this.ha, this.Xd)
};
k.gr = function() {
    null !== this.Yd && (this.ia().removeChild(this.Yd.ia()), this.Yd = null)
};
k.ly = function(a) {
    null !== this.Yd && this.gr();
    this.Yd = a;
    this.Yd.Gm();
    this.ia().appendChild(this.Yd.ia())
};
k.iy = function(a, b) {
    var c;
    if (32767 === a) this.ly(b);
    else if (void 0 === this.rb[a])
        if (b.Gm(), b.IA(this.Ua, a), this.rb[a] = b, a === this.rb.length - 1) {
            var d = this.Va.nextSibling;
            if (1 < this.rb.length)
                for (c in this.rb) a > c && (d = this.rb[c].ia().nextSibling);
            null === d || void 0 === d ? this.ha.append(b.ia()) : this.ha.insertBefore(b.ia(), d)
        } else
            for (c in this.rb) {
                if (a < c) {
                    this.ha.insertBefore(b.ia(), this.rb[c].ia());
                    break
                }
            } else b = this.rb[a].ra, b.save(), b.setTransform(1, 0, 0, 1, 0, 0), b.clearRect(0, 0, b.canvas.width, b.canvas.height),
                b.restore(), this.rb[a].Gm()
};
k.rB = function(a, b, c, d, e, f, g, h, l, r, v) {
    var u = this.Fo();
    null !== u && (g = new nb(g), u.oB(a, b, c, d, e, f, g, h, l, r, v))
};
k.dB = function(a) {
    this.Bf = a
};
k.Wy = function() {
    this.Bf = -1
};
k.Tp = function() {
    if (null !== this.Ci && null !== this.Sd) {
        var a = this.Ci.f + this.Xc,
            b = this.Ci.c + this.Wc;
        0 !== a && (this.Sd.style.top = a + "px");
        0 !== b && (this.Sd.style.left = b + "px")
    }
};
k.Qs = function(a) {
    var b = this,
        c = q.R();
    this.Xb(a, c ? "pointerdown" : "mousedown", function(d) {
        b.Qi(d)
    });
    this.Xb(a, c ? "pointermove" : "mousemove", function(d) {
        b.Ri(d)
    });
    this.Xb(a, c ? "pointerup" : "mouseup", function(d) {
        b.Si(d)
    });
    !c && window.ontouchstart && (this.Xb(a, "touchstart", function(d) {
        b.Qi(d)
    }), this.Xb(a, "touchmove", function(d) {
        b.Ri(d)
    }), this.Xb(a, "touchend", function(d) {
        b.Si(d)
    }))
};
k.rh = function(a) {
    var b = this.Pu(a),
        c = this.Qx(a),
        d = t.Ze(this.Od);
    return new yb(a, b, c, d)
};
k.Qx = function(a) {
    return t.Aj(a)
};
k.Pg = function(a, b, c) {
    this.Od(a.Yc(), 0, b, [], c)
};
k.Hg = function(a, b) {
    if (t.Bd(a.Sb) || t.pa(a.Sb) && "touch" === a.Sb.pointerType)
        if (null !== this.mc && this.mc.handleEvent(a, b) || null !== this.de.W && this.de.W.handleEvent(a, b)) return !0;
    return t.Bd(a.Sb) ? !0 : !1
};
k.Qi = function(a) {
    this.de.wc.Wq(a);
    this.Ou(a);
    var b = this.rh(a),
        c = this.xg(b.td);
    this.Hg(b, H.A) || (a.stopPropagation(), this.Ov(a) && void 0 !== this.de && this.de.Sc.xm() && this.de.Sc.vj(a), this.Pg(b.Jf, H.A, c))
};
k.Pu = function(a) {
    var b = new w(a.offsetX, a.offsetY);
    a.target !== this.ha && (a = t.tj(this.ha, a.target), b.c += a.c, b.f += a.f);
    return this.ow(b)
};
k.Ov = function(a) {
    return 1 === a.which
};
k.Bv = function() {
    return this.Zh || null !== this.mc
};
k.Ri = function(a) {
    var b = this.rh(a),
        c = this.xg(b.td);
    this.Hg(b, H.b) || (a.stopPropagation(), this.Pg(b.Jf, H.b, c))
};
k.Si = function(a) {
    var b = this.rh(a),
        c = this.xg(b.td);
    this.Hg(b, H.i) || (a.stopPropagation(), this.Pg(b.Jf, H.i, c))
};
k.xg = function(a) {
    return t.$e(a)
};
k.Al = function() {
    for (var a = 0; a < this.Ff.length; ++a) this.Ff[a].Uy.removeEventListener(this.Ff[a].Bq, this.Ff[a].uj, !1);
    this.Ff = []
};
k.Ou = function(a) {
    if (this.Bv()) {
        var b = this;
        this.de.Hk.hq(a, b, function(c) {
            b.qw(c)
        }, function(c) {
            b.rw(c)
        })
    }
};
k.qw = function(a) {
    var b = this.rh(a),
        c = this.xg(b.td);
    a.stopPropagation();
    this.Hg(b, H.b) || this.Pg(b.Jf, H.b, c)
};
k.rw = function(a) {
    var b = this.rh(a),
        c = this.xg(b.td);
    a.stopPropagation();
    this.Hg(b, H.i) || this.Pg(b.Jf, H.i, c)
};
k.Xb = function(a, b, c) {
    this.Ff.push({
        Uy: a,
        Bq: b,
        uj: c
    });
    a.addEventListener(b, c, !1)
};
k.ow = function(a) {
    a.c = a.c - this.Wc;
    a.f = a.f - this.Xc;
    return a
};
k.Fo = function() {
    return -1 !== this.Bf ? 32767 === this.Bf ? this.Yd : this.rb[this.Bf] : null
};
k.Xh = function(a, b, c) {
    a.canvas.width !== b && (a.canvas.width = b);
    a.canvas.height !== c && (a.canvas.height = c)
};
k.cl = function() {
    this.ha.appendChild(this.Va.canvas);
    this.$ && (this.$.bc(this.ha), "cdsDialog" !== this.ia().id && (this.ia().id = this.$.Fe ? "cdsClientObjectBackgroundContainer" : "cdsClientObjectContainer"))
};
k.Rd = function() {
    return this.Dg()
};
k.Qd = function() {
    return this.Cg()
};
k.le = function(a) {
    S.prototype.le.call(this, a);
    this.Va.canvas.id += "_" + a
};
k.qr = function(a) {
    null === a && null !== this.ji && (this.ha.removeChild(this.ji), this.ha.focus());
    null === this.ji && null !== a && this.ha.appendChild(a);
    this.ji = a
};
k.Jm = function(a) {
    this.Ei = a
};
k.Ij = function() {
    return this.Ei
};
var ob;
ob = function(a, b, c) {
    S.call(this, a, b, c);
    this.Ro();
    this.to = null
};
ob.prototype = Object.create(S.prototype);
ob.prototype.constructor = ob;
ob.prototype.Ro = function() {
    this.ia().id = "cdsClientObjectNative"
};
ob.prototype.PA = function(a) {
    this.to = a;
    a = a.SB();
    a.id = "cdsNativeElem";
    a.style.position = "absolute";
    a.style.width = "100%";
    a.style.height = "100%";
    this.ha.appendChild(a)
};
ob.prototype.sy = function(a, b) {
    a = a.split(".");
    for (var c = this.to, d = 0; d < a.length - 1; ++d) c = c[a[d]]();
    c[a[a.length - 1]].apply(c, b)
};
var qb;
qb = function(a, b, c) {
    S.call(this, a, b, c);
    this.pl = -1
};
qb.prototype = Object.create(S.prototype);
qb.prototype.constructor = qb;
qb.prototype.Ro = function() {
    this.ia().id = "cdsClientObjectOldNative"
};
qb.prototype.Xa = function() {
    -1 !== this.pl && WebvisuExtensionMgr.pm(this.pl);
    S.prototype.Xa.call(this)
};
qb.prototype.Cr = function(a) {
    this.pl = a
};
var sb;
sb = function(a, b, c, d, e, f, g, h) {
    this.Xd = f;
    this.Bb = g;
    P.call(this, a, b, c, d, e, h)
};
sb.prototype = Object.create(P.prototype);
k = sb.prototype;
k.constructor = sb;
k.Jc = function() {
    P.prototype.Jc.call(this);
    var a = this;
    this.Xd.Jc(function(b, c) {
        a.ih(b, c)
    })
};
k.UA = function(a, b, c, d, e, f) {
    this.Xd.update(a, b, c, d, e, f);
    this.Xd.Jr(this.mc)
};
k.nf = function(a, b, c, d, e, f, g, h, l) {
    var r = this;
    this.Bb && (this.Bb.style.width = this.Rd() + "px", this.Bb.style.height = this.Qd() + "px");
    window.WebvisuInst.Pf(function() {
        P.prototype.nf.call(r, a, b, c, d, e, f, g, h, l)
    })
};
k.Vx = function(a, b) {
    null !== this.Bb && (this.Bb.style.left = a + "px", this.Bb.style.top = b + "px")
};
k.le = function(a) {
    P.prototype.le.call(this, a);
    null !== this.Bb && (this.Bb.id += "_" + a)
};
k.ih = function(a, b) {
    this.Vx(-a, -b);
    for (var c in this.rb) {
        var d = this.rb[c].ra;
        d && (d.tA && (d.canvas.style.left = d.x - a + "px"), d.uA && (d.canvas.style.top = d.y - b + "px"))
    }
};
k.cl = function() {
    this.Bb ? (this.Bb.appendChild(this.Va.canvas), this.ha.appendChild(this.Bb), this.$ && (this.$.bc(this.Bb), this.ia().id = "cdsClientObjectContainer")) : P.prototype.cl.call(this)
};
k.Rd = function() {
    return this.Bb ? Math.max(0, this.Dg() + this.Xd.rA()) : P.prototype.Rd.call(this)
};
k.Qd = function() {
    return this.Bb ? Math.max(0, this.Cg() + this.Xd.sA()) : P.prototype.Qd.call(this)
};
var ub;
ub = function(a, b, c, d, e, f, g, h) {
    P.call(this, a, b, !1, c, d, g);
    this.xa = null;
    this.Oi = this.ri = this.Sg = !1;
    this.j = null;
    this.Rp = !1;
    this.ga = e;
    this.kf = null;
    this.zk = E.Ze;
    this.$l = f;
    h && this.mr(h)
};
ub.prototype = Object.create(P.prototype);
k = ub.prototype;
k.constructor = ub;
k.Jc = function(a, b, c, d, e, f, g) {
    P.prototype.Jc.call(this);
    this.Sg = b;
    this.Oi = c;
    this.ri = d;
    this.xa = a;
    this.kf = e;
    this.j = f;
    this.ia().style.transform = "scale(0)";
    this.ia().style.opacity = 0;
    this.ga && (this.ga.style.opacity = 0, this.Zw());
    g && (this.zk = E.Tr)
};
k.Xa = function() {
    this.ga && (this.Sx(), this.Ba === this.ga.parentNode && this.Ba.removeChild(this.ga));
    P.prototype.Xa.call(this)
};
k.update = function(a, b, c, d, e, f, g, h, l, r, v, u) {
    "" === v && (this.Rp = !0);
    if (this.ri) P.prototype.update.call(this, 0, 0, c, d, e, f, 0, 0, l, r, v);
    else {
        g = c / 2;
        h = d / 2;
        var x = c,
            z = d;
        null !== this.kf && null !== this.kf.canvas && (x = this.kf.canvas.width - c, z = this.kf.canvas.height - d);
        this.xa instanceof I && (this.Sg ? (a = this.xa.qh().c - c / 2, b = this.xa.qh().f - d / 2, a = Math.min(Math.max(0, x), Math.max(0, a)), b = Math.min(Math.max(0, z), Math.max(0, b))) : this.Oi && (this.j.Oz && this.j.Nz ? (g = this.xa.vb().f, h = this.kf.canvas.height - this.xa.rc().f, this.j.Yq ||
            this.j.Xq) ? this.j.Yq ? this.j.Xq || (b = this.xa.rc().f, a = this.qk(c)) : (b = this.xa.vb().f - d, a = this.qk(c)) : this.j.dm || this.j.$p ? this.j.dm && (a = this.qk(c), b = this.xa.rc().f, d > h && g > h && (b = this.xa.vb().f - d)) : (a = this.xa.vb().c, b = this.xa.rc().f, d > h && g > h && (b = this.xa.vb().f - d)) : (a = this.xa.rc().c, b = this.xa.rc().f, a > x && (a = this.xa.vb().c - c), b > z && (b = this.xa.vb().f - d), a = Math.min(Math.max(0, x), Math.max(0, a)), b = Math.min(Math.max(0, z), Math.max(0, b)))), g = this.xa.qh().c - a, h = this.xa.qh().f - b);
        P.prototype.update.call(this, a, b,
            c, d, e, f, g, h, l, r, v);
        this.ia().style.opacity = 1;
        this.ga && (this.ga.style.transition = v, this.$l && (this.ga.style.backgroundColor = u), this.ga.style.opacity = 1)
    }
};
k.qk = function(a) {
    return this.j.$p ? this.xa.vb().c : this.j.dm ? this.xa.rc().c - a : this.xa.vb().c + (this.xa.rc().c - this.xa.vb().c) / 2 - a / 2
};
k.bc = function(a) {
    this.ga && a.appendChild(this.ga);
    P.prototype.bc.call(this, a)
};
k.close = function(a) {
    if (this.Rp) this.zq(a);
    else {
        var b = this;
        this.Xb(this.ia(), "transitionend", function() {
            b.zq(a)
        })
    }
    this.ga && (this.ga.style.opacity = 0);
    this.ia().style.transform = "scale(0)";
    this.ia().style.opacity = 0
};
k.zq = function(a) {
    this.ga && this.Ba === this.ga.parentNode && this.Ba.removeChild(this.ga);
    a()
};
k.Zw = function() {
    var a = this,
        b = q.R();
    this.Xb(this.ga, b ? "pointerdown" : "mousedown", function(c) {
        a.hc(c)
    });
    this.Xb(this.ga, b ? "pointermove" : "mousemove", function(c) {
        a.hc(c)
    });
    this.Xb(this.ga, b ? "pointerup" : "mouseup", function(c) {
        a.hc(c)
    });
    !b && window.ontouchstart && (this.Xb(this.ga, "touchstart", function(c) {
        a.hc(c)
    }), this.Xb(this.ga, "touchmove", function(c) {
        a.hc(c)
    }), this.Xb(this.ga, "touchend", function(c) {
        a.hc(c)
    }))
};
k.Sx = function() {
    var a = this,
        b = q.R();
    this.ga.removeEventListener(b ? "pointerdown" : "mousedown", function(c) {
        a.hc(c)
    });
    this.ga.removeEventListener(b ? "pointermove" : "mousemove", function(c) {
        a.hc(c)
    });
    this.ga.removeEventListener(b ? "pointerup" : "mouseup", function(c) {
        a.hc(c)
    });
    !b && window.ontouchstart && (this.ga.removeEventListener("touchstart", function(c) {
        a.hc(c)
    }), this.ga.removeEventListener("touchmove", function(c) {
        a.hc(c)
    }), this.ga.removeEventListener("touchend", function(c) {
        a.hc(c)
    }))
};
k.hc = function(a) {
    this.ga && a.target === this.ga && a.stopPropagation()
};
var wb;
wb = function(a, b) {
    this.ra = a;
    this.Id = b;
    (this.xf = null !== b) && this.Id.appendChild(this.ra.canvas)
};
wb.prototype = {
    ia: function() {
        return this.xf ? this.Id : this.ra.canvas
    },
    IA: function(a, b) {
        this.ra.canvas.id = "cdsCanvas" + a + "_Layer_" + b.toString();
        this.xf && (this.Id.id = "cdsClip" + a + "_Layer_" + b.toString())
    },
    oB: function(a, b, c, d, e, f, g, h, l, r, v) {
        g.Lz() ? (this.ra.x = a, this.ra.y = b, this.ra.canvas.style.left = a + "px", this.ra.canvas.style.top = b + "px") : this.Ts(g);
        this.ra.width = c;
        this.ra.height = d;
        this.ra.tA = e;
        this.ra.uA = f;
        this.ra.canvas.style.width = -1 === this.ra.width ? "100%" : c + "px";
        this.ra.canvas.style.height = -1 === this.ra.height ?
            "100%" : d + "px";
        this.xf && (this.Id.RB = v, this.Id.style.left = h + "px", this.Id.style.top = l + "px", this.Id.style.width = r + "px", this.Id.style.height = v + "px")
    },
    Ts: function(a) {
        a.right() && (this.ra.canvas.style.right = "0px");
        a.left() && (this.ra.canvas.style.left = "0px");
        a.top() && (this.ra.canvas.style.top = "0px");
        a.bottom() && (this.ra.canvas.style.bottom = "0px")
    },
    Gm: function() {
        this.ra.x = 0;
        this.ra.y = 0;
        this.ra.width = -1;
        this.ra.height = -1
    }
};
var rb;
rb = function(a) {
    this.Ba = null;
    this.V = [];
    this.ib = {};
    this.Aa = -1;
    this.Od = null;
    this.xd = -1;
    this.Fe = a;
    this.Ik = this.Pi = null;
    this.tl = !1
};
rb.prototype = {
    Xp: function(a, b) {
        -1 === this.Aa ? (b.Ij() || b.$ instanceof rb && b.$.Fe ? (b.le(a), b.bc(this.Ba, 1), b.Jm(!0), this.tl = !0) : (b.$ instanceof rb ? null === this.Pi && (this.Pi = a) : this.tl && !this.Fe ? b.bc(this.Ba, a + 1) : b.bc(this.Ba, a), b.Jm(this.Fe), b.le(a)), b.oe(this.$n(a)), this.Hp(a, b)) : (b.le(this.Aa), this.nd(this.Aa).fy(a, b))
    },
    Dm: function() {
        -1 === this.Aa ? (this.ko(), this.tl = !1) : this.nd(this.Aa).eA()
    },
    Em: function() {
        this.ko();
        this.Aa = -1
    },
    Pe: function(a) {
        for (var b = 0; b < this.V.length; ++b) this.V[b] && this.V[b].Pe(a)
    },
    yh: function() {
        for (var a = 0; a < this.V.length; ++a) this.V[a] && this.V[a].$ && this.V[a].$.yh();
        for (var b in this.ib) this.ib[b] && this.ib[b].Xa();
        this.ib = {}
    },
    ke: function() {
        for (var a = 0; a < this.V.length; ++a) this.V[a] && this.V[a].ke();
        for (var b in this.ib) this.ib[b] && this.ib[b].ke()
    },
    ko: function() {
        this.ke();
        for (var a = 0; a < this.V.length; ++a) this.V[a] && this.V[a].Xa();
        for (var b in this.ib) this.ib[b] && this.ib[b].Xa();
        this.rk()
    },
    ma: function() {
        return -1 !== this.Aa ? this.nd(this.Aa).ma() : null
    },
    wh: function(a) {
        -1 === this.Aa ?
            this.Aa = a : this.nd(this.Aa).wh(a)
    },
    Te: function() {
        if (-1 === this.Aa) return -1;
        var a = this.nd(this.Aa).Te(); - 1 === a && (this.Aa === this.Pi && (this.Ws(), this.Pi = null), a = this.Aa, this.Aa = -1);
        return a
    },
    oe: function(a) {
        this.Od = a
    },
    bc: function(a) {
        this.Ba = a;
        for (var b = 0; b < this.V.length; ++b) this.V[b] && this.V[b].bc(a);
        for (var c in this.ib) this.ib[c] && this.ib[c].bc(a)
    },
    Ws: function() {
        this.V.forEach(function(a) {
            a && (a.Ba = this.Ba, this.Ba.appendChild(a.ia()))
        }.bind(this))
    },
    wz: function() {
        return -1 !== this.Aa
    },
    Mm: function(a) {
        this.xd =
            a
    },
    DA: function(a) {
        this.Ik = a
    },
    rk: function() {
        this.V = [];
        this.ib = {}
    },
    nd: function(a) {
        return this.ib.hasOwnProperty(a) ? this.ib[a] : this.V[a - 1]
    },
    Hp: function(a, b) {
        b.Ij() ? this.ib[a] = b : this.V[a - 1] = b
    },
    Jo: function() {
        return null === this.Ik ? this.V.length : this.Ik
    },
    $n: function(a) {
        var b = this;
        return function(c, d, e, f, g, h) {
            var l = b.nd(a);
            l && !l.Ij() && f.push({
                id: a,
                Vq: b.Jo()
            }); - 1 !== b.xd && f.push({
                id: b.xd,
                Vq: 15
            });
            c = b.Od(c, d, e, f, g, h);
            if (h) return c
        }
    }
};
var vb;
vb = function() {
    rb.call(this, !1);
    this.V = {};
    this.Ki = 0
};
vb.prototype = Object.create(rb.prototype);
k = vb.prototype;
k.constructor = vb;
k.gy = function(a, b) {
    b.bc(this.Ba);
    b.oe(this.$n(a));
    b.le(a);
    this.V[String(a)] = b;
    this.Ki = Math.max(this.Ki, a)
};
k.fA = function(a) {
    var b = this,
        c = this.nd(a);
    this.du(a);
    c.ke();
    c.close(function() {
        b.pw(c)
    })
};
k.Zz = function(a) {
    this.Aa = a
};
k.Xz = function() {
    var a = this.Aa;
    this.Aa = -1;
    return a
};
k.Em = function() {
    this.ev();
    this.rk();
    this.Aa = -1
};
k.yh = function() {
    for (var a in this.V) this.V[a] && this.V[a].$ && this.V[a].$.yh()
};
k.Pe = function(a) {
    for (var b in this.V) this.V[b] && this.V[b].Pe(a)
};
k.rk = function() {
    this.V = {}
};
k.du = function(a) {
    delete this.V[String(a)];
    this.Aa === a && (this.Aa = -1);
    this.Ki = Object.keys(this.V).map(Number).reduce(function(b, c) {
        return Math.max(b, c)
    }, 0)
};
k.pw = function(a) {
    a.Xa()
};
k.ev = function() {
    var a = ub.prototype.Xa,
        b = [],
        c;
    for (c in this.V) this.V[c] && a.apply(this.V[c], b)
};
k.nd = function(a) {
    return this.V[String(a)]
};
k.Hp = function(a, b) {
    this.V[String(a)] = b
};
k.Jo = function() {
    return this.Ki
};
var zb;
zb = function(a, b, c, d) {
    this.tc = a;
    this.os = b;
    this.ps = c;
    this.qs = d
};
var Ab;
Ab = function(a, b) {
    this.tc = a;
    this.se = b
};
var Bb;
Bb = function(a, b, c, d) {
    this.tc = a;
    this.se = b;
    this.Ad = c;
    this.Error = d
};
var Cb, Db, Xa;
Xa = function(a) {
    this.oa = new XMLHttpRequest;
    this.a = a;
    this.Kd = null
};
Xa.prototype = {
    Za: function(a, b, c, d) {
        this.a.getConfiguration() ? (this.Iq(), this.Kd.send(a, b, c, d)) : this.a.error("Error while creating a connection to the webserver: No configuration found")
    },
    Iq: function() {
        if (null === this.Kd) this.a.getConfiguration().CasFactoryName ? this.Kd = new Cb : this.Kd = new Db(this.a, this.oa);
        else return this.Kd
    },
    Uq: function(a, b) {
        this.nb = b;
        this.oa.open("GET", a, !0);
        var c = this;
        this.oa.onreadystatechange = function() {
            c.Sz(a)
        };
        this.oa.send()
    },
    Sz: function(a) {
        4 === this.oa.readyState && (200 === this.oa.status ||
            "OK" === this.oa.status ? this.nb.Cj(this.oa.responseText) : this.nb.H("Loading file '" + a + "' failed: " + this.oa.status, F.fa))
    },
    oh: function(a) {
        this.Iq();
        null !== this.Kd && this.Kd instanceof Cb && this.Kd.oh(a)
    }
};
Cb = function() {
    var a = this;
    window.CODESYS.CAS.resultListener = function(b) {
        a.nb.hb(b)
    }
};
Cb.prototype = {
    send: function(a, b) {
        this.nb = b;
        window.CODESYS.CAS.sendMessage(a)
    },
    oh: function(a) {
        window.CODESYS.CAS.sendCloseBeacon(a)
    }
};
Db = function(a, b) {
    this.a = a;
    this.oa = b
};
Db.prototype = {
    send: function(a, b, c, d) {
        void 0 === c && (c = !1);
        void 0 === d && (d = !1);
        this.nb = b;
        b = "/WebVisuV3.bin";
        var e = this;
        d = this.tx(d, a);
        q.Ms() && (b += "?" + t.b());
        c && "function" == typeof navigator.sendBeacon ? navigator.sendBeacon(b, new Uint8Array(a)) : (this.oa.open("POST", b, !c), c || q.bd() || (this.oa.responseType = "arraybuffer"), this.oa.setRequestHeader("Content-Type", "application/octet-stream"), d && this.oa.setRequestHeader("3S-Repl-Content", this.Mu(a)), c || (this.oa.onreadystatechange = function() {
                e.Tz()
            }), 0 < this.a.getConfiguration().XhrSendTimeout &&
            (this.oa.timeout = this.a.getConfiguration().XhrSendTimeout, this.oa.ontimeout = function() {
                e.nb.H("Sending service timeout", F.Ia)
            }), d ? this.oa.send() : this.oa.send(a))
    },
    Tz: function() {
        if (4 === this.oa.readyState)
            if (200 === this.oa.status || "OK" === this.oa.status) {
                this.oa.onreadystatechange = null;
                if (q.bd()) {
                    var a = this.oa.responseText;
                    "" === a && (a = null)
                } else a = this.oa.response, a instanceof ArrayBuffer && 0 === a.byteLength && (a = null);
                try {
                    null !== a || this.Su() ? this.nb.hb(a) : this.nb.H("Sending service failed, server not available?",
                        F.pa)
                } catch (b) {
                    this.nb.H("Unexpected exception while evaluating comm result" + b, F.A)
                }
            } else 4E3 === this.oa.status ? this.a.Gz() : 0 === this.oa.status ? this.nb.H("Sending service aborted", F.i) : this.nb.H("Sending service failed, status: " + this.oa.status, F.R)
    },
    Su: function() {
        return "function" !== typeof this.nb.Tf ? !1 : this.nb.Tf()
    },
    tx: function(a, b) {
        return window.btoa ? (a || this.a.qp) && b instanceof ArrayBuffer && 70 > b.byteLength ? !0 : !1 : !1
    },
    Mu: function(a) {
        var b = "";
        a = new Uint8Array(a);
        var c = a.byteLength,
            d;
        for (d = 0; d < c; d++) b +=
            String.fromCharCode(a[d]);
        return window.btoa(b)
    }
};
var D;
D = function() {};
D.R = 43981;
D.i = 0;
D.pa = 1;
D.Ia = 129;
D.b = 0;
D.A = 0;
D.fa = 1;
var Eb;
Eb = function(a, b, c) {
    this.Hl = a;
    this.Il = b;
    this.Fp = c;
    this.Bc = 0
};
Eb.b = function(a) {
    var b = a.getUint16(),
        c;
    if (52565 !== b) throw Error("Unsupported protocol: " + b);
    this.Fg = a.getUint16();
    if (12 > this.Fg) throw Error("Unsupported length of header: " + this.Fg);
    this.Hl = a.getUint16();
    this.Il = a.getUint16();
    this.Fp = a.getUint32();
    this.Bc = a.getUint32();
    b = this.Fg - 12;
    16 <= this.Fg && (a.getUint16(), b -= 2);
    for (c = 0; c < b; ++c) a.getUint8();
    return this
};
Eb.prototype = {
    write: function(a, b) {
        a.Wa(52565);
        a.Wa(16);
        a.Wa(this.Hl);
        a.Wa(this.Il);
        a.B(this.Fp);
        a.B(b);
        a.Wa(0);
        a.Wa(0)
    }
};
var T;
T = function(a, b, c) {
    this.He = new lb(a, b, c);
    this.G = this.He.F
};
T.prototype = {
    i: function() {
        try {
            if ("|" !== this.G.Vf()) return "Unexpected format of service: 1";
            var a = this.Pp(),
                b = !1;
            if (4 > a.length) return "Unexpected format of service: 2";
            5 <= a.length && (b = "true" === a[4]);
            return new la(parseInt(a[0], 10), 0 === parseInt(a[1], 10), parseInt(a[2], 10), "true" !== a[3], b)
        } catch (c) {
            return "Exception during readOpenConnectionResult: " + c
        }
    },
    pa: function() {
        var a = this.Pp(),
            b;
        for (b = 0; b < a.length; ++b)
            if (0 === a[b].indexOf("IPv4:")) return a[b].substr(5);
        return ""
    },
    Pp: function() {
        for (var a = [], b = ""; !this.G.Qe();) {
            var c =
                this.G.Vf();
            "|" === c ? (a.push(b), b = "") : b += c
        }
        return a
    },
    eb: function(a, b) {
        for (a = this.G.S() + a; this.G.S() < a;) {
            var c = this.He.Wf(),
                d = this.He.Wf();
            c = b[c];
            var e = this.G.S();
            "function" === typeof c && c(this, d);
            c = this.G.S() - e;
            c < d && this.Cx(d - c)
        }
    },
    fa: function(a) {
        return a ? this.Vw() : this.Ww()
    },
    Ww: function() {
        try {
            var a = this.nc(1, 2),
                b = 0,
                c = 0,
                d = 0,
                e = D.A;
            this.eb(a.Bc, {
                130: function(f, g) {
                    f.eb(g, {
                        32: function(h) {
                            b = h.G.getUint16()
                        },
                        33: function(h) {
                            c = h.G.getUint32()
                        }
                    })
                },
                34: function(f) {
                    e = f.G.getUint32()
                },
                65407: function(f) {
                    d = f.G.getUint16()
                }
            });
            return new Bb(b, c, e, d)
        } catch (f) {
            return "Exception during readOldDeviceSessionResult: " + f
        }
    },
    Vw: function() {
        try {
            var a = this.nc(1, 10),
                b = 0,
                c = 0,
                d = D.A;
            this.eb(a.Bc, {
                33: function(e) {
                    b = e.G.getUint32()
                },
                70: function(e) {
                    d = e.G.getUint32()
                },
                65407: function(e) {
                    c = e.G.getUint16()
                }
            });
            770 === c && (d = D.fa);
            return new Bb(0, b, d, c)
        } catch (e) {
            return "Exception during readNewDeviceSessionResult: " + e
        }
    },
    A: function(a, b) {
        return 2 === a ? this.cA() : this.dA(b ? 65315 : 35)
    },
    cA: function() {
        try {
            var a = this.nc(1, 2),
                b = 0,
                c = 0,
                d = null,
                e = null,
                f = null;
            this.eb(a.Bc, {
                65410: function(g, h) {
                    g.eb(h, {
                        32: function(l) {
                            c = l.G.getUint16()
                        }
                    })
                },
                130: function(g, h) {
                    g.eb(h, {
                        32: function(l) {
                            b = l.G.getUint16()
                        }
                    })
                },
                39: function(g) {
                    d = g.G.Ic(!1)
                },
                38: function(g, h) {
                    var l = p.b(h);
                    l.fm(g.G.Uf(), g.G.S(), h);
                    e = l.Hc()
                },
                65315: function(g) {
                    f = g.G.getUint32()
                }
            });
            return new zb(0 !== b ? b : c, f, d, e)
        } catch (g) {
            return "Exception during readNewDeviceCryptResult: " + g
        }
    },
    dA: function(a) {
        try {
            var b = this.nc(1, 2),
                c = 0,
                d = 0,
                e = 0,
                f = {
                    65410: function(g, h) {
                        g.eb(h, {
                            32: function(l) {
                                d = l.G.getUint16()
                            }
                        })
                    },
                    130: function(g, h) {
                        g.eb(h, {
                            32: function(l) {
                                c = l.G.getUint16()
                            }
                        })
                    }
                };
            f[a] = function(g) {
                e = g.G.getUint32()
            };
            this.eb(b.Bc, f);
            return new zb(0 !== c ? c : d, e, null, null)
        } catch (g) {
            return "Exception during readOldDeviceCryptResult: " + g
        }
    },
    R: function() {
        try {
            var a = this.nc(1, 2),
                b = 0,
                c = 0,
                d = 0;
            this.eb(a.Bc, {
                65410: function(e, f) {
                    e.eb(f, {
                        32: function(g) {
                            c = g.G.getUint16()
                        },
                        33: function(g) {
                            d = g.G.getUint32()
                        }
                    })
                },
                130: function(e, f) {
                    e.eb(f, {
                        32: function(g) {
                            b = g.G.getUint16()
                        },
                        33: function(g) {
                            d = g.G.getUint32()
                        }
                    })
                }
            });
            return new Ab(0 !== b ? b : c, d)
        } catch (e) {
            return "Exception during readOldDeviceLoginResult: " +
                e
        }
    },
    lb: function() {
        try {
            for (this.nc(4, 1); !this.G.Qe();) {
                var a = this.He.Wf();
                this.He.Wf();
                if (65407 === a) return "Visu not supported by the plc";
                var b = this.G.getUint32();
                return 2952790016 > b ? b : 4294967290 === b ? "Visualization is not allowed" : 4294967292 === b ? "No more memory on the plc" : 4294967293 === b ? "Connection to invalid application" : 4294967289 === b ? "Too many clients are registering at the same time" : "Unknown error"
            }
            return "Unexpected format of service: 4"
        } catch (c) {
            return "Exception during readVisuRegisterClientResult: " +
                c
        }
    },
    Ia: function() {
        try {
            for (this.nc(4, 3); !this.G.Qe();) {
                var a = this.He.Wf();
                this.He.Wf();
                if (65407 === a) return "Visu not supported by the plc";
                var b = this.G.getUint32();
                return 0 === b || 1 === b ? b : 2 === b ? "Client registration failed" : 3 === b ? "Client registration failed due to an invalid external id" : "Unknown error"
            }
            return "Unexpected format of service: 5"
        } catch (c) {
            return "Exception during readVisuIsRegisteredClientResult: " + c
        }
    },
    Lb: function() {
        try {
            return this.nc(4, 2), 0
        } catch (a) {
            return "Exception during readVisuRemoveClientResult: " +
                a
        }
    },
    Cm: function(a) {
        var b = 0 === a.direction ? 5 : 2,
            c = 132;
        a.status.mb === U.i && (b = D.pa, c = D.Ia);
        try {
            var d = this.nc(8, b);
            b = {};
            b[c] = function(e, f) {
                e.eb(f, {
                    2: function(g) {
                        a.ff.nB = g.G.getUint32();
                        a.ff.Lc = g.G.getUint32()
                    },
                    3: function(g) {
                        a.Bh = g.G.getUint32()
                    },
                    8: function(g) {
                        a.status.result = g.G.getUint16()
                    }
                })
            };
            b[34] = function(e) {
                e.G.getUint32()
            };
            this.eb(d.Bc, b)
        } catch (e) {
            return "Exception during readtFileAndSessionInfoResult: " + e
        }
    },
    dr: function(a) {
        var b = 0 === a.direction ? 7 : 4,
            c = 0;
        try {
            var d = this.nc(8, b),
                e = 0 === a.direction ? a.ff.Lc :
                a.Xe.Lc,
                f = {};
            0 === a.direction ? (f[6] = function(g) {
                c = g.G.getUint32()
            }, f[7] = function(g, h) {
                a.status.Fc = !0;
                f[5](g, h)
            }, f[5] = function(g, h) {
                null === a.buffer && (a.buffer = p.b(e));
                if (a.status.cc + c <= e && c <= h) {
                    for (h = 0; h < c;) a.buffer.oj(g.G.getUint8()), h++;
                    a.status.cc += c;
                    a.status.result = D.b
                } else a.status.cc = 4294967295
            }) : f[5] = function(g) {
                g = g.G.getUint16();
                g === D.b ? (a.status.result = D.b, a.status.cc += a.status.Ve, a.status.Ve = 0, a.status.Fc = a.status.cc >= e) : a.status.result = g
            };
            this.eb(d.Bc, f)
        } catch (g) {
            return "Exception during readtFileAndSessionInfoResult: " +
                g
        }
    },
    bA: function(a) {
        var b = 0 === a.direction ? a.ff.Lc : a.Xe.Lc;
        b = a.status.result === D.b && a.status.cc === b && a.status.Fc ? 8 : 9;
        try {
            var c = this.nc(8, b);
            this.eb(c.Bc, {
                7: function(d) {
                    d.G.getUint16();
                    a.status.Fc = !0
                }
            })
        } catch (d) {
            return "Exception during readFinishFileTransferResult: " + d
        }
    },
    b: function(a) {
        try {
            var b = this.nc(4, 4),
                c = 0,
                d = a;
            this.eb(b.Bc, {
                132: function(e, f) {
                    e.eb(f, {
                        2: function(g) {
                            g.G.getUint32();
                            var h = g.G.getUint32(),
                                l = g.G.getUint32();
                            g = g.G.getUint32();
                            d = new pa(h, l, g)
                        },
                        4: function() {
                            d.finish()
                        },
                        1: function(g) {
                            c = g.G.getUint32()
                        },
                        3: function(g, h) {
                            d.Hc().fm(g.G.Uf(), g.G.S(), Math.min(h, d.Jz()))
                        }
                    })
                }
            });
            return 0 !== c ? 65535 === c ? "Client id not present or no longer valid" : c.toString() : null === d ? "Unexpected format of service: 6" : d
        } catch (e) {
            return "Exception during readVisuGetPaintDataResult: " + e
        }
    },
    Cx: function(a) {
        this.G.seek(this.G.S() + a)
    },
    nc: function(a, b) {
        var c = Eb.b(this.G),
            d = 4 + c.Fg + c.Bc;
        if (this.G.size() < d) throw Error("Actual packet size " + this.G.size() + " smaller than expected " + d);
        if (c.Hl !== (128 | a) || c.Il !== b) throw Error("Unexpected format of service: 3");
        return c
    }
};
var Ya;
(function() {
    var a = !1;
    Ya = function(b, c, d) {
        this.ca = b;
        this.lu = c;
        this.M = p.b(50);
        this.Kt = d;
        this.J = new mb(this.M, b, void 0);
        this.C = this.J.jd
    };
    Ya.prototype = {
        fB: function(b) {
            a = b
        },
        Oa: function() {
            return this.M.Hc()
        },
        $q: function(b, c, d) {
            this.Wh(1);
            this.C.ee("|", !1);
            this.C.ee(b, !1);
            this.C.ee("|", !1);
            this.C.ee(c.toString(), !1);
            this.C.ee("|", !1);
            this.C.ee(d.toString(), !1);
            this.C.ee("|", !1)
        },
        oA: function() {
            this.Wh(3)
        },
        Ty: function() {
            this.Wh(100)
        },
        mh: function(b, c, d) {
            var e = d.length + 1,
                f = this.De(e, 4, 2);
            b.u(e + f, 3);
            c.Eb(d, !1);
            this.ve(c, f, 0)
        },
        Gy: function(b) {
            var c = p.b(500),
                d = new mb(c, this.ca),
                e = d.jd;
            d.u(64);
            d.u(4, 3);
            e.B(2882382797);
            d.u(65);
            this.mh(d, e, "WebVisualization");
            d.u(67);
            this.mh(d, e, b);
            d.u(68);
            this.mh(d, e, La.b);
            d.u(69);
            this.mh(d, e, La.b);
            return c
        },
        Zt: function(b, c) {
            var d = p.b(500),
                e = new mb(d, this.ca),
                f = e.jd,
                g = new Uint8Array(c);
            e.u(16);
            this.mh(e, f, b);
            e.u(17);
            e.u(c.byteLength, 3);
            for (b = 0; b < g.length; ++b) f.va(g[b]);
            return d
        },
        Qy: function(b) {
            var c = this.Yb(1, 10);
            b = this.Gy(b.s.fk);
            var d = D.fa;
            this.J.u(131);
            this.mk(b, this.J, this.C);
            this.J.u(70);
            q.jB() && (d |= 2);
            this.J.u(4, 3);
            this.C.B(d);
            this.Qb(c)
        },
        mk: function(b, c, d) {
            var e = 2 >= c.Mq(b.size()) ? 2 : 6;
            c.u(b.size(), e);
            this.Vh(d, b)
        },
        Oy: function(b) {
            var c = this.Yb(1, 2);
            this.Dn(b, 1);
            this.Qb(c)
        },
        Dn: function(b, c) {
            this.J.u(34);
            this.J.u(4, 3);
            this.C.B(b);
            this.J.u(37);
            this.J.u(4, 3);
            this.C.B(c)
        },
        Py: function(b, c) {
            var d = this.Yb(1, 2);
            b = this.Zt(b, c);
            this.Dn(2, 2);
            this.J.u(129);
            this.mk(b, this.J, this.C);
            this.Qb(d)
        },
        qm: function(b, c, d, e) {
            if (void 0 === b || null === b) b = "";
            void 0 === c && (c = null);
            void 0 === d && (d = 0);
            void 0 === e && (e = D.A);
            var f = this.Yb(1, 2),
                g = null;
            this.J.u(34);
            this.J.u(4, 3);
            this.C.B(e);
            0 !== d && (this.J.u(35), this.J.u(4, 3), this.C.B(d));
            b = this.pv(b);
            null !== c && 0 !== d && e === D.fa && (g = this.ov(c, d));
            this.J.u(129);
            this.J.u(b.size() + (null !== g ? g.size() : 0), 2);
            this.Vh(this.C, b);
            null !== g && this.Vh(this.C, g);
            this.Qb(f)
        },
        yB: function(b, c, d, e) {
            var f = this.Yb(4, 1),
                g = b.length + 4 + 1,
                h = this.De(g, 4, 0),
                l = 0,
                r = 0,
                v = 524288;
            c && 0 < c.length && l++;
            d && 0 < d.length && l++;
            0 < l && (r = 8 + 84 * l, g += r);
            e && (v = 2097152);
            this.J.u(1);
            this.J.u(g + h, 3);
            this.C.Eb(b,
                !1);
            this.ve(this.C, h, 0);
            this.C.B(v);
            0 < l && (this.C.B(r), this.C.B(l), c && 0 < c.length && (this.C.Wa(1), this.C.Eb(c, !1), this.C.pj(82 - c.length - 1)), d && 0 < d.length && (this.C.Wa(2), this.C.Eb(d, !1), this.C.pj(82 - d.length - 1)));
            this.Qb(f)
        },
        wB: function(b) {
            var c = this.Yb(4, 3);
            this.J.u(3);
            this.J.u(4, 3);
            this.C.B(b);
            this.Qb(c)
        },
        ag: function(b) {
            this.Up(b, 4, 132)
        },
        vB: function(b) {
            var c = this.Yb(4, 4);
            this.J.u(132);
            this.J.u(8, 2);
            this.J.u(4);
            this.J.u(4, 3);
            this.C.B(b);
            this.Qb(c)
        },
        xB: function(b) {
            this.Up(b, 6, 134)
        },
        Qm: function(b) {
            var c =
                this.Yb(4, 2);
            this.J.u(2);
            this.J.u(4, 3);
            this.C.B(b);
            this.Qb(c)
        },
        Hy: function(b) {
            var c = this.Yb(8, D.pa),
                d = b.Kc.length + 1,
                e = this.De(d, 4, 2);
            this.J.u(1);
            this.J.u(d + e);
            this.C.Eb(b.Kc, !1);
            this.ve(this.C, e, 0);
            this.J.u(2);
            this.J.u(4, 3);
            this.C.B(0);
            this.C.B(0);
            this.Qb(c)
        },
        oq: function(b) {
            var c = this.Yb(8, 0 === b.direction ? 5 : 2),
                d = b.Kc.length + 1,
                e = this.De(d, 4, 2);
            this.J.u(1);
            this.J.u(d + e);
            this.C.Eb(b.Kc, !1);
            this.ve(this.C, e, 0);
            0 === b.direction ? (this.J.u(2), this.J.u(4, 3), this.C.B(0), this.C.B(0)) : (this.J.u(2), this.J.u(4,
                3), b.Xe.Lc = b.buffer.size(), this.C.B(0), this.C.B(b.Xe.Lc));
            this.Qb(c)
        },
        nq: function(b) {
            var c = this.Yb(8, 0 === b.direction ? 7 : 4);
            if (1 === b.direction) {
                var d = b.Xe.Lc;
                var e;
                var f = this.iv();
                if (20 < f) f -= 20;
                else return 1;
                f > d - b.status.cc && (f = d - b.status.cc);
                d = this.De(f, 4, 2);
                this.J.u(6);
                this.J.u(4, 3);
                this.C.B(f);
                b.status.Ve = f;
                this.J.u(5);
                this.J.u(4 + f + d, 3);
                this.C.B(b.Bh);
                for (e = 0; e < f; e++) this.C.va(b.buffer.getUint8());
                this.ve(this.C, d, 0)
            } else this.J.u(5), this.J.u(4, 3), this.C.B(b.Bh), this.C.B(D.b);
            this.Qb(c)
        },
        Iy: function(b) {
            var c =
                0 === b.direction ? b.ff.Lc : b.Xe.Lc;
            c = this.Yb(8, b.status.result === D.b && b.status.cc === c && b.status.Fc ? 8 : 9);
            this.J.u(7);
            this.J.u(4, 3);
            this.C.B(b.Bh);
            this.Qb(c)
        },
        Up: function(b, c, d) {
            c = this.Yb(4, c);
            b = this.tv(b);
            this.J.u(d);
            this.mk(b, this.J, this.C);
            this.Qb(c)
        },
        Qb: function(b) {
            var c = this.C.S() - b.Ds;
            this.dy(b.bs, c)
        },
        Yb: function(b, c) {
            b = new Eb(b, c, this.lu);
            this.Wh(2);
            this.C.pj(20);
            return {
                bs: b,
                Ds: this.C.S()
            }
        },
        pv: function(b) {
            var c = p.b(10 + b.length),
                d = new mb(c, this.ca),
                e = d.jd,
                f = b.length + 1,
                g = this.De(f, 4, 2);
            d.u(16);
            d.u(f +
                g);
            e.Eb(b, !1);
            this.ve(e, g, 0);
            return c
        },
        ov: function(b, c) {
            b = this.nv(b, c);
            c = p.b(10 + b.length);
            var d = new mb(c, this.ca),
                e = d.jd;
            d.u(17);
            d.u(b.length, 3);
            for (d = 0; d < b.length; ++d) e.va(b[d]);
            return c
        },
        nv: function(b, c) {
            var d = "Qcw@e46A6!R.gssltR4dg=_l)B^nQSo^",
                e = "",
                f = [],
                g = 0,
                h = 0,
                l = b.length + 1,
                r = [c & 255, 0, 0, 0];
            for (c = 0; c < d.length; c += 4) e = e.concat(String.fromCharCode(d.charCodeAt(c + 2) + 3)), e = e.concat(String.fromCharCode(d.charCodeAt(c + 1) + 2)), e = e.concat(String.fromCharCode(d.charCodeAt(c + 3) + 4)), e = e.concat(String.fromCharCode(d.charCodeAt(c) +
                1));
            d = e;
            32 > l && (l = 32);
            0 !== l % 4 && (l += 4 - l % 4);
            for (c = 0; c < l; ++c) {
                e = d.charCodeAt(g);
                var v = 0;
                c < b.length && (v = b.charCodeAt(c));
                f[c] = (v ^ e + r[h]) & 255;
                g++;
                g === d.length && (g = 0);
                h++;
                4 === h && (h = 0)
            }
            return f
        },
        iv: function() {
            return this.Kt - this.C.S()
        },
        tv: function(b) {
            var c = p.b(100),
                d = new mb(c, this.ca),
                e = d.jd,
                f = b.zn,
                g = b.Ha();
            d.u(1);
            d.u(16, 3);
            e.B(b.dc);
            e.B(b.ss);
            e.B(b.ts);
            e.B(b.Rr);
            (null !== f || null !== g && !a) && this.cy(d, f, a ? null : g);
            null !== b.ef && (d.u(3), d.u(8, 3), e.Wa(b.ef.m), e.Wa(b.ef.o), e.Wa(b.ef.T), e.Wa(b.ef.X));
            null !== g && a &&
                (d.u(5), d.u(8, 3), e.B(g.kb), e.B(g.zb));
            return c
        },
        cy: function(b, c, d) {
            b.u(2);
            var e = 0,
                f = b.jd;
            null !== d && (e = 8);
            null !== c && (e += c.size());
            var g = this.De(e, 4, 0);
            b.u(e + g, 3);
            null !== d && (f.B(d.kb), f.B(d.zb));
            null !== c && this.Vh(f, c);
            this.ve(f, g, 0)
        },
        Vh: function(b, c) {
            var d = c.size(),
                e;
            for (e = 0; e < d; ++e) b.va(c.Hq(e))
        },
        De: function(b, c, d) {
            for (var e = 0; 0 !== (b + d) % c;) b++, e++;
            return e
        },
        ve: function(b, c, d) {
            for (var e = 0; e < c; ++e) b.va(d)
        },
        Wh: function(b) {
            this.C.va(b);
            this.C.va(0);
            this.C.Wa(0)
        },
        dy: function(b, c) {
            this.C.seek(4);
            b.write(this.C,
                c)
        }
    }
})();
var Qa;
Qa = function() {};
Qa.rs = 0;
Qa.Vz = 1;
var Oa;
Oa = function(a) {
    this.i = q.R();
    this.sb = [];
    this.a = a;
    var b = this;
    this.b(this.i ? "pointermove" : "mousemove", function(c) {
        b.A(c)
    });
    this.b(this.i ? "pointerup" : "mouseup", function(c) {
        b.R(c)
    });
    this.b(this.i ? "pointercancel" : "mousecancel", function(c) {
        b.Hf(c)
    });
    this.Tb = []
};
Oa.prototype = {
    gA: function(a) {
        var b = [],
            c, d = this;
        for (c = 0; c < this.Tb.length; ++c) this.Tb[c].target === a && b.push(c);
        if (0 !== b.length) {
            var e = t.ng(a.ha);
            var f = t.Ze(a.Od);
            a = function(h) {
                h.stopPropagation()
            };
            var g = function(h) {
                d.iu(h, H.i, e, f)
            };
            for (c = 0; c < b.length; ++c) this.Tb[c].target = null, this.Tb[c].Am = a, this.Tb[c].Om = g, this.Tb[c].hm = void 0
        }
    },
    iu: function(a, b, c, d) {
        a.stopPropagation();
        var e = new w(a.pageX, a.pageY),
            f = new w(a.pageX, a.pageY);
        e.Nm(c);
        a = new yb(a, e, f, d);
        if (null !== this.a.W && this.a.W.handleEvent(a, b)) return !0;
        b = n.b(b, this.a.s.L, e);
        b.sc(d);
        d = t.$e(f);
        b.$a(d);
        this.a.$b(b)
    },
    Al: function(a) {
        for (var b = a.length - 1; 0 <= b; --b) this.Tb.splice(a[b], 1)
    },
    wp: function(a) {
        for (var b = [], c = 0; c < this.Tb.length; ++c) this.Tb[c].Aq === a && b.push(c);
        this.Al(b)
    },
    b: function(a, b) {
        this.sb.push({
            Bq: a,
            uj: b
        });
        document.addEventListener(a, b, !0)
    },
    A: function(a) {
        var b = this.wi(t.fa(a));
        null !== b && b.Am && b.Am(a)
    },
    R: function(a) {
        var b = t.fa(a),
            c = this.wi(b);
        null !== c && (this.wp(b), c.Om && c.Om(a))
    },
    Hf: function(a) {
        var b = t.fa(a),
            c = this.wi(b);
        null !== c && (this.wp(b),
            c.hm && c.hm(a))
    },
    wi: function(a) {
        for (var b = 0; b < this.Tb.length; ++b)
            if (this.Tb[b].Aq === a) return this.Tb[b];
        return null
    },
    hq: function(a, b, c, d, e) {
        var f = t.fa(a);
        if (null !== this.wi(f)) throw Error("This event is already registered.");
        if (t.pa(a) && a.target.releasePointerCapture) try {
            a.target.releasePointerCapture(f)
        } catch (g) {}
        this.Tb.push({
            Aq: f,
            target: b,
            Am: c,
            Om: d,
            hm: e
        })
    }
};
var H;
H = function() {};
H.A = 2;
H.i = 4;
H.b = 16;
H.fa = 521;
H.R = 529;
var n;
n = function(a, b, c, d) {
    void 0 === c && (c = 0);
    void 0 === d && (d = 0);
    this.dc = a;
    this.Rr = b;
    this.ss = c;
    this.ts = d;
    this.ef = this.zn = null;
    this.Wg = !1;
    this.cb = null
};
n.b = function(a, b, c) {
    return n.i(a, b, c)
};
n.A = function(a, b, c, d) {
    return new n(a, b, c, d)
};
n.fa = function(a, b) {
    return new n(257, a, b.charCodeAt(0))
};
n.R = function(a, b, c, d, e, f) {
    a = new n(516, a, b ? c ? d ? 7 : 5 : d ? 3 : 1 : 0, 0);
    b = p.b(12);
    c = O.b(b, !0);
    c.Db(0);
    c.Db(0);
    c.Db(e.w() - 1);
    c.Db(e.v() - 1);
    c.em(f);
    a.$a(b);
    return a
};
n.pa = function(a, b, c) {
    return n.i(a, b, c)
};
n.i = function(a, b, c) {
    return new n(a, b, c.Yc())
};
n.prototype = {
    Dr: function(a) {
        this.ef = new I(Math.max(0, a.m), Math.max(0, a.T), Math.max(0, a.o), Math.max(0, a.X))
    },
    $a: function(a) {
        this.zn = a
    },
    WA: function() {
        this.Wg = !0
    },
    sc: function(a) {
        this.cb = a
    },
    Ha: function() {
        return this.cb
    }
};
var Fb;
Fb = function() {
    var a;
    void 0 === a && (a = 100);
    this.Be = [];
    this.Vc = this.Kf = 0;
    this.zc = a;
    this.vi = !1;
    this.ap = 0
};
Fb.prototype = {
    push: function(a) {
        2097152 !== a.dc && (this.ap = t.b());
        if (this.Mv(a) || this.nt(a)) return !0;
        if (this.vi) return "undefined" !== typeof y && y.warn(t.i("Eventqueue full, dropped event with tag {0}", a.dc)), !1;
        this.Be[this.Vc % this.zc] = a;
        this.Vc = (this.Vc + 1) % this.zc;
        this.Vc === this.Kf && (this.vi = !0);
        return !0
    },
    empty: function() {
        return !this.vi && this.Kf === this.Vc
    },
    pop: function() {
        if (this.empty()) return null;
        this.vi = !1;
        var a = this.Kf;
        this.Kf = (this.Kf + 1) % this.zc;
        return this.Be[a]
    },
    nt: function(a) {
        if (!this.empty() &&
            a.dc === H.b && (this.Vc + this.zc - 2) % this.zc > this.Kf && 2 <= this.Be.length) {
            a = (this.Vc + this.zc - 2) % this.zc;
            var b = this.Be[a];
            if (535 === this.Be[(this.Vc + this.zc - 1) % this.zc].dc && b.dc === H.b) return this.Vc = a, !0
        }
        return !1
    },
    Mv: function(a) {
        if (!this.empty() && (a.dc === H.b || 2053 === a.dc || 2055 === a.dc || 516 === a.dc)) {
            var b = (this.Vc + this.zc - 1) % this.zc;
            if (this.Be[b].dc === a.dc) return this.Be[b] = a, !0
        }
        return !1
    }
};
var wa;
wa = function(a) {
    this.$d = {};
    this.a = a;
    this.kl = null
};
wa.prototype = {
    Ej: function(a, b, c) {
        void 0 === c && (c = null);
        var d = this.nw(a, c);
        var e = this.$d[d];
        if (void 0 !== e) return e;
        e = new Gb(this.a, a, c, b);
        return this.$d[d] = e
    },
    qy: function(a) {
        var b = [];
        this.Do(function(c) {
            c.vh() || (b.push(c), c.ry(function() {
                b.splice(b.indexOf(c), 1);
                0 === b.length && setTimeout(a, 0)
            }))
        })
    },
    uy: function() {
        var a = t.b(),
            b = [],
            c = this.a.getConfiguration(),
            d;
        if (-1 !== c.NumCachedImages)
            if (0 === c.NumCachedImages) this.$d = {};
            else {
                this.Do(function(f, g) {
                    var h = f.Zv;
                    f = f.np ? c.MaxUnusedImageAge : c.MaxUndrawnImageAge;
                    0 !== h && h < a - f && b.push({
                        path: g,
                        time: h
                    })
                });
                var e = Math.min(t.Ch(this.$d) - c.NumCachedImages, b.length);
                if (0 < e)
                    for (b.sort(function(f, g) {
                            return f.time - g.time
                        }), d = 0; d < e; ++d) delete this.$d[b[d].path]
            }
    },
    iA: function(a) {
        delete this.$d[a]
    },
    Hz: function() {
        null === this.kl && (this.kl = this.a.getConfiguration().LoadImagesById);
        return this.kl
    },
    Do: function(a) {
        var b;
        for (b in this.$d) {
            var c = this.$d[b];
            a(c, b)
        }
    },
    nw: function(a, b) {
        return null === b ? a : a + ":" + b
    }
};
var Gb;
Gb = function(a, b, c, d) {
    this.a = a;
    this.np = !1;
    this.be = c;
    this.Ee = t.bf(b);
    this.bx = 3;
    this.Ol(d, null);
    this.Vl();
    this.al = this.Vi = this.ij = null
};
Gb.prototype = {
    Ev: function() {
        try {
            q.Mr(this.od, this.Ee, this.a.getConfiguration()) ? this.av() : (null === this.be || this.Uo() || this.Rx(), this.$h(2))
        } catch (a) {
            this.a.error("Unexpected exception during load image callback: " + a)
        }
    },
    Uo: function() {
        return t.ad(this.Ee)
    },
    Rx: function() {
        try {
            var a = window.document.createElement("canvas"),
                b = a.getContext("2d"),
                c, d = parseInt(this.be.substr(1, 2), 16),
                e = parseInt(this.be.substr(3, 2), 16),
                f = parseInt(this.be.substr(5, 2), 16),
                g = this.lv(),
                h = this.Kq();
            a.width = h.O;
            a.height = h.Z;
            b.drawImage(this.od,
                0, 0);
            var l = b.getImageData(0, 0, a.width, a.height);
            for (c = 0; c < l.data.length; c += 4) g(l.data[c], l.data[c + 1], l.data[c + 2], d, e, f) && (l.data[c + 3] = 0, l.data[c] = 0, l.data[c + 1] = 0, l.data[c + 2] = 0);
            b.putImageData(l, 0, 0);
            this.ij = a;
            this.od = null
        } catch (r) {
            this.ij = this.be = null, y.warn("Exception during making image " + this.Ee + " transparent. Is this an SVG? As a workaround it will be rendered ignoring the transparency color")
        }
    },
    cw: function(a) {
        try {
            if (y.warn("Loading image " + this.Ee + " failed: " + a.type), 0 <= this.bx--) {
                var b = this;
                window.setTimeout(function() {
                    y.info("Triing to load the image " + b.Ee + " again");
                    b.Ol(!0, null)
                }, 50);
                this.$h(4)
            } else this.$h(3)
        } catch (c) {
            this.a.error("Unexpected exception during handling of load image problems: " + c)
        }
    },
    hz: function() {
        this.Vl();
        this.np = !0;
        2 !== this.ka && y.warn("Access to not (yet) loaded image");
        return null !== this.ij ? this.ij : this.od
    },
    Kq: function() {
        null === this.al && (this.al = q.pA(this.od));
        return this.al
    },
    ry: function(a) {
        this.Vi = a
    },
    vh: function() {
        return 2 === this.ka || 3 === this.ka
    },
    loaded: function() {
        return 2 ===
            this.ka
    },
    $h: function(a) {
        this.Vl();
        this.ka = a;
        null !== this.Vi && this.vh() && (this.Vi(), this.Vi = null)
    },
    Vl: function() {
        this.Zv = t.b()
    },
    Ol: function(a, b) {
        this.od = new Image;
        var c = this;
        b = null === b ? this.Ee : b;
        this.od.onload = function() {
            c.Ev()
        };
        this.od.onerror = function(d) {
            c.cw(d)
        };
        this.ka = 1;
        this.od.src = this.gt(b, a)
    },
    gt: function(a, b) {
        b && (a += "?" + t.b());
        this.Uo() && !this.a.getConfiguration().WorkaroundDisableSVGAspectRatioWorkaround && (a += "#svgView(preserveAspectRatio(none))");
        return a
    },
    lv: function() {
        return this.a.getConfiguration().FuzzyTransparencyColorEvaluation ?
            function(a, b, c, d, e, f) {
                return 2 > Math.abs(a - d) && 2 > Math.abs(b - e) && 2 > Math.abs(c - f)
            } : function(a, b, c, d, e, f) {
                return a === d && b === e && c === f
            }
    },
    av: function() {
        y.b("Workaround for image " + this.Ee + " without width/height activated");
        var a = this;
        q.aA(this.od, function(b) {
            a.Ol(!1, b)
        }, function(b) {
            y.warn("Retrieving workaround image failed so going on as formerly, reason: " + b);
            a.$h(3)
        })
    }
};
var va;
va = function() {
    this.sd = {};
    this.hd = null;
    this.Jh = "<Project>"
};
va.prototype = {
    um: function(a) {
        a = a.toLowerCase().split(".");
        var b = [],
            c;
        for (c = 0; c < a.length; ++c) b[c] = t.Ia(a[c]);
        if (1 > b.length) return null;
        a = b[b.length - 1];
        if (1 === b.length) return this.Ug(this.Xu(a));
        c = b[b.length - 2];
        if (2 === b.length) {
            var d = this.Yu(c);
            if (null !== d) return this.Ug(this.Mk(a, d));
            d = this.Ok(c);
            return null !== d ? this.Ug(this.pi(a, d)) : null
        }
        b = b.slice(0, b.length - 2).join(".");
        d = this.Ok(b);
        if (null !== d && (d = this.Nk(c, d), null !== d)) return this.Ug(this.Mk(a, d));
        d = this.Ok(b + "." + c);
        return null !== d ? this.Ug(this.pi(a,
            d)) : null
    },
    vA: function(a) {
        this.hd = a
    },
    Ug: function(a) {
        return null !== a ? a.path : null
    },
    Ok: function(a) {
        var b = this.yo(a);
        null === b && (b = this.Zu(a));
        return b
    },
    yo: function(a) {
        a = this.sd[a];
        return void 0 !== a ? a : null
    },
    Zu: function(a) {
        if (null !== this.hd) {
            a = a.toLowerCase();
            var b, c = null;
            for (b = 0; b < this.hd.length; ++b)
                if (this.hd[b].Bm === a) {
                    c = this.hd[b].br;
                    break
                } if (null !== c)
                for (b = 0; b < this.hd.length; ++b)
                    if (this.hd[b].Bm !== a && this.hd[b].br === c) {
                        var d = this.yo(this.hd[b].Bm);
                        if (null !== d) return d
                    }
        }
        return null
    },
    Xu: function(a) {
        var b =
            this.sd[this.Jh],
            c;
        if (void 0 !== b && (b = this.pi(a, b), null !== b)) return b;
        for (c in this.sd)
            if (c !== this.Jh && (b = this.pi(a, this.sd[c]), null !== b)) return b;
        return null
    },
    pi: function(a, b) {
        var c;
        for (c in b.Yf) {
            var d = this.Mk(a, b.Yf[c]);
            if (null !== d) return d
        }
        return null
    },
    Mk: function(a, b) {
        a = b.entries[a];
        return void 0 === a ? null : a
    },
    Yu: function(a) {
        var b = this.sd[this.Jh],
            c;
        if (void 0 !== b && (b = this.Nk(a, b), null !== b)) return b;
        for (c in this.sd)
            if (b = this.Nk(a, this.sd[c]), null !== b) return b;
        return null
    },
    Nk: function(a, b) {
        a = b.Yf[a];
        return void 0 !== a ? a : null
    },
    fill: function(a) {
        a = a.replace(/\r\n/g, "\n").split("\n");
        var b;
        for (b = 0; b < a.length; ++b) {
            var c = a[b].split(";");
            if (!(4 > c.length)) {
                var d = this.mw(t.Ia(c[1]));
                var e = t.Ia(c[0]).toLowerCase();
                var f = t.Ia(c[2]).toLowerCase();
                var g = t.Ia(c[3]);
                c = this.sd[d];
                if (void 0 === c) {
                    c = {
                        Yf: {}
                    };
                    var h = this.bo(e);
                    h.entries[f] = this.wk(f, g);
                    c.Yf[e] = h;
                    this.sd[d] = c
                } else h = c.Yf[e], void 0 === h ? (h = this.bo(e), h.entries[f] = this.wk(f, g), c.Yf[e] = h) : h.entries[f] = this.wk(f, g)
            }
        }
    },
    mw: function(a) {
        return null === a || "" ===
            a ? this.Jh : a.toLowerCase()
    },
    bo: function(a) {
        return {
            name: a,
            entries: {}
        }
    },
    wk: function(a, b) {
        return {
            id: a,
            path: b
        }
    }
};
var Ba;
Ba = function() {};
Ba.prototype = {
    h: function(a) {
        if (a.a.ba) {
            var b = a.a.U().ma();
            if (null !== b && (b = b.mc, null !== b && void 0 !== b)) {
                b.mj();
                return
            }
        }
        a = a.a.W;
        null !== a && a.mj()
    }
};
var Hb;
Hb = function(a, b) {
    this.l = G.A(b)
};
Hb.prototype = {
    h: function(a) {
        a.wy();
        a.a.wc.Mj(this.l)
    }
};
var Ib;
Ib = function(a, b) {
    this.l = G.A(b)
};
Ib.prototype = {
    h: function(a) {
        a.getContext().clearRect(this.l.m, this.l.o, this.l.w(), this.l.v());
        a.a.wc.Mj(this.l)
    }
};
var Jb;
Jb = function(a, b) {
    this.l = G.A(b)
};
Jb.prototype = {
    h: function(a) {
        a = a.getContext();
        a.save();
        a.beginPath();
        a.rect(this.l.m, this.l.o, this.l.w() + 1, this.l.v() + 1);
        a.clip()
    }
};
var Kb;
Kb = function() {};
Kb.prototype = {
    h: function(a) {
        (a = a.a.Tl) && a.lq()
    }
};
var Lb;
Lb = function(a, b) {
    this.l = G.ad(b, !1);
    this.Xi = 0 !== b.getInt8();
    this.ce = b.getInt8();
    switch (this.ce) {
        case 2:
        case 4:
            this.hi = b.getUint32();
            this.po = b.getUint32();
            this.ii = b.getUint32();
            break;
        case 1:
        case 3:
            this.Xn = b.getInt16(), this.hi = b.getUint32()
    }
};
Lb.prototype = {
    h: function(a) {
        var b = a.getContext(),
            c = this.l.m,
            d = this.l.o,
            e = this.l.w(),
            f = this.l.v(),
            g = b.lineWidth;
        b.save();
        this.Ep = a.a.getConfiguration().SemiTransparencyActive;
        a.getState().ie() ? a.getState().qj(this.l) : b.fillStyle = !0 === this.Ep ? G.i(this.hi) : G.b(this.hi);
        b.lineWidth = 1;
        c += .5;
        d += .5;
        switch (this.ce) {
            case 2:
            case 4:
                this.Jw(b, c, d, e, f);
                break;
            case 1:
            case 3:
                this.Iw(b, c, d, e, f)
        }
        b.lineWidth = g;
        a.getState().ie() && a.getState().Oj();
        b.restore()
    },
    Jw: function(a, b, c, d, e) {
        if (!0 === this.Ep) {
            var f = this.Xi ? G.i(this.ii) :
                "#000000";
            var g = G.i(this.po);
            var h = G.i(this.ii)
        } else f = this.Xi ? G.b(this.ii) : "#000000", g = G.b(this.po), h = G.b(this.ii);
        this.Xi ? (a.strokeStyle = f, a.strokeRect(b, c, d, e), a.fillRect(b, c, d, e)) : (a.fillRect(b, c, d, e), a.strokeStyle = g, a.beginPath(), a.moveTo(b, c), a.lineTo(b + d, c), a.moveTo(b, c), a.lineTo(b, c + e), a.stroke(), a.closePath(), a.strokeStyle = f, a.beginPath(), a.moveTo(b, c + e), a.lineTo(b + d, c + e), a.lineTo(b + d, c), a.stroke(), a.closePath(), a.strokeStyle = h, a.beginPath(), a.moveTo(b + 1, c + e - 1), a.lineTo(b + d - 2, c + e - 1), a.moveTo(b +
            d - 1, c + 1), a.lineTo(b + d - 1, c + e - 1), a.stroke(), a.closePath())
    },
    Iw: function(a, b, c, d, e) {
        var f = new Mb(this.hi, this.Xn);
        if (this.Xi) a.strokeStyle = G.b(f.Jq(0)), a.strokeRect(b, c, d, e), a.fillRect(b, c, d, e);
        else {
            a.strokeStyle = "#000000";
            a.fillRect(b, c, d, e);
            a.strokeRect(b, c, d, e);
            var g;
            for (g = 0; g < this.Xn; ++g) a.beginPath(), a.moveTo(b + g, c + e - g), a.lineTo(b + g, c + g), a.lineTo(b + d - g, c + g), a.strokeStyle = G.b(f.az(g)), a.stroke(), a.beginPath(), a.moveTo(b + d - g, c + 1 + g), a.lineTo(b + d - g, c + e - g), a.lineTo(b + 1 + g, c + e - g), a.strokeStyle = G.b(f.Jq(g)),
                a.stroke()
        }
    }
};
var Aa;
Aa = function(a, b, c) {
    a = b.S();
    var d = b.getUint16();
    var e = b.aa(d, !1);
    d = b.getUint16();
    d = b.aa(d, !1);
    "" !== e && (d = e + "." + d);
    this.Af = d;
    this.l = G.ad(b, !0);
    this.l.normalize();
    e = b.getUint32();
    this.fl = 0 !== (e & 1);
    this.Uh = 0 !== (e & 2);
    this.si = 0 !== (e & 4);
    this.Bx = 0 !== (e & 8);
    this.Pn = 0 !== (e & 16);
    this.Sp = 0 !== (e & 32);
    this.Sk = 0 !== (e & 128);
    this.Fl = 0 !== (e & 256);
    this.Xl = 0 !== (e & 1024);
    this.pk = 0 !== (e & 2048);
    this.$g = 0 !== (e & 4096);
    this.Ag = !1;
    this.be = G.b(b.getUint32());
    c >= b.S() - a + 16 && (this.Ag = !0, this.Jk = b.getFloat32(), this.Kk = b.getFloat32());
    this.xc = null
};
Aa.prototype = {
    h: function(a) {
        a = a.getContext();
        var b = G.DB(this.l),
            c = this.l.clone(),
            d = this;
        this.zx(a, c, b);
        null !== this.xc && (this.xc.loaded() ? this.vu(a, this.xc.hz(), function() {
            return d.xc.Kq()
        }, c) : this.wu(a, this.l));
        this.Bx && (c = G.$e(a), a.strokeRect(this.l.m + c, this.l.o + c, this.l.w(), this.l.v()));
        this.Dt(a, b)
    },
    qz: function(a, b) {
        var c;
        this.$g && null !== (c = b.um(this.Af)) && a.iA(c);
        if (null === this.xc) {
            if (a.Hz()) return b = "/ImageByImagePoolId?id=" + this.Af, this.xc = this.Sp ? a.Ej(b, this.$g, this.be) : a.Ej(b, this.$g), this.xc.vh();
            c = b.um(this.Af);
            if (null !== c) return this.xc = this.Sp ? a.Ej(c, this.$g, this.be) : a.Ej(c, this.$g), this.xc.vh();
            y.warn("Imagepoolentry for " + this.Af + " not found");
            return !0
        }
        return this.xc.vh()
    },
    vu: function(a, b, c, d) {
        if (this.si && this.Ag) {
            var e = c();
            e = new A(Math.round(this.Jk * e.O), Math.round(this.Kk * e.Z));
            d = t.qe(d, e, this);
            this.si = !1;
            this.Uh = !0
        }
        if (this.Uh) a.drawImage(b, d.m, d.o, d.w(), d.v());
        else if (this.fl) {
            e = c();
            d.w() / e.O < d.v() / e.Z ? (c = Math.round(d.w() * e.Z / e.O), e = d.w()) : (c = d.v(), e = Math.round(d.v() * e.O / e.Z));
            var f =
                new I(d.m, d.o, d.m + e, d.o + c);
            d = t.re(f, d, this);
            a.drawImage(b, d.m, d.o, e, c)
        } else a.drawImage(b, d.m, d.o)
    },
    zx: function(a, b, c) {
        c && (a.save(), b.ec.rj(a, b));
        this.Pn && (a.save(), a.beginPath(), a.rect(b.m, b.o, b.w() + 1, b.v() + 1), a.clip())
    },
    Dt: function(a, b) {
        this.Pn && a.restore();
        b && a.restore()
    },
    wu: function(a, b) {
        b = b.Rq(-3);
        a.save();
        a.fillStyle = "#eeeeee";
        a.strokeStyle = "#ff0000";
        a.lineWidth = 3;
        a.fillRect(b.m, b.o, b.w(), b.v());
        a.beginPath();
        a.moveTo(b.m, b.o);
        a.lineTo(b.T, b.X);
        a.moveTo(b.T, b.o);
        a.lineTo(b.m, b.X);
        a.closePath();
        a.stroke();
        a.restore()
    }
};
var Nb;
Nb = function(a, b) {
    this.l = G.ad(b, !0);
    this.Jp = G.fa(b.getInt16());
    this.Ix = G.fa(b.getInt16());
    this.Tu = 1 === b.getInt16()
};
Nb.prototype = {
    h: function(a) {
        var b = a.getContext(),
            c = this.l.w(),
            d = this.l.v(),
            e = !a.getState().wm(),
            f = !a.getState().yf,
            g = Math.min(c, d) / 2;
        0 >= c || 0 >= d || (b.save(), this.Xs(b), a.getState().ie() && a.getState().qj(this.sv(g)), b.beginPath(), b.arc(0, 0, g, this.Jp, this.Jp + this.Ix, !1), this.Tu && (b.lineTo(0, 0), b.closePath(), e && b.fill()), b.restore(), f && b.stroke(), a.getState().ie() && a.getState().Oj())
    },
    sv: function(a) {
        return new I(-a, -a, a, a)
    },
    Xs: function(a) {
        var b = this.l.w(),
            c = this.l.v();
        null !== this.l.ec ? this.l.ec.rj(a, this.l) :
            a.translate(this.l.m + .5, this.l.o + .5);
        a.translate(b / 2, c / 2);
        b > c ? a.scale(b / c, 1) : a.scale(1, c / b)
    }
};
var Ob;
Ob = function(a, b) {
    this.N = G.Qh(b)
};
Ob.prototype = {
    h: function(a) {
        a = a.getContext();
        var b;
        for (b = 0; b < this.N.length; ++b) a.fillRect(this.N[b].c, this.N[b].f, 1, 1)
    }
};
var Pb;
Pb = function(a, b) {
    this.ce = b.getUint16();
    2 === a ? this.N = G.Qh(b) : 59 === a && (this.N = G.es(b))
};
Pb.prototype = {
    h: function(a) {
        var b = a.getContext(),
            c = !a.getState().wm(),
            d = !a.getState().yf;
        if (!(2 > this.N.length)) {
            a.getState().ie() && a.getState().qj(this.Gx());
            d && this.Tw(b);
            switch (this.ce) {
                case 0:
                    this.xu(b, c, d);
                    break;
                case 1:
                    d && this.yu(b);
                    break;
                case 2:
                    d && this.tu(b)
            }
            a.getState().ie() && a.getState().Oj()
        }
    },
    Tw: function(a) {
        a = G.$e(a);
        var b;
        if (0 !== a)
            for (b = 0; b < this.N.length; ++b) this.N[b].c += a, this.N[b].f += a
    },
    xu: function(a, b, c) {
        a.beginPath();
        a.moveTo(this.N[0].c, this.N[0].f);
        for (var d = 1; d < this.N.length; ++d) a.lineTo(this.N[d].c,
            this.N[d].f);
        a.closePath();
        b && a.fill();
        c && a.stroke()
    },
    yu: function(a) {
        var b;
        a.beginPath();
        a.moveTo(this.N[0].c, this.N[0].f);
        for (b = 1; b < this.N.length; ++b) a.lineTo(this.N[b].c, this.N[b].f);
        a.stroke()
    },
    tu: function(a) {
        a.beginPath();
        a.moveTo(this.N[0].c, this.N[0].f);
        for (var b = 1; b + 3 <= this.N.length;) a.bezierCurveTo(this.N[b].c, this.N[b].f, this.N[b + 1].c, this.N[b + 1].f, this.N[b + 2].c, this.N[b + 2].f), b += 3;
        for (; b < this.N.length; ++b) a.lineTo(this.N[b].c, this.N[b].f);
        a.stroke()
    },
    Gx: function() {
        var a = 1E9,
            b = -1E9,
            c = 1E9,
            d = -1E9,
            e;
        for (e = 0; e < this.N.length; ++e) this.N[e].c < a && (a = this.N[e].c), this.N[e].f < c && (c = this.N[e].f), this.N[e].c > b && (b = this.N[e].c), this.N[e].f > d && (d = this.N[e].f);
        return new I(a, c, b, d)
    }
};
var Qb;
Qb = function(a, b) {
    var c = b.getUint16();
    switch (a) {
        case 1:
            var d = G.ad(b, !0);
            break;
        case 45:
            d = G.A(b);
            break;
        case 60:
            d = G.$r(b);
            break;
        case 61:
            d = G.Yr(b)
    }
    this.Yx = new Rb(c, d)
};
Qb.prototype = {
    h: function(a) {
        this.Yx.yj(a)
    }
};
var Sb;
Sb = function(a, b) {
    this.ce = b.getUint16();
    a = b.getUint16();
    var c = b.getUint16();
    this.Mf = new A(a, c);
    a = b.getUint16();
    c = b.getUint16();
    this.Ml = new A(a, c);
    b = b.getUint32();
    this.Wx = 0 !== (b & 1);
    this.Xx = 0 !== (b & 2);
    this.Wl = 0 !== (b & 4)
};
Sb.prototype = {
    h: function(a) {
        var b = a.getState().zl;
        var c = new w(b.c + this.Ml.O, b.f + this.Ml.Z);
        if (this.Wl) {
            var d = a.getState().wl;
            var e = c.c;
            c.c = d.c + this.Ml.O;
            d = e - c.c
        } else d = this.Mf.O;
        c = new I(c.c, c.f, c.c + d, c.f + this.Mf.Z);
        (new Rb(this.ce, c)).yj(a);
        this.Wx && (b.c += this.Mf.O);
        this.Xx && (b.f += this.Mf.Z)
    }
};
var Rb;
Rb = function(a, b) {
    this.ce = a;
    this.l = b.Mz()
};
Rb.prototype = {
    uu: function(a, b, c, d, e, f, g) {
        a.beginPath();
        if ("function" === typeof a.ellipse) {
            var h = d / 2;
            e /= 2;
            a.ellipse(b + h, c + e, h, e, 0, 0, 2 * Math.PI)
        } else {
            h = d / 2 * .5522848;
            var l = e / 2 * .5522848,
                r = b + d,
                v = c + e;
            d = b + d / 2;
            e = c + e / 2;
            a.moveTo(b, e);
            a.bezierCurveTo(b, e - l, d - h, c, d, c);
            a.bezierCurveTo(d + h, c, r, e - l, r, e);
            a.bezierCurveTo(r, e + l, d + h, v, d, v);
            a.bezierCurveTo(d - h, v, b, e + l, b, e);
            a.closePath()
        }
        f && a.fill();
        g && a.stroke()
    },
    zu: function(a, b, c, d, e, f, g) {
        f && a.fillRect(b, c, d, e);
        g && a.strokeRect(b, c, d, e)
    },
    yj: function(a) {
        this.mm = a.getContext();
        this.me = a;
        this.x = this.l.m;
        this.y = this.l.o;
        this.Kr = this.l.w();
        this.Fb = this.l.v();
        this.radiusX = a.getState().Po;
        this.radiusY = a.getState().Qo;
        this.fill = !a.getState().wm();
        this.stroke = !a.getState().yf;
        this.ar = this.l.ec;
        0 > this.Kr || 0 > this.Fb || (this.me.getState().ie() && this.me.getState().qj(this.l), this.ou())
    },
    ou: function() {
        var a = this.mm,
            b = this.x,
            c = this.y,
            d = this.Kr,
            e = this.Fb,
            f = this.radiusX,
            g = this.radiusY,
            h = this.fill,
            l = this.stroke,
            r = this.ar;
        null !== r && (a.save(), this.l.ec.rj(a, this.l));
        if (this.stroke && null ===
            this.ar) {
            var v = G.$e(a);
            b += v;
            c += v
        }
        switch (this.ce) {
            case 0:
                this.zu(a, b, c, d, e, h, l);
                break;
            case 1:
                G.mg(a, b, c, d, e, h, l, f, g);
                break;
            case 2:
                this.uu(a, b, c, d, e, h, l);
                break;
            case 3:
                l && (a.beginPath(), a.moveTo(b, c + e), a.lineTo(b + d, c), a.stroke());
                break;
            case 4:
                l && (a.beginPath(), a.moveTo(b, c), a.lineTo(b + d, c + e), a.stroke())
        }
        null !== r && a.restore();
        this.me.getState().ie() && this.me.getState().Oj()
    }
};
var Tb;
Tb = function(a, b) {
    if (3 === a || 11 === a) var c = G.ng(b);
    else if (46 === a || 47 === a) c = G.ds(b);
    var d = b.getUint32();
    this.yi = this.Cv(d);
    this.Of = this.$x(d);
    this.Gn = 0 !== (d & 16);
    this.kt = 0 !== (d & 32);
    this.ax = 0 !== (d & 64);
    this.nx = 0 !== (d & 1024);
    this.Wl = 0 !== (d & 2048);
    this.dj = 0 !== (d & 256);
    this.fh = 0 !== (d & 512);
    this.l = G.hg(c, 0 !== (d & 128));
    d = b.getUint16();
    this.ea = b.aa(d, 11 === a || 47 === a);
    this.Ni = G.BB(this.ea);
    this.Np = G.CB(this.ea);
    this.Ke = this.ea
};
Tb.prototype = {
    h: function(a) {
        this.me = a;
        this.mm = a.getContext();
        this.state = a.getState();
        if (this.ax) {
            var b = this.state.zl;
            this.Wl ? (b = this.state.wl, a = b.c, b = b.f) : (a = b.c, b = b.f);
            this.l = new I(a, b, a + this.l.w(), b + this.l.v())
        }
        this.pu()
    },
    pu: function() {
        var a = this.mm,
            b = this.state,
            c = this.me;
        a.save();
        null !== this.l.ec && this.l.ec.rj(a, this.l);
        a.beginPath();
        a.rect(this.l.m - .5, this.l.o - .5, this.l.w() + 1, this.l.v() + 1);
        a.clip();
        a.fillStyle = b.Op;
        a.font = b.Ib;
        var d = !1;
        var e = b.Bg;
        var f = a.font;
        this.Ss(a, c);
        if (!0 === c.a.getConfiguration().AutoFontReductionActive &&
            this.fh || !1 === c.a.getConfiguration().AutoFontReductionActive && (this.dj || this.fh)) d = this.ex(a, c);
        !1 === d && (this.Ni ? this.Bl(a, c) : this.xp(a));
        if (this.kt) {
            d = b.zl;
            var g = b.wl;
            d.c = this.l.m;
            d.f = this.l.o;
            this.nx && (g.c = d.c + 1, g.f = d.f);
            d.c = this.l.m + this.Lx(a)
        }!0 === c.a.getConfiguration().AutoFontReductionActive && !1 === this.fh && (b.ur(e), b.tr(f));
        a.restore()
    },
    Ss: function(a, b) {
        var c = b.getState(),
            d, e;
        if (!0 === b.a.getConfiguration().AutoFontReductionActive && !1 === this.fh) {
            var f = a.font;
            var g = c.Bg;
            var h = this.l.w() + 1;
            var l =
                this.l.v() + 1;
            for (d = !0;
                (h > this.l.w() || l > this.l.v()) && 1 < g;) {
                d || (--g, c.ur(g), c.tr(t.Qh(f, g)), a.font = c.Ib);
                this.Ke = this.ea;
                this.dj && this.yp(a, b, !0, this.Ke);
                if (this.Ni)
                    if (l = G.re(this.Ke), h = 0, 0 < l.length) {
                        for (e = 0; e < l.length; ++e) d = a.measureText(l[e]).width, h < d && (h = d);
                        l = t.A(b) * l.length
                    } else h = a.measureText(this.Ke).width, l = t.A(b);
                else h = a.measureText(this.Ke).width, l = t.A(b);
                d = !1
            }
            this.ea = this.Ke
        }
    },
    xp: function(a) {
        this.Np ? this.cx(a) : this.gi(a, this.ea, this.lk(a))
    },
    Bl: function(a, b) {
        var c = G.re(this.ea),
            d = this,
            e;
        if (0 < c.length) {
            b = t.A(b);
            var f = b * c.length;
            this.Rs(a, f);
            f = this.Us(a, f);
            var g = function(r) {
                d.gi(a, r.text, l)
            };
            for (e = 0; e < c.length; ++e) {
                if (this.Np) {
                    var h = G.bf(a, c[e]);
                    var l = this.An(a, h);
                    l.f = f.f;
                    this.Wo(h, l, g)
                } else this.gi(a, c[e], f);
                f.f += b
            }
        }
    },
    ex: function(a, b) {
        var c;
        this.dj ? c = this.yp(a, b, !1, this.ea) : this.fh && (c = this.dx(a, b));
        return c
    },
    yp: function(a, b, c, d) {
        var e = !1;
        var f = this.l.T - this.l.m;
        this.Sl(a, d) > f && (e = !0, d = this.ay(a, d, f), !1 === c ? (this.ea = d, this.Bl(a, b)) : this.Ke = d);
        return e
    },
    ay: function(a, b, c) {
        var d = !1,
            e = "",
            f = 1;
        do {
            for (; this.Sl(a, b.slice(0, f)) < c;)
                if (f++, f === b.length) {
                    d = !0;
                    break
                } if (!d) {
                var g = !1;
                for (var h = f - 1; 0 < h; h--)
                    if (this.Vv(b.charAt(h))) {
                        e += [b.slice(0, h), "\n"].join("");
                        b = b.slice(h + 1);
                        g = !0;
                        break
                    } g || (e += [b.slice(0, f - 1), "\n"].join(""), b = b.slice(f - 1));
                f = 1
            }
        } while (!d);
        return [e, b].join("")
    },
    Vv: function(a) {
        return (new RegExp(/^\s$/)).test(a.charAt(0))
    },
    dx: function(a, b) {
        this.Gn = !0;
        this.Ni ? this.Bl(a, b) : this.xp(a, b);
        return !0
    },
    cx: function(a) {
        var b = G.bf(a, this.ea),
            c = this.An(a, b),
            d = this;
        this.Wo(b, c, function(e) {
            d.gi(a,
                e.text, c)
        })
    },
    Wo: function(a, b, c) {
        var d;
        if (2 === this.yi)
            for (d = a.length - 1; 0 <= d; --d) c(a[d]), b.c -= a[d].Sm * G.Mc;
        else
            for (d = 0; d < a.length; ++d) c(a[d]), b.c += a[d].Sm * G.Mc
    },
    gi: function(a, b, c) {
        this.Gn && (b = this.bv(a, b));
        a.fillText(b, c.c, c.f)
    },
    bv: function(a, b) {
        if (G.Ia(a, b, !1) <= this.l.w()) return b;
        for (var c, d = 0, e = b.length - 1, f, g; 1 < e - d;) {
            f = Math.floor((d + e) / 2);
            c = b.substr(0, f) + "...";
            g = G.Ia(a, c, !1) - this.l.w();
            if (0 === g) return c;
            0 > g ? (d = f, g = !1) : (e = f, g = !0)
        }
        return !0 === g ? 0 < f ? c.substr(0, f - 1) + "..." : "" : c
    },
    Us: function(a, b) {
        var c =
            this.lk(a);
        a.textBaseline = "top";
        3 === this.Of ? c = new w(c.c, this.l.o + this.l.v() / 2 - b / 2) : 2 === this.Of && (c = new w(c.c, c.f - b));
        return c
    },
    Rs: function(a, b) {
        this.dj && 3 === this.Of && this.l.v() < b && (this.Of = 1)
    },
    lk: function(a) {
        if (1 === this.yi) {
            var b = this.l.m + 1;
            a.textAlign = "left"
        } else 3 === this.yi ? (b = this.l.m + this.l.w() / 2, a.textAlign = "center") : (b = this.l.T - 1, a.textAlign = "right");
        if (1 === this.Of) {
            var c = this.l.o + 2;
            a.textBaseline = "top"
        } else 3 === this.Of ? (c = this.l.o + this.l.v() / 2, a.textBaseline = "middle") : (c = this.l.X - 1, a.textBaseline =
            "bottom");
        return new w(b, c)
    },
    An: function(a, b) {
        a = this.lk(a);
        var c, d = 0;
        if (3 === this.yi) {
            for (c = 0; c < b.length; ++c) d += b[c].Sm * G.Mc;
            a.c = this.l.m + (this.l.w() - d + G.Mc) / 2
        }
        return a
    },
    Cv: function(a) {
        var b = 1;
        0 !== (a & 1) ? b = 3 : 0 !== (a & 2) && (b = 2);
        return b
    },
    $x: function(a) {
        var b = 1;
        0 !== (a & 4) ? b = 3 : 0 !== (a & 8) && (b = 2);
        return b
    },
    Lx: function(a) {
        return this.Sl(a, this.ea)
    },
    Sl: function(a, b) {
        if (this.Ni) {
            var c = 0;
            b = G.re(b);
            var d;
            for (d = 0; d < b.length; ++d) c = Math.max(c, G.Ia(a, b[d], !0));
            return c
        }
        return G.Ia(a, b, !0)
    }
};
var Ha;
(function() {
    var a = null;
    Ha = function(b, c) {
        var d = c.getUint16();
        this.ea = c.aa(d, 15 === b);
        this.j = G.Lb(c);
        this.kp = 1 === (c.getUint32() & 1)
    };
    Ha.prototype = {
        h: function(b) {
            var c = b.getContext(),
                d = G.re(this.ea),
                e = b.a.getConfiguration().Oq(),
                f = this.lt(c, e, d),
                g = f.size,
                h = f.lineHeight,
                l = new A(6, 4);
            f = this.mt(b.fe(), g, l, b);
            if (b.a.ba) this.ea = this.ea.replace(/(?:\r\n|\r|\n)/g, "<br>"), c = b.a.Tl, this.kp ? c.Uz(f.m, f.o, this.ea, b.a.getConfiguration().TooltipFont, "#ffffe1") : c.ty(this.ea, g, document.getElementById("background").width,
                document.getElementById("background").height);
            else {
                f = f.ac(.5, .5);
                c.save();
                c.font = e.fn;
                c.textBaseline = "top";
                c.textAlign = "left";
                c.lineWidth = 1;
                c.strokeStyle = "#000000";
                c.fillStyle = "#ffffe1";
                c.fillRect(f.m, f.o, f.w(), f.v());
                c.strokeRect(f.m, f.o, f.w(), f.v());
                c.fillStyle = "#000000";
                e = new w(f.m + l.O / 2, f.o + l.Z / 2);
                for (g = 0; g < d.length; ++g) c.fillText(d[g], e.c, e.f), e = new w(e.c, e.f + h);
                this.kp && (a = new I(0, 0, 0, 0));
                null !== a && f.Yy(a) || this.ux(b.a, f);
                a = f;
                c.restore()
            }
        },
        ux: function(b, c) {
            var d = new n(513, b.s.L, 0, 0),
                e = p.b(8),
                f = O.b(e, !0);
            f.Db(Math.floor(c.m));
            f.Db(Math.floor(c.o));
            f.Db(Math.ceil(c.T));
            f.Db(Math.ceil(c.X));
            d.$a(e);
            b.Sa.push(d)
        },
        lt: function(b, c, d) {
            var e = new A(0, 0),
                f = b.font,
                g, h = 0;
            b.font = c.fn;
            for (g = 0; g < d.length; ++g) {
                0 === g && (h = t.Mc(c.Xr) + 2);
                var l = G.Ia(b, d[g], !1);
                e.O = Math.max(e.O, l);
                e.Z += h
            }
            e.Z = Math.ceil(e.Z);
            e.O = Math.ceil(e.O);
            b.font = f;
            return {
                size: e,
                lineHeight: h
            }
        },
        mt: function(b, c, d, e) {
            var f;
            if (e.a.ba) {
                var g = document.getElementById("background").height;
                var h = document.getElementById("background").width;
                e = e.a.U().ma().ha;
                e = t.lb(e, t.ab());
                h < 20 + c.O + e.c + this.j.c ? f = e.c + this.j.c - 20 - d.O - c.O : f = e.c + this.j.c + 20;
                g = g < 20 + c.Z + e.f + this.j.f ? e.f + this.j.f - c.Z + 20 + d.O : e.f + this.j.f + 20
            } else this.j.c + 20 + d.O + c.O >= b.w() ? f = this.j.c - 20 - d.O - c.O : f = this.j.c + 20, this.j.f + 20 + c.Z >= b.v() ? g = this.j.f - 20 - c.Z : g = this.j.f + 20;
            0 > f && (f = c.O < b.w() ? (b.w() - c.O) / 2 : 0);
            0 > g && (g = c.Z < b.v() ? (b.v() - c.Z) / 2 : 0);
            return new I(f, g, f + c.O + d.O, g + d.Z + c.Z)
        }
    }
})();
var V;
V = function() {};
V.prototype = {
    h: function() {}
};
var Ub;
Ub = function(a, b) {
    a = b.getUint16();
    this.Ht = 0 === a || 2 === a
};
Ub.prototype = {
    h: function(a) {
        this.Ht && a.a.Sc.close();
        a.a.Sc.nA()
    }
};
var Vb;
Vb = function(a, b, c) {
    var d = b.S();
    this.It = b.getUint16();
    a = b.getUint16();
    this.Vn = b.aa(a, !1);
    c >= b.S() - d + 10 ? (a = b.getUint16(), this.Wn = b.aa(a, !1)) : this.Wn = ""
};
Vb.prototype = {
    h: function() {
        switch (this.It) {
            case 0:
                y.warn("The functionality start process is not possible in the webvisualization.");
                break;
            case 1:
            case 2:
            case 3:
                y.warn("The functionality printing is not possible in the webvisualization.");
                break;
            case 4:
                this.iw()
        }
    },
    iw: function() {
        "replace" === this.Wn ? window.location.href = this.Vn : window.open(this.Vn)
    }
};
var Wb;
Wb = function(a, b) {
    this.vg = b.getUint8();
    this.vg = 0 === this.vg ? 2 : 3;
    this.ni = new Xb(b)
};
Wb.prototype = {
    h: function(a) {
        var b = new Yb(0, this.vg, this.ni.Iv, null, this.ni);
        a.a.$f(b)
    }
};
var Zb;
Zb = function(a, b, c, d) {
    a = d.a.g;
    c = 0;
    this.lc = b.getUint32();
    d = b.getUint16();
    this.Yl = b.aa(d, !1);
    d = b.getUint32();
    null === a.buffer && (a.buffer = p.b(d));
    for (; c < d;) a.buffer.oj(b.getUint8()), c++;
    a.status.cc += d;
    0 !== (this.lc & 1) && (a.status.qc ? (a.status.qc = !1, a.status.Gc = !0) : a.status.Fc = !0);
    0 === d && (a.status.Fc = !0)
};
Zb.prototype = {
    h: function() {}
};
var $b;
$b = function(a, b) {
    this.fx = b.getUint16();
    this.vg = b.getUint8();
    a = b.getUint16();
    this.Rw = b.aa(a, !1);
    a = b.getUint16();
    0 < a ? this.Yl = b.aa(a, !1) : this.Yl = "";
    this.ni = new Xb(b)
};
$b.prototype = {
    h: function(a) {
        var b = new Yb(this.fx, this.vg, this.Rw, this.Yl, this.ni);
        a.a.$f(b)
    }
};
var Ga;
Ga = function(a, b, c) {
    a = b.S();
    this.l = G.A(b);
    this.Nn = !0;
    c >= b.S() - a + 12 && (this.Nn = 0 === (b.getUint32() & 1))
};
Ga.prototype = {
    h: function(a) {
        a.ti.cm(this.l);
        this.Nn && (a.he().clearRect(this.l.m, this.l.o, this.l.w(), this.l.v()), t.Rh(a, this.l));
        a.a.wc.Mj(this.l)
    }
};
var ac;
ac = function(a, b) {
    var c;
    this.qo = b.getUint32();
    this.Fu = b.getUint32();
    a = b.getUint16();
    this.Li = b.aa(a, !1);
    a = b.getUint32();
    var d = b.getUint16();
    this.Tg = [];
    this.pp = !1;
    try {
        for (c = 0; c < d; ++c) {
            var e = b.getUint32();
            var f = b.getUint32();
            this.Tg.push(this.xl(b, e, f))
        }
    } catch (g) {
        if (g instanceof TypeError) y.error("Invalid argumenttype for calling '" + this.Li + "'; call will not be executed"), this.pp = !0;
        else throw g;
    }
    2 === (a & 2) ? (this.bh = b.getUint32(), this.El = b.getUint32()) : this.El = this.bh = null
};
ac.prototype = {
    h: function(a) {
        if (!this.pp) {
            var b = WebvisuExtensionMgr.Cy(this.qo, this.Li, this.Tg);
            null !== b && void 0 !== b && null !== this.El && null !== this.bh && this.Lu(b, a.a)
        }
    },
    vk: function(a, b) {
        var c = p.b(b),
            d = O.b(c, !0),
            e;
        for (e = 0; e < b; ++e) d.va(a.getUint8());
        return J.b(c.Hc(), a.Se(), a.Ue())
    },
    xl: function(a, b, c) {
        a = this.vk(a, c);
        switch (b) {
            case 0:
            case 1:
                return 0 !== a.getUint8();
            case 2:
            case 10:
                return a.getUint8();
            case 6:
                return a.getInt8();
            case 3:
            case 11:
                return a.getUint16();
            case 7:
                return a.getInt16();
            case 8:
                return a.getInt32();
            case 9:
                throw new TypeError("Type LINT not supported");
            case 4:
            case 12:
                return a.getUint32();
            case 5:
            case 13:
                throw new TypeError("Type LWORD/ULINT not supported");
            case 14:
                return a.getFloat32();
            case 15:
                return a.getFloat64();
            case 16:
            case 17:
                return a.Ic(17 === b);
            default:
                throw new TypeError("TypeCode + " + b.toString() + " not supported");
        }
    },
    Lu: function(a, b) {
        var c = p.b(this.El),
            d = O.b(c, b.s.Ja, b.sh()),
            e = new n(515, b.s.L, this.qo, this.Fu);
        try {
            this.Nu(a, d), e.$a(c)
        } catch (f) {
            y.error("Failed to encode return value: " +
                a.toString() + ". Result ignored")
        }
        b.$b(e)
    },
    Nu: function(a, b) {
        switch (this.bh) {
            case 0:
            case 1:
                b.va(a ? 1 : 0);
                break;
            case 2:
            case 10:
                b.va(a);
                break;
            case 6:
                b.cq(a);
                break;
            case 3:
            case 11:
                b.Wa(a);
                break;
            case 7:
                b.Db(a);
                break;
            case 8:
                b.bq(a);
                break;
            case 9:
                throw new TypeError("Type LINT not supported");
            case 4:
            case 12:
                b.B(a);
                break;
            case 5:
            case 13:
                throw new TypeError("Type LWORD/ULINT not supported");
            case 14:
                b.em(a);
                break;
            case 15:
                b.aq(a);
                break;
            case 16:
            case 17:
                b.Eb(a, 17 === this.bh);
                break;
            default:
                throw new TypeError("TypeCode + " +
                    this.bh.toString() + " not supported");
        }
    }
};
var bc;
bc = function(a, b) {
    this.Ae = b.getUint32();
    a = b.getUint16();
    this.Yn = b.aa(a, !1);
    this.rd = G.A(b)
};
bc.prototype = {
    h: function(a) {
        var b = WebvisuExtensionMgr.lB(this.Yn);
        if (null === b) y.warn("No native control named '" + this.Yn + "' found");
        else {
            if (a.a.ba) {
                var c = a.a.U().ma();
                var d = c.ha;
                "function" === typeof c.Cr && c.Cr(this.Ae);
                this.rd = new I(0, 0, this.rd.T, this.rd.X, this.rd.ec)
            } else d = a.Y.canvas;
            WebvisuExtensionMgr.Fy(b, this.Ae, this.rd, d);
            a.a.ba && (void 0 !== d.dn ? (a = d.dn, a.style.position = "absolute", a.style.width = "100%", a.style.height = "100%") : 2 == d.childNodes.length && (a = d.childNodes[1], a.style.position = "absolute",
                a.style.width = "100%", a.style.height = "100%"))
        }
    }
};
var cc;
cc = function(a, b) {
    this.Ae = b.getUint32();
    this.rd = G.A(b)
};
cc.prototype = {
    h: function() {
        WebvisuExtensionMgr.Dy(this.Ae, this.rd)
    }
};
var dc;
dc = function(a, b) {
    this.Ae = b.getUint32();
    a = b.getUint32();
    this.Ax = 1 === (a & 1);
    this.hu = 4 === (a & 4)
};
dc.prototype = {
    h: function() {
        this.hu ? WebvisuExtensionMgr.pm(this.Ae) : WebvisuExtensionMgr.Ey(this.Ae, this.Ax)
    }
};
var ec;
ec = function(a, b) {
    var c;
    b.getUint16();
    b.getUint16();
    this.pf = G.A(b);
    var d = b.getUint32();
    this.Wv = 0 !== (d & 1);
    this.ft = 0 !== (d & 2);
    this.Bo = b.getUint16();
    var e = b.getUint16();
    this.dv = b.aa(e, !1);
    this.Th = b.getUint16();
    var f = b.getUint16();
    e = p.b(f);
    d = O.b(e, !0);
    for (c = 0; c < f; ++c) d.va(b.getUint8());
    this.Yh = this.Wd = !1;
    25 === a && (d = b.getUint16(), this.Wd = 0 !== (d & 1), this.Yh = 2 === (d & 2));
    a = f;
    0 < a ? (this.Yh && (a /= 2), b = J.b(e.Hc(), b.Se(), b.Ue()), this.So = b.aa(a, this.Yh)) : this.So = ""
};
ec.prototype = {
    h: function(a) {
        var b = window.document.createElement("input"),
            c = this.ht(),
            d = a.bz();
        this.Wd && (b.type = "password");
        b.value = this.So;
        c = c.ac(d.c, d.f);
        t.Cd(b, c);
        b.style.zIndex = 300;
        b.style.textAlign = 0 !== (this.Th & 1) ? "center" : 0 !== (this.Th & 2) ? "right" : "left";
        b.style.fontFamily = this.dv;
        b.style.fontSize = this.Bo + "px";
        this.Wv && (b.style.fontStyle = "italic");
        this.ft && (b.style.fontWeight = "bold");
        a.a.Sc.open(b, this.Yh, a);
        b.select()
    },
    ht: function() {
        var a = this.pf.m + 3,
            b = this.pf.T - 9,
            c, d = t.Mc(this.Bo);
        0 !== (this.Th &
            8) ? c = this.pf.X - d - 9 : c = 0 !== (this.Th & 4) ? this.pf.o + (this.pf.v() - d) / 2 : this.pf.o + 1;
        return new I(a, c, b, c + d)
    }
};
var Ja;
(function() {
    var a = null,
        b = null;
    Ja = function() {};
    Ja.mz = function(c, d, e, f) {
        null === a && (a = [V, Qb, Pb, Tb, fc, gc, hc, Ga, Jb, ic, ec, Tb, Ub, V, Ha, Ha, Kb, Vb, jc, Aa, kc, lc, lc, Lb, mc, ec, bc, ac, cc, dc, nc, Sb, oc, pc, pc, qc, Nb, rc, V, V, V, Ba, sc, tc, Ob, Qb, Tb, Tb, nc, uc, vc, wc, wc, xc, yc, zc, Ac, Bc, Cc, Pb, Qb, Qb, V, V, V, V, Dc, $b, Wb, Zb, V, Ec, Fc, Gc, Hc, Ic, Jc, Kc, Lc, Mc, Nc, Oc, Pc, Qc, V, Rc, Sc, Tc, Uc, Vc, Wc, Xc, Yc, Ib, Zc, V, $c, V, ad, bd, cd, dd, ed, fd, gd, Hb, hd]);
        null === b && (b = [Ea, Fa, Da]);
        return c < a.length ? new a[c](c, d, e, f) : 8192 <= c && 9215 >= c && c - 8192 < b.length ? new b[c - 8192](c,
            d, e, f) : new V(c, d, e, f)
    }
})();
var G;
(function() {
    var a = "0123456789ABCDEF".split("");
    var b = function(d) {
        return a[d >> 4 & 15] + a[d & 15]
    };
    var c = function(d) {
        return d & 255
    };
    G = function() {};
    G.Mc = 50;
    G.ig = 0;
    G.Cd = 1;
    G.$c = 2;
    G.Bd = 3;
    G.Lb = function(d) {
        var e = d.getInt16();
        d = d.getInt16();
        return new w(e, d)
    };
    G.af = function(d) {
        var e = d.getFloat32();
        d = d.getFloat32();
        return new w(e, d)
    };
    G.Ch = function(d, e) {
        var f = [],
            g;
        for (g = 0; 4 > g; ++g) f[g] = e(d);
        return f
    };
    G.ng = function(d) {
        return G.Ch(d, G.Lb)
    };
    G.cs = function(d) {
        return G.Ch(d, G.af)
    };
    G.ds = function(d) {
        var e = [];
        e[0] = G.Lb(d);
        e[2] =
            G.Lb(d);
        e[1] = new w(e[2].c, e[0].f);
        e[3] = new w(e[0].c, e[2].f);
        return e
    };
    G.Ur = function(d) {
        return d[1].f !== d[0].f || d[2].c !== d[1].c || d[3].f < d[0].f || d[2].c < d[1].c
    };
    G.hg = function(d, e) {
        if (e && G.Ur(d)) {
            e = Math.sqrt((d[0].c - d[1].c) * (d[0].c - d[1].c) + (d[0].f - d[1].f) * (d[0].f - d[1].f));
            var f = Math.sqrt((d[0].c - d[3].c) * (d[0].c - d[3].c) + (d[0].f - d[3].f) * (d[0].f - d[3].f));
            return new I(0, 0, e, f, id.b((d[1].c - d[0].c) / e, (d[1].f - d[0].f) / e, (d[3].c - d[0].c) / f, (d[3].f - d[0].f) / f, d[0].c, d[0].f))
        }
        return new I(d[0].c, d[0].f, d[2].c, d[2].f)
    };
    G.Sh = function(d, e, f) {
        d = f(d);
        return G.hg(d, e)
    };
    G.ad = function(d, e) {
        return G.Sh(d, e, G.ng)
    };
    G.$r = function(d) {
        return G.Sh(d, !0, G.cs)
    };
    G.Rh = function(d, e) {
        var f = e(d);
        d = e(d);
        return new I(f.c, f.f, d.c, d.f)
    };
    G.A = function(d) {
        return G.Rh(d, G.Lb)
    };
    G.Yr = function(d) {
        return G.Rh(d, G.af)
    };
    G.lj = function(d, e) {
        var f = d.getUint16(),
            g;
        var h = Array(f);
        for (g = 0; g < f; ++g) h[g] = e(d);
        return h
    };
    G.Qh = function(d) {
        return G.lj(d, G.Lb)
    };
    G.es = function(d) {
        return G.lj(d, G.af)
    };
    G.fa = function(d) {
        return Math.PI * d / 180
    };
    G.b = function(d) {
        return "#" +
            b(d >> 16) + b(d >> 8) + b(d)
    };
    G.i = function(d) {
        var e = d >> 24 & 255;
        if (255 === e) return "#" + b(d >> 16) + b(d >> 8) + b(d);
        e /= 255;
        return "rgba(" + c(d >> 16) + ", " + c(d >> 8) + ", " + c(d) + ", " + e + ")"
    };
    G.$e = function(d) {
        return 1 === d.lineWidth % 2 ? .5 : 0
    };
    G.BB = function(d) {
        return 0 <= d.indexOf("\n") || 0 <= d.indexOf("\r")
    };
    G.lb = function(d, e, f) {
        return e > d.length - 1 ? d : d.substr(0, e) + f + d.substr(e + 1)
    };
    G.Wr = function(d) {
        var e, f;
        var g = d.length;
        var h = e = 0;
        for (f = G.ig; e < g;) switch (f) {
            case G.ig:
                switch (d[e]) {
                    case "\n":
                        f = G.$c;
                        break;
                    case "\r":
                        f = G.Bd;
                        break;
                    default:
                        f =
                            G.Cd
                }
                break;
            case G.Cd:
                switch (d[e]) {
                    case "\n":
                        f = G.$c;
                        h !== e && (d = G.lb(d, h, d[e]));
                        h++;
                        break;
                    case "\r":
                        f = G.Bd;
                        break;
                    default:
                        h !== e && (d = G.lb(d, h, d[e])), h++
                }
                e++;
                break;
            case G.$c:
                switch (d[e]) {
                    case "\n":
                        h !== e && (d = G.lb(d, h, d[e]));
                        h++;
                        break;
                    case "\r":
                        f = G.Bd;
                        break;
                    default:
                        f = G.Cd, h !== e && (d = G.lb(d, h, d[e])), h++
                }
                e++;
                break;
            case G.Bd:
                d = G.lb(d, h, "\n");
                h++;
                switch (d[e]) {
                    case "\n":
                        f = G.$c;
                        break;
                    case "\r":
                        d = G.lb(d, h, "\n");
                        h++;
                        f = G.$c;
                        break;
                    default:
                        h !== e && (d = G.lb(d, h, d[e])), h++, f = G.Cd
                }
                e++
        }
        return d.substring(0, h)
    };
    G.re = function(d) {
        return G.Wr(d).split("\n")
    };
    G.CB = function(d) {
        return 0 <= d.indexOf("\t")
    };
    G.js = function(d) {
        return d.split("\t")
    };
    G.Ia = function(d, e, f) {
        if (f) {
            d = G.bf(d, e);
            for (e = f = 0; e < d.length; ++e) f += d[e].AB;
            return f
        }
        return d.measureText(e).width
    };
    G.Qr = function(d, e, f, g) {
        var h = d.getContext(),
            l = G.Ia(h, e, !0);
        if (void 0 !== f && void 0 !== g && l > f && 0 !== (g & 256)) {
            var r = 1,
                v = 0,
                u = 0,
                x = 0,
                z = -1;
            for (g = 0; g < e.length; ++g) {
                l = e.charAt(g);
                var B = e.charAt(g + 1);
                "\r" === l && "\n" === B ? (++r, u = Math.max(v, u), v = 0) : (B = h.measureText(l).width, v + B <= f || 0 >= z ? (v += B, " " === l && (x = v, z = g)) : (++r, u =
                    Math.max(v, x), v = v - x + B))
            }
            u = Math.max(v, u);
            return new w(u, r * t.A(d))
        }
        return new w(l, t.A(d))
    };
    G.bf = function(d, e) {
        e = G.js(e);
        var f = [],
            g;
        for (g = 0; g < e.length; ++g) {
            var h = d.measureText(e[g]).width;
            var l = Math.max(1, Math.ceil(h / G.Mc));
            g < e.length - 1 && (h = l * G.Mc);
            f.push({
                text: e[g],
                Sm: l,
                AB: h
            })
        }
        return f
    };
    G.DB = function(d) {
        return null !== d.ec
    };
    G.mg = function(d, e, f, g, h, l, r, v, u) {
        var x = G.fa(90),
            z = G.fa(180),
            B = G.fa(270),
            N = G.fa(360),
            L;
        0 > v || 0 > u ? L = Math.max(1, Math.min(g, h) / 8) : L = v;
        d.beginPath();
        d.moveTo(e + L, f);
        d.lineTo(e + g - L, f);
        d.arc(e +
            g - L, f + L, L, B, N, !1);
        d.lineTo(e + g, f + h - L);
        d.arc(e + g - L, f + h - L, L, N, x, !1);
        d.lineTo(e + L, f + h);
        d.arc(e + L, f + h - L, L, x, z, !1);
        d.lineTo(e, f + L);
        d.arc(e + L, f + L, L, z, B, !1);
        d.closePath();
        l && d.fill();
        r && d.stroke()
    }
})();
var ad;
ad = function(a, b) {
    this.dw = b.getUint16();
    this.ew = b.getUint16();
    a = b.getUint16();
    this.ea = b.aa(a, !1)
};
ad.prototype = {
    h: function() {
        var a = t.i("Message ID: {0}   Message description: {1}", this.ew, this.ea);
        switch (this.dw) {
            case 0:
                break;
            case 1:
                y.info(a);
                break;
            case 2:
                y.warn(a);
                break;
            case 4:
            case 8:
                y.error(a);
                break;
            case 16:
                y.b(a);
                break;
            default:
                y.i("Unknown log level")
        }
    }
};
var hd;
hd = function(a, b) {
    this.hw = 1 === b.getUint16() ? "copy" : "source-over"
};
hd.prototype = {
    h: function(a) {
        a.getContext().globalCompositeOperation = this.hw
    }
};
var Dc;
Dc = function(a, b) {
    this.Jx = b.getUint16();
    this.kh = b.getUint32()
};
Dc.prototype = {
    h: function(a) {
        switch (this.Jx) {
            case 1:
                a = a.a.ae;
                null !== a && a.XA(this.kh / 100);
                break;
            case 2:
                a = a.a.ae;
                null !== a && a.AA(this.kh / 100);
                break;
            case 3:
                a = a.a.ae;
                null !== a && a.VA(!!this.kh);
                break;
            case 4:
                a.a.getConfiguration().AutoFontReductionActive = !0;
                break;
            case 6:
                Ya.prototype.fB(0 !== this.kh);
                break;
            case 7:
                a.a.getConfiguration().XhrSendTimeout = this.kh
        }
    }
};
var mc;
mc = function(a, b) {
    switch (b.getUint16()) {
        case 0:
            this.pb = "pointer";
            break;
        case 1:
            this.pb = "default";
            break;
        case 2:
            this.pb = "pointer";
            break;
        case 3:
            this.pb = "wait";
            break;
        case 4:
            this.pb = "text";
            break;
        case 5:
            this.pb = "crosshair";
            break;
        case 6:
            this.pb = "help";
            break;
        case 7:
            this.pb = "col-resize";
            break;
        case 8:
            this.pb = "row-resize";
            break;
        case 9:
            this.pb = "nw-resize";
            break;
        case 10:
            this.pb = "ne-resize";
            break;
        case 11:
            this.pb = "w-resize";
            break;
        case 12:
            this.pb = "s-resize";
            break;
        case 13:
            this.pb = "pointer";
            break;
        default:
            this.pb = "default"
    }
};
mc.prototype = {
    h: function(a) {
        a.a.ba ? (a = a.a.U().ma(), null !== a && (a = a.ha, null !== a && (a.style.cursor = this.pb))) : a.Y.canvas.style.cursor = this.pb
    }
};
var fc;
fc = function(a, b, c, d) {
    a = b.getUint32();
    b = b.getUint32();
    this.Uk = 1 === (a & 1);
    !0 === d.a.getConfiguration().SemiTransparencyActive ? this.Rc = G.i(b) : this.Rc = G.b(b)
};
fc.prototype = {
    h: function(a) {
        a.getState().EA(this.Rc, this.Uk)
    }
};
var hc;
hc = function(a, b, c, d) {
    !0 === d.a.getConfiguration().SemiTransparencyActive ? this.Rc = G.i(b.getUint32()) : this.Rc = G.b(b.getUint32());
    a = this.Fx(b.getUint32());
    this.Co = b.getUint16();
    c = b.getUint16();
    b = b.aa(c, !1);
    this.Ib = a + " " + this.Co + 'px "' + b + '"'
};
hc.prototype = {
    h: function(a) {
        a.getState().ZA(this.Ib, this.Co, this.Rc)
    },
    Fx: function(a) {
        var b = [];
        0 !== (a & 1) && b.push("italic");
        0 !== (a & 2) && b.push("bold");
        0 !== (a & 16) && b.push("lighter");
        0 !== (a & 32) && b.push("bolder");
        0 !== (a & 64) && b.push("900");
        return b.join(" ")
    }
};
var nc;
nc = function(a, b, c, d) {
    c = 1 === b.getUint32();
    var e = b.getUint32(),
        f = b.getUint32();
    if (30 === a) {
        var g = b.getUint32();
        var h = b.getUint32() / 100;
        var l = b.getUint32() / 100;
        var r = b.getUint32();
        var v = 0 === b.getUint32();
        b.getUint32();
        b = b.getUint32()
    } else g = b.getUint16(), h = b.getUint8() / 100, l = b.getUint8() / 100, r = b.getUint8(), v = !0, b = 0;
    !0 === d.a.getConfiguration().SemiTransparencyActive ? (e = G.i(e), f = G.i(f), 30 === a && (b = G.i(b))) : (e = G.b(e), f = G.b(f), 30 === a && (b = G.b(b)));
    this.uv = new ma(c, e, f, g, h, l, r, v, b)
};
nc.prototype = {
    h: function(a) {
        a.getState().HA(this.uv)
    }
};
var sc;
sc = function(a, b, c, d) {
    this.jb = b.getUint32();
    d.a.getConfiguration().SemiTransparencyActive = 2 === (this.jb & 2);
    d.a.getConfiguration().IecSupportsCommonMiterLimit = 8 === (this.jb & 8)
};
sc.prototype = {
    h: function(a) {
        a = a.a.W;
        null !== a && (a.a.D.vr(1 === (this.jb & 1)), a.Sj(0 !== (this.jb & 4)))
    }
};
var Zc;
Zc = function(a, b, c) {
    a = b.S();
    var d = b.getUint16();
    var e = b.aa(d, !1);
    d = b.getUint16();
    d = b.aa(d, !1);
    "" !== e && (d = e + "." + d);
    this.Af = d;
    this.l = G.ad(b, !0);
    this.l.normalize();
    e = b.getUint32();
    this.fl = 0 !== (e & 1);
    this.Uh = 0 !== (e & 2);
    this.si = 0 !== (e & 4);
    this.Sk = 0 !== (e & 128);
    this.Fl = 0 !== (e & 256);
    this.Xl = 0 !== (e & 1024);
    this.pk = 0 !== (e & 2048);
    this.Ag = !1;
    c >= b.S() - a + 16 && (this.Ag = !0, this.Jk = b.getFloat32(), this.Kk = b.getFloat32());
    this.xc = null
};
Zc.prototype = {
    h: function(a) {
        var b = a.a.U().ma(),
            c = this;
        this.me = a;
        window.WebvisuInst.Pf(function() {
            var d = c.Vt(c.me);
            b.KA(d, c)
        })
    },
    Fj: function() {
        return this.l.clone()
    },
    Vt: function(a) {
        var b = new Image;
        b.src = a.Di.um(this.Af);
        t.ad(b.src) && !a.a.getConfiguration().WorkaroundDisableSVGAspectRatioWorkaround && (b.src += "#svgView(preserveAspectRatio(none))");
        b.style.position = "absolute";
        b.style.msUserSelect = "none";
        b.style.WebkitUserSelect = "none";
        b.style.MozUserSelect = "none";
        b.style.userSelect = "none";
        return b
    }
};
var uc;
uc = function(a, b, c, d) {
    var e;
    a = b.getUint16();
    var f = [];
    for (c = 0; c < a; ++c) {
        var g = b.getUint16();
        f[c] = b.aa(g, !1)
    }
    this.wb = [];
    a = b.getUint16();
    for (c = 0; c < a; ++c) {
        var h = [];
        g = b.getUint16();
        for (e = 0; e < g; ++e) h[e] = f[b.getUint16()];
        this.wb.push({
            Bm: h.join(".").toLowerCase(),
            br: b.getUint16()
        })
    }
    d.Di.vA(this.wb)
};
uc.prototype = {
    h: function() {}
};
var gc;
gc = function(a, b, c, d) {
    var e = b.S(),
        f = b.getUint32(),
        g = b.getUint32();
    a = b.getUint16();
    var h = ["butt", "square", "round"],
        l = ["miter", "bevel", "round"];
    this.qd = f;
    !0 === d.a.getConfiguration().SemiTransparencyActive ? this.Rc = G.i(g) : this.Rc = G.b(g);
    this.ua = a;
    c >= b.S() - e + 11 ? (c = b.getUint16(), this.fd = h[0], 0 !== (c & 0) && (this.fd = h[0]), 0 !== (c & 1) && (this.fd = h[1]), 0 !== (c & 2) && (this.fd = h[2]), c = b.getUint16(), this.gd = l[0], 0 !== (c & 0) && (this.gd = l[0]), 0 !== (c & 1) && (this.gd = l[1]), 0 !== (c & 2) && (this.gd = l[2]), b = b.getUint16(), d.a.getConfiguration().IecSupportsCommonMiterLimit ?
        this.Ed = b / 2 : this.Ed = 1 === b ? 1.7 * a : 2 * b) : (this.fd = h[0], this.gd = l[0], d.a.getConfiguration().IecSupportsCommonMiterLimit ? this.Ed = 1.5 : this.Ed = 1.7 * a)
};
gc.prototype = {
    h: function(a) {
        a.getState().OA(this.ua, this.Rc, this.qd, this.fd, this.gd, this.Ed)
    }
};
var tc;
tc = function(a, b, c) {
    this.sa = [];
    var d = null;
    a = b.S();
    for (var e, f; b.S() - a < c - 8;) e = b.getUint32(), e & 2147483648 ? (f = b.getUint32(), d = G.A(b), --d.X, --d.T, d = new jd(f, d, e & 2147483647), this.sa.push(d)) : null !== d && (f = e & 65535, e = (e & 2147483647) >> 16, f = b.S() + f, this.Yw(b, d, e), b.seek(f))
};
tc.prototype = {
    h: function(a) {
        var b = !1,
            c = a.a.W;
        if (a.a.ba) {
            var d = a.a.U().ma();
            null !== d && (b = d.mc, null !== b ? b.Lm(this.sa) : d.MA(a.a, K.Az(this.sa)), b = !0)
        }
        if (!b && null !== c)
            for (c.jq(), d = 0; d < this.sa.length; ++d) c.Zp(this.sa[d]);
        a.a.getConfiguration().DebugOnlyPrintTouchRectangles && this.Du()
    },
    Yw: function(a, b, c) {
        switch (c) {
            case 3:
                b.info().scroll().wa.Ar(new w(a.getInt32(), a.getInt32()));
                b.info().scroll().wa.yr(new w(a.getInt32(), a.getInt32()));
                b.nh(R.Mh);
                break;
            case 4:
                b.info().zoom().wa.Br(a.getFloat32());
                b.info().zoom().wa.zr(a.getFloat32());
                b.nh(R.wn);
                break;
            case 5:
                b.info();
                new I(a.getUint16(), a.getUint16(), a.getUint16(), a.getUint16());
                break;
            case 6:
                c = a.getUint16();
                var d = a.getUint16(),
                    e = !!a.getUint8(),
                    f = !!a.getUint8();
                a = new w(a.getUint16(), a.getUint16());
                b.info().Gr(c, new kd(d, e, f, a))
        }
    },
    Du: function() {
        var a;
        for (a = 0; a < this.sa.length; ++a) {
            var b = this.sa[a];
            y.b(t.i("TouchRect ({0}): {1} (Flags: {2})", b.id(), t.xj(b.na), b.flags()));
            b.K(R.Mh) && y.b(t.i("  ScrollLimits {0} -> {1}", t.R(b.info().scroll().wa.Wb), t.R(b.info().scroll().wa.Vb)));
            b.K(R.wn) &&
                y.b(t.i("  Zoomlimits: {0} -> {1}", b.info().zoom().wa.Wb, b.info().zoom().wa.Vb))
        }
    }
};
var jc;
jc = function(a, b) {
    this.dt = 1 === b.getUint16()
};
jc.prototype = {
    h: function(a) {
        this.dt ? a.kA() : a.lA()
    }
};
var Gc;
Gc = function(a, b) {
    this.nz = b.getInt16();
    this.oz = b.getInt16()
};
Gc.prototype = {
    h: function(a) {
        a.getState().TA(this.nz, this.oz)
    }
};
var rc;
rc = function(a, b) {
    a = b.getUint16();
    this.ea = b.aa(a, !1)
};
rc.prototype = {
    h: function(a) {
        a.a.getConfiguration().ChangeWindowTitle && (window.document.title = this.ea);
        a.a.Ac && window.ProgrammingSystemAccess && window.ProgrammingSystemAccess.setVisualizationName(this.ea)
    }
};
var ic;
ic = function(a, b) {
    this.l = G.A(b)
};
ic.prototype = {
    h: function(a) {
        a.getContext().restore();
        a.getState().apply()
    }
};
var dd;
dd = function(a, b) {
    a = b.getInt16();
    this.Ai = t.ig(b, a)
};
dd.prototype = {
    h: function(a) {
        var b = this.Ai.length - 1,
            c = a.a.U();
        for (a = 0; a <= b; ++a) c.Te()
    }
};
var Kc;
Kc = function(a, b) {
    this.Ua = b.getInt16()
};
Kc.prototype = {
    h: function(a) {
        a.a.U().Te()
    }
};
var Hc;
Hc = function(a, b) {
    this.Ua = b.getInt16();
    a = b.getUint32();
    this.Av = 0 !== (a & 1);
    this.Lv = 0 !== (a & 2);
    this.yv = 0 !== (a & 4);
    this.zv = 0 !== (a & 16);
    this.Px = 0 !== (a & 8);
    this.et = 0 !== (a & 32);
    this.Gt = 0 === (a & 64);
    this.Zh = 0 === (a & 128)
};
Hc.prototype = {
    h: function(a) {
        var b = K.Kz(a.a, this.yv, this.zv, this.Av, this.Lv, this.Px, this.et, this.Gt);
        a.a.U().Xp(this.Ua, b);
        b instanceof P && b.mr(this.Zh);
        b.Jc()
    }
};
var Pc;
Pc = function(a, b) {
    this.Ab = b.getInt16()
};
Pc.prototype = {
    h: function(a) {
        a.a.U().ma().Wy()
    }
};
var Mc;
Mc = function(a, b, c) {
    this.Ab = b.getInt16();
    this.xf = 2 < c ? 0 !== (b.getUint32() & 1) : !1
};
Mc.prototype = {
    h: function(a) {
        var b = K.Dz(32767 === this.Ab, this.xf);
        a.a.U().ma().iy(this.Ab, b)
    }
};
var bd;
bd = function(a, b) {
    this.Ab = b.getInt16()
};
bd.prototype = {
    h: function(a) {
        a = a.a.U().ma();
        32767 === this.Ab && a.gr()
    }
};
var Oc;
Oc = function(a, b) {
    this.Ab = b.getInt16()
};
Oc.prototype = {
    h: function(a) {
        a.a.U().ma().dB(this.Ab)
    }
};
var Nc;
Nc = function(a, b, c) {
    a = b.S();
    this.Dc = b.getInt16();
    this.Ec = b.getInt16();
    this.ua = b.getInt16();
    this.za = b.getInt16();
    this.rx = 0 !== b.getUint8();
    this.sx = 0 !== b.getUint8();
    this.Vs = b.getUint8();
    c >= b.S() - a + 9 ? (this.Sn = b.getInt16(), this.Tn = b.getInt16(), this.Rn = b.getInt16(), this.Qn = b.getInt16()) : (this.Tn = this.Sn = 0, this.Qn = this.Rn = -1)
};
Nc.prototype = {
    h: function(a) {
        a.a.U().ma().rB(this.Dc, this.Ec, this.ua, this.za, this.rx, this.sx, this.Vs, this.Sn, this.Tn, this.Rn, this.Qn)
    }
};
var ed;
ed = function(a, b) {
    this.Lt = b.getInt16()
};
ed.prototype = {
    h: function(a) {
        var b = a.a.U().ma();
        (null !== b ? b.U() : a.a.U()).DA(this.Lt)
    }
};
var $c;
$c = function(a, b) {
    this.xd = b.getUint8()
};
$c.prototype = {
    h: function(a) {
        var b = a.a.U().ma();
        (null !== b ? b.U() : a.a.U()).Mm(this.xd)
    }
};
var fd;
fd = function(a, b) {
    this.ox = b.getFloat32();
    this.px = b.getFloat32()
};
fd.prototype = {
    h: function(a) {
        a.a.U().ma().bB(this.ox, this.px)
    }
};
var Rc;
Rc = function(a, b) {
    this.Ce = b.getInt16();
    a = b.getInt16();
    switch (a) {
        case 0:
        case 5:
            this.uf = "solid";
            break;
        case 1:
            this.uf = "dashed";
            break;
        case 2:
        case 3:
        case 4:
            this.uf = "dotted"
    }
    this.Nv = 5 === a;
    this.tf = b.getUint32()
};
Rc.prototype = {
    h: function(a) {
        var b = this.Nv ? G.i(this.tf & 16777215) : !0 === a.a.getConfiguration().SemiTransparencyActive ? G.i(this.tf) : G.b(this.tf);
        a.a.U().ma().FA(this.Ce, this.uf, b)
    }
};
var Qc;
Qc = function(a, b) {
    this.Ng = b.getInt32();
    this.Og = b.getInt32();
    this.Lg = b.getInt32();
    this.Mg = b.getInt32();
    this.kd = b.getInt32();
    this.ld = b.getInt32()
};
Qc.prototype = {
    h: function(a) {
        a.a.U().ma().UA(this.Ng, this.Og, this.Lg, this.Mg, this.kd, this.ld)
    }
};
var Lc;
Lc = function() {};
Lc.prototype = {
    h: function(a) {
        a.a.U().Dm();
        var b = a.getContext(),
            c = a.a.U().ma();
        b.save();
        b.setTransform(1, 0, 0, 1, 0, 0);
        b.clearRect(0, 0, b.canvas.width, b.canvas.height);
        b.restore();
        null !== c && c.iq();
        a.a.wc.Mj(this.l)
    }
};
var cd;
cd = function(a, b) {
    a = b.getInt16();
    this.Ai = t.ig(b, a)
};
cd.prototype = {
    h: function(a) {
        var b, c = this.Ai.length - 1;
        for (b = 0; b <= c; b++) a.a.U().wh(this.Ai[b])
    }
};
var Jc;
Jc = function(a, b) {
    this.Ua = b.getInt16()
};
Jc.prototype = {
    h: function(a) {
        a.a.U().wh(this.Ua)
    }
};
var Ic;
Ic = function(a, b) {
    this.Dc = b.getInt16();
    this.Ec = b.getInt16();
    this.ua = b.getInt16();
    this.za = b.getInt16();
    this.Wc = b.getInt16();
    this.Xc = b.getInt16();
    this.Me = b.getInt16();
    this.Ne = b.getInt16();
    this.Ka = b.getInt16();
    this.Zb = b.getInt16();
    this.Uc = b.getUint32()
};
Ic.prototype = {
    h: function(a) {
        this.Zb || (this.Zb = 0);
        var b = a.a.U().ma(),
            c = "",
            d = this;
        0 < this.Zb && (c = "all " + this.Zb + "ms ease");
        if (b.$ instanceof rb && b.$.Fe)
            if (this.Ec = this.Dc = 0, this.za = this.ua = 1, this.Uc = this.Ka = this.Ne = this.Me = this.Xc = this.Wc = 0, t.gg(b.Ba)) {
                var e = document.getElementById("background");
                null !== e && (this.ua = e.width, this.za = e.height)
            } else e = t.af(a.a.U(), b.Ba.id), null !== e ? (this.ua = e.Rd(), this.za = e.Qd()) : y.i("Could not find parent node. Size will be 0");
        0 !== (this.Uc & 4) ? a.a.nj(function() {
                d.no(b, c)
            }) :
            this.no(b, c)
    },
    no: function(a, b) {
        a.update(this.Dc, this.Ec, this.ua, this.za, this.Wc, this.Xc, this.Me, this.Ne, this.Ka, this.Uc, b)
    }
};
var gd;
gd = function(a, b) {
    this.Dc = b.getInt16();
    this.Ec = b.getInt16();
    this.ua = b.getInt16();
    this.za = b.getInt16();
    this.Wc = b.getInt16();
    this.Xc = b.getInt16();
    this.Me = b.getFloat32();
    this.Ne = b.getFloat32();
    this.Ka = b.getInt16();
    this.Zb = b.getInt16();
    this.Uc = b.getUint32()
};
gd.prototype = {
    h: function(a) {
        this.Zb || (this.Zb = 0);
        var b = a.a.U().ma(),
            c = "";
        0 < this.Zb && (c = "all " + this.Zb + "ms ease");
        b.$ instanceof rb && b.$.Fe && (this.Ec = this.Dc = 0, this.za = this.ua = 1, this.Uc = this.Ka = this.Ne = this.Me = this.Xc = this.Wc = 0, t.gg(b.Ba) ? (a = document.getElementById("background"), null !== a && (this.ua = a.width, this.za = a.height)) : (a = t.af(a.a.U(), b.Ba.id), null !== a ? (this.ua = a.Rd(), this.za = a.Qd()) : y.i("Could not find parent node. Size will be 0")));
        b.update(this.Dc, this.Ec, this.ua, this.za, this.Wc, this.Xc, this.Me,
            this.Ne, this.Ka, this.Uc, c)
    }
};
var Vc;
Vc = function(a, b) {
    this.Ua = b.getInt16();
    this.xd = b.getInt16()
};
Vc.prototype = {
    h: function(a) {
        a.a.ba && a.a.Tl.lq();
        a.a.yy(this.Ua);
        a.a.kc.Mm(this.xd)
    }
};
var Yc;
Yc = function(a, b) {
    this.Ua = b.getInt16()
};
Yc.prototype = {
    h: function(a) {
        a.a.Vy()
    }
};
var Uc;
Uc = function(a, b) {
    this.Ua = b.getInt16();
    this.xd = b.getInt16();
    a = b.getUint32();
    this.ga = 0 !== (a & 1);
    this.Sg = 0 !== (a & 2);
    this.Oi = 0 !== (a & 4);
    this.j = {
        Xq: 0 !== (a & 16),
        Nz: 0 !== (a & 32),
        Oz: 0 !== (a & 128),
        Yq: 0 !== (a & 64),
        PB: 0 !== (a & 512),
        $p: 0 !== (a & 1024),
        dm: 0 !== (a & 2048),
        QB: 0 !== (a & 256)
    };
    this.ri = 0 !== (a & 8);
    this.$l = 0 !== (a & 4096);
    this.ut = 0 !== (a & 8192);
    this.Jt = 0 !== (a & 16384);
    this.Qv = 0 !== (a & 32768)
};
Uc.prototype = {
    h: function(a) {
        a.a.kc.Mm(this.xd);
        var b = K.pz(this.ga, this.$l, a.a, this.Jt),
            c = a.a.U().ma();
        c = c ? c.kz() : null;
        this.ut && (c = t.ab().getBoundingClientRect(), this.Sg = !0, c = new I(c.x, c.y, c.x + c.width, c.y + c.height));
        b.Jc(c, this.Sg, this.Oi, this.ri, a.Ea, this.j, this.Qv);
        a.a.openDialog(this.Ua, b)
    }
};
var Xc;
Xc = function(a, b) {
    this.Ua = b.getInt16()
};
Xc.prototype = {
    h: function(a) {
        a.a.cB(this.Ua)
    }
};
var Wc;
Wc = function(a, b) {
    this.Dc = b.getInt16();
    this.Ec = b.getInt16();
    this.ua = b.getInt16();
    this.za = b.getInt16();
    this.Zb = b.getInt16();
    a = b.getUint32();
    this.Rc = G.i(a)
};
Wc.prototype = {
    h: function(a) {
        a = a.a.U().ma();
        var b = "";
        0 < this.Zb && (b = "transform " + this.Zb + "ms ease, opacity " + this.Zb + "ms ease");
        a.update(this.Dc, this.Ec, this.ua, this.za, 0, 0, 0, 0, 0, null, b, this.Rc)
    }
};
var Xb;
Xb = function(a) {
    var b = a.getUint16(),
        c;
    a.aa(b, !1);
    b = a.getUint16();
    this.Iv = a.aa(b, !1);
    this.Wk = a.getUint16();
    this.xn = [];
    for (c = 0; c < this.Wk; ++c) b = a.getUint16(), this.xn[c] = a.aa(b, !1);
    this.lc = a.getUint32();
    a.getUint32()
};
var ld;
ld = function() {
    this.Lc = this.nB = 0
};
var Yb;
Yb = function(a, b, c, d, e) {
    this.Rm = a;
    this.direction = b;
    this.Kc = c;
    this.cr = d;
    this.Gb = e;
    this.Bh = 0;
    this.ff = new ld;
    this.Xe = new ld;
    this.status = new U;
    this.ub = this.buffer = null;
    this.lr = t.b()
};
var U;
U = function() {
    this.yd = !0;
    this.Fc = this.Gc = this.qc = !1;
    this.Ve = this.cc = this.result = 0;
    this.mb = U.A
};
U.A = 1;
U.i = 2;
U.pa = 3;
U.R = 4;
U.fa = 19;
U.b = 20;
var Tc;
Tc = function(a, b) {
    a = b.getUint16();
    this.Li = b.aa(a, !1);
    a = b.getUint16();
    this.Tg = [];
    for (var c = 0; c < a; ++c) {
        var d = b.getUint32();
        var e = b.getUint32();
        this.Tg.push(this.xl(b, d, e))
    }
};
Tc.prototype = {
    h: function(a) {
        a.a.U().ma().sy(this.Li, this.Tg)
    },
    xl: function(a, b, c) {
        a = this.vk(a, c);
        switch (b) {
            case 0:
            case 1:
                return 0 !== a.getUint8();
            case 2:
            case 10:
                return a.getUint8();
            case 6:
                return a.getInt8();
            case 3:
            case 11:
                return a.getUint16();
            case 7:
                return a.getInt16();
            case 8:
                return a.getInt32();
            case 9:
                return a.ge();
            case 4:
            case 12:
                return a.getUint32();
            case 5:
            case 13:
                return a.zd();
            case 14:
                return a.getFloat32();
            case 15:
                return a.getFloat64();
            case 16:
            case 17:
                return a.Ic(17 === b);
            default:
                throw new TypeError("TypeCode + " +
                    b.toString() + " not supported");
        }
    },
    vk: function(a, b) {
        var c = p.b(b),
            d = O.b(c, !0),
            e;
        for (e = 0; e < b; ++e) d.va(a.getUint8());
        return J.b(c.Hc(), a.Se(), a.Ue())
    }
};
var Sc;
Sc = function(a, b) {
    a = b.getUint16();
    this.Ku = b.aa(a, !1)
};
Sc.prototype = {
    h: function(a) {
        var b = K.Iz(this.Ku);
        a.a.U().ma().PA(b)
    }
};
var kc;
kc = function() {};
kc.prototype = {
    h: function() {
        y.warn("The functionality ExecuteClientProgram is not possible in the webvisualization.")
    }
};
var lc;
lc = function() {};
lc.prototype = {
    h: function() {
        y.warn("The functionality OpenFileDialog is not possible in the webvisualization.")
    }
};
var Ea;
Ea = function(a, b) {
    a = b.getUint16();
    this.Ig = b.aa(a, !1);
    this.Vg = b.getUint16()
};
Ea.prototype = {
    h: function(a) {
        a = a.a.fb;
        null !== a && (a.NA(this.Ig), a.SA(this.Vg))
    }
};
var Da;
Da = function(a, b) {
    this.jw = b.getUint32()
};
Da.prototype = {
    h: function(a) {
        a.a.fb.rr(this.jw)
    }
};
var Fa;
Fa = function(a, b) {
    a = b.getUint16();
    this.fj = b.aa(a, !1)
};
Fa.prototype = {
    h: function(a) {
        a = a.a.fb;
        null !== a && a.$A(this.fj)
    }
};
var yc;
yc = function(a, b) {
    this.Ab = b.getUint16();
    this.ua = b.getUint16();
    this.za = b.getUint16();
    this.jb = b.getUint32();
    this.Lr = 1
};
yc.prototype = {
    h: function(a) {
        var b = null,
            c = t.Ye(this.ua - 1, this.za - 1).getContext("2d");
        c.fillStyle = "white";
        c.fillRect(0, 0, this.ua - 1, this.za - 1);
        this.jb & this.Lr && (b = t.Ye(this.ua - 1, this.za - 1).getContext("2d"), b.fillStyle = "white", b.fillRect(0, 0, this.ua - 1, this.za - 1));
        a.Cc.ky(this.Ab, new Ka(c, b, new A(this.ua, this.za)))
    }
};
var zc;
zc = function(a, b) {
    this.Ab = b.getUint16()
};
zc.prototype = {
    h: function(a) {
        a.Cc.jA(this.Ab);
        a.a.W.sa.vz(this.Ab)
    }
};
var Cc;
Cc = function(a, b) {
    this.Ox = b.getUint32();
    this.Dv = b.getUint16();
    this.zi = b.getUint16();
    this.ll = !!b.getUint8();
    this.ml = !!b.getUint8();
    this.ql = new w(b.getUint16(), b.getUint16())
};
Cc.prototype = {
    h: function(a) {
        var b = new kd(this.zi, this.ll, this.ml, this.ql);
        a.a.W.sa.jz(this.Ox).info().Gr(this.Dv, b)
    }
};
var Ac;
Ac = function(a, b) {
    this.Ab = b.getUint16()
};
Ac.prototype = {
    h: function(a) {
        a.Cc.Yz(this.Ab)
    }
};
var Bc;
Bc = function(a, b) {
    this.Ab = b.getUint16()
};
Bc.prototype = {
    h: function(a) {
        var b = a.Cc.Nj(a.Cc.bm());
        !b.Cf && a.Ie && b.ei.drawImage(b.Ea.canvas, 0, 0);
        b.Cf || a.Ie || b.LA(!0);
        a.Cc.Wz()
    }
};
var xc;
xc = function() {};
xc.prototype = {
    h: function(a) {
        var b = a.a.Sa,
            c = a.Rl,
            d;
        var e = p.b(2 * c.count());
        var f = O.b(e, a.a.s.Ja);
        for (d = 0; d < c.count(); ++d) f.Db(c.lz(d));
        a = new n(519, a.a.s.L, 0, 0);
        a.$a(e);
        b.push(a)
    }
};
var qc;
qc = function() {};
qc.prototype = {
    h: function(a) {
        var b = a.a.Sa,
            c = a.ej,
            d;
        var e = p.b(4 * c.count());
        var f = O.b(e, a.a.s.Ja);
        for (d = 0; d < c.count(); ++d) f.Db(c.w(d)), f.Db(c.v(d));
        a = new n(518, a.a.s.L, 0, 0);
        a.$a(e);
        b.push(a)
    }
};
var wc;
wc = function(a, b) {
    var c = b.getUint16();
    this.ea = b.aa(c, 52 === a)
};
wc.prototype = {
    h: function(a) {
        a.getContext().font = a.getState().Ib;
        a.Rl.jy(this.ea)
    }
};
var pc;
pc = function(a, b) {
    var c = b.getUint16();
    this.ea = b.aa(c, 34 === a)
};
pc.prototype = {
    h: function(a) {
        a.getContext().font = a.getState().Ib;
        a.ej.Yp(this.ea)
    }
};
var vc;
vc = function(a, b) {
    b.getUint32();
    b.getUint32()
};
vc.prototype = {
    h: function(a) {
        a.Rl.clear()
    }
};
var oc;
oc = function(a, b) {
    b.getUint32();
    b.getUint32()
};
oc.prototype = {
    h: function(a) {
        a.ej.clear()
    }
};
var md;
md = function(a, b) {
    this.Kx = b.getUint32();
    this.bt = b.getInt16();
    b.getInt16()
};
md.prototype = {
    h: function(a) {
        a.getContext().font = a.getState().Ib;
        a.ej.Yp(this.ea, this.bt, this.Kx)
    }
};
var Ec;
Ec = function(a, b, c) {
    var d = b.getUint16();
    this.ea = b.aa(d, !1);
    md.call(this, a, b, c)
};
Ec.prototype = Object.create(md.prototype);
Ec.prototype.constructor = Ec;
var Fc;
Fc = function(a, b, c) {
    var d = b.getUint16();
    this.ea = b.aa(d, !0);
    md.call(this, a, b, c)
};
Fc.prototype = Object.create(md.prototype);
Fc.prototype.constructor = Fc;
var Ta;
Ta = function() {
    this.pn = "";
    this.Dh = D.i;
    this.un = "";
    this.Lh = this.$j = !1;
    this.bk = D.i;
    this.on = t.b();
    this.Ig = "";
    this.Vg = 0
};
Ta.prototype = {
    NA: function(a) {
        this.Ig = a
    },
    SA: function(a) {
        this.Vg = a
    },
    $A: function(a) {
        this.pn = a
    },
    rr: function(a) {
        this.Dh = a
    },
    yz: function() {
        return "" === this.Ig || 0 === this.Vg ? !1 : !0
    },
    iB: function(a) {
        this.un = a ? location.protocol + "//" + this.Ig + ":" + this.Vg : ""
    }
};
var nd;
nd = function(a, b) {
    this.a = a;
    this.yb = b
};
nd.prototype = {
    h: function() {
        var a = this.a.Ga(),
            b = this.a.getConfiguration(),
            c = this.a.Na();
        c.$q(b.PlcAddress, b.CommBufferSize, b.UseLocalHost);
        a.Za(c.Oa(), this)
    },
    hb: function(a) {
        a = (new T(a, !0, this.a.ya())).i();
        a instanceof la ? (this.a.s.Hh = a.Hh, this.a.I(this.yb, 0)) : this.a.error("Checking for demo mode failed (1): " + a)
    },
    gm: function() {
        return !1
    },
    H: function(a) {
        this.a.error("Checking for demo mode failed (2): " + a)
    },
    className: function() {
        return "CheckDemoModeState"
    }
};
var od;
od = function(a) {
    this.a = a;
    this.nl = !0;
    this.Lp = this.am = 0
};
od.prototype = {
    h: function() {
        var a = this.a.Ga(),
            b = this.a.Na();
        b.Ty();
        this.Lp = t.b();
        a.Za(b.Oa(), this, !1, !this.nl)
    },
    Tf: function() {
        return !0
    },
    hb: function() {
        var a = t.b() - this.Lp;
        this.nl ? (this.am = a, this.nl = !1, this.a.I(this, 0)) : (y.i(t.i("Deriving post method difference: {0}ms data in body, {1}ms without", this.am, a)), a < this.am - 20 && (y.b("POST requests will be sent with the data in header because this seems faster"), this.a.Fr(!0)), this.a.I(new pd(this.a), 0))
    },
    H: function() {
        this.a.error("deriving the best post method failed")
    },
    className: function() {
        return "DerivingPostMethodState"
    }
};
var qd;
qd = function(a, b, c, d, e, f, g) {
    void 0 === g && (g = null);
    this.a = a;
    this.jj = b;
    this.Wd = c;
    this.jc = f;
    this.cj = e;
    this.Fw = g;
    this.Cb = d
};
qd.prototype = {
    h: function() {
        var a = this.a.Ga(),
            b = this.a.Na();
        2 === this.jc.Ad ? 0 === this.cj ? b.Oy(this.jc.Ad) : b.Py(this.jj, this.Wd) : 0 === this.cj ? b.qm("", "", 0, this.jc.Ad) : b.qm(this.jj, this.Wd, this.Fw.os, this.jc.Ad);
        a.Za(b.Oa(), this)
    },
    hb: function(a) {
        0 === this.cj ? this.ix(a) : this.jx(a)
    },
    ix: function(a) {
        var b = (new T(a, this.a.s.Ja, this.a.ya())).A(this.jc.Ad, this.Cb);
        if (b instanceof zb)
            if (2 === this.jc.Ad) {
                var c = this;
                rd.i(b.ps).then(function(d) {
                    var e = b.qs,
                        f = Math.min(c.Wd.length, 60),
                        g = t.mg(c.Wd),
                        h = new ArrayBuffer(60),
                        l = new Uint8Array(h);
                    g = new Uint8Array(g);
                    var r = new Uint8Array(e);
                    var v = Math.min(e.byteLength, 60);
                    for (e = 0; 60 > e; e++) l[e] = 0;
                    for (e = 0; e < f; e++) l[e] = g[e];
                    for (e = 0; e < v; e++) l[e] ^= r[e];
                    rd.b(d, h).then(function(u) {
                        var x = c.jj;
                        60 < x.length && (x = x.substr(0, 60));
                        c.a.I(new qd(c.a, x, u, c.Cb, 1, c.jc, b), 0)
                    }, function(u) {
                        c.H("DeviceLogin failed with the following error: " + u)
                    })
                }, function(d) {
                    c.H("DeviceLogin failed with the following error: " + d)
                })
            } else this.a.I(new qd(this.a, this.jj, this.Wd, this.Cb, 1, this.jc, b), 0);
        else this.H("DeviceLogin failed with the following error: " +
            b)
    },
    jx: function(a) {
        a = (new T(a, this.a.s.Ja, this.a.ya())).R();
        a instanceof Ab ? a.tc === D.b ? (this.Cb || (y.b("Successfully Logged in! DeviceSessionId: " + a.se), this.a.s.bg = a.se), this.a.I(new sd(this.a), 0)) : 25 === a.tc ? (y.b("DeviceLogin failed with the following error: NO_ACCESS_RIGHTS"), this.a.I(new td(this.a, this.jc, this.Cb), 0)) : this.H("DeviceLogin failed with the following error: " + a.tc) : this.H("DeviceLogin failed with the following error: " + a.tc)
    },
    H: function(a) {
        this.a.error("Login to the plc device failed: " +
            a)
    },
    className: function() {
        return "DeviceLoginState Step: " + this.cj + " CryptType: " + this.jc.Ad
    }
};
var pd;
pd = function(a, b, c) {
    void 0 === b && (b = q.mB(a.getConfiguration()));
    void 0 === c && (c = !1);
    this.a = a;
    this.kx = c;
    this.Cb = b
};
pd.prototype = {
    h: function() {
        var a = this.a.Ga(),
            b = this.a.Na();
        this.Cb ? b.Qy(this.a) : b.qm();
        a.Za(b.Oa(), this)
    },
    hb: function(a) {
        null !== a || this.kx ? (a = (new T(a, this.a.s.Ja, this.a.ya())).fa(this.Cb), a instanceof Bb ? this.Cb ? a.tc === D.b ? (this.Cp(a.se), a.Error === D.b || 18 === a.Error ? this.a.I(new qd(this.a, "", "", this.Cb, 0, a), 0) : this.H("DeviceSessionCreate failed with the following error: " + a.tc + " " + a.Error)) : this.H("DeviceSessionCreate failed with the following error: " + a.tc) : a.tc === D.b && a.Ad === D.A ? (this.Cp(a.se),
            this.a.I(new sd(this.a), 0)) : (y.b("Login failed. Probably credentials necessary; result: " + a.tc), this.a.I(new td(this.a, a, this.Cb), 0)) : this.H("DeviceSessionCreate failed with the following error: " + a)) : this.a.I(new pd(this.a, !1, !0), 0)
    },
    Cp: function(a) {
        y.b("Successfully Logged in! DeviceSessionId: " + a);
        this.a.s.bg = a
    },
    Tf: function() {
        return this.Cb
    },
    H: function(a) {
        this.a.error("Login to the plc device failed: " + a)
    },
    className: function() {
        return "DeviceSessionState NewServices: " + this.Cb
    }
};
var fb;
fb = function(a) {
    this.a = a
};
fb.prototype = {
    h: function() {
        y.info("Trying to reconnect after error");
        this.a.I(new Va(this.a), 0)
    },
    className: function() {
        return "ErrorState"
    }
};
var td;
td = function(a, b, c) {
    this.a = a;
    this.jc = b;
    this.Cb = c
};
td.prototype = {
    h: function() {
        this.rl()
    },
    className: function() {
        return "QueryCredentialsState"
    },
    rl: function() {
        var a = window.document.createElement("div"),
            b = this.Ld("Ok"),
            c = this.Ld("Cancel"),
            d = this.Wt(),
            e = this;
        b.addEventListener("click", function() {
            e.zw(a, d.username, d.password)
        }, !1);
        c.addEventListener("click", function() {
            e.Hf(a)
        }, !1);
        a.style.boxShadow = a.style.WebkitBoxShadow = "2px 2px 6px 6px rgba(0,0,0,0.5)";
        a.align = "center";
        a.appendChild(d.table);
        a.appendChild(b);
        a.appendChild(c);
        window.document.body.appendChild(a);
        t.Cd(a, this.Ln(300, 200));
        a.style.zIndex = 300;
        a.style.backgroundColor = "#d4d0c8";
        d.username.focus()
    },
    Wt: function() {
        var a = window.document.createElement("table"),
            b = window.document.createElement("input"),
            c = window.document.createElement("input");
        c.type = "password";
        a.border = "0";
        a.appendChild(this.ao("Username: ", b));
        a.appendChild(this.ao("Password: ", c));
        return {
            table: a,
            username: b,
            password: c
        }
    },
    ao: function(a, b) {
        var c = window.document.createElement("tr"),
            d = window.document.createElement("td");
        d.appendChild(window.document.createTextNode(a));
        c.appendChild(d);
        d = window.document.createElement("td");
        d.appendChild(b);
        c.appendChild(d);
        return c
    },
    Ln: function(a, b) {
        var c = this.a.Da().fe();
        return new w((c.m + c.T - a) / 2, (c.o + c.X - b) / 2)
    },
    Un: function(a) {
        window.document.body.removeChild(a)
    },
    zw: function(a, b, c) {
        this.Un(a);
        this.a.I(new qd(this.a, b.value, c.value, this.Cb, 0, this.jc), 0)
    },
    Hf: function(a) {
        this.a.Hr("The user did not provide credentials.", "No credentials");
        this.Un(a)
    },
    Ld: function(a) {
        var b = window.document.createElement("input");
        b.type = "button";
        b.value =
            a;
        return b
    }
};
var ud;
ud = function(a) {
    this.a = a;
    this.Gk = ""
};
ud.prototype = {
    h: function() {
        var a = this,
            b;
        for (b = document.getElementById("cas-script"); null !== b;) b.parentNode.removeChild(b), b = document.getElementById("cas-script");
        b = document.createElement("script");
        b.id = "cas-script";
        b.onload = function() {
            a.Cj()
        };
        b.onerror = function(c) {
            a.H(c)
        };
        window.onerror = function(c) {
            a.H(c)
        };
        b.src = this.a.getConfiguration().CasFactoryName;
        document.head.appendChild(b)
    },
    Cj: function() {
        "" === this.Gk && this.Je()
    },
    H: function(a) {
        this.Gk = "Loading the automation server helper script failed for the following reason: " +
            a + ".";
        this.a.error(this.Gk)
    },
    Je: function() {
        this.a.I(new vd(this.a), 0)
    },
    className: function() {
        return "RetrievingAutomationServerScriptState"
    }
};
var Va, W;
W = function() {};
W.Qa = function(a) {
    return C.Qa(a)
};
W.A = function(a) {
    a = parseInt(a, 10);
    if (0 === a || 1 === a || 2 === a) return a;
    y.info("Unexpected value at the URL configured; only 0..2 are allowed so falling back to default value");
    return 0
};
W.i = function(a) {
    return parseInt(a, 10)
};
W.b = [{
    Ma: "HandleTouchEvents",
    Ya: "CFG_HandleTouchEvents",
    type: "boolean",
    Pa: W.Qa
}, {
    Ma: "TouchHandlingActive",
    Ya: "CFG_TouchHandlingActive",
    type: "boolean",
    Pa: W.Qa
}, {
    Ma: "BestFit",
    Ya: "CFG_BestFit",
    type: "boolean",
    Pa: W.Qa
}, {
    Ma: "BestFitForDialogs",
    Ya: "CFG_BestFitForDialogs",
    type: "boolean",
    Pa: W.Qa
}, {
    Ma: "LogLevel",
    Ya: "CFG_LogLevel",
    type: "string",
    Pa: null
}, {
    Ma: "Benchmarking",
    Ya: "CFG_Benchmarking",
    type: "boolean",
    Pa: W.Qa
}, {
    Ma: "WorkaroundDisableMouseUpDownAfterActiveTouch",
    Ya: "CFG_WorkaroundDisableMouseUpDownAfterActiveTouch",
    type: "boolean",
    Pa: W.Qa
}, {
    Ma: "WorkaroundSetIgnoreTimeMsForMouseUpDownAfterActiveTouch",
    Ya: "CFG_WorkaroundSetIgnoreTimeMsForMouseUpDownAfterActiveTouch",
    type: "number",
    Pa: W.i
}, {
    Ma: "WorkaroundDisableResizeHandling",
    Ya: "CFG_WorkaroundDisableResizeHandling",
    type: "boolean",
    Pa: W.Qa
}, {
    Ma: "WorkaroundDisableSVGAspectRatioWorkaround",
    Ya: "CFG_WorkaroundDisableSVGAspectRatioWorkaroundg",
    type: "boolean",
    Pa: W.Qa
}, {
    Ma: "WorkaroundDisableSVGEmptySizeWorkaround",
    Ya: "CFG_WorkaroundDisableSVGEmptySizeWorkaround",
    type: "boolean",
    Pa: W.Qa
}, {
    Ma: "WorkaroundForceSVGEmptySizeWorkaround",
    Ya: "CFG_WorkaroundForceSVGEmptySizeWorkaround",
    type: "boolean",
    Pa: W.Qa
}, {
    Ma: "PostDataInHeader",
    Ya: "CFG_PostDataInHeader",
    type: "number",
    Pa: W.A
}, {
    Ma: "DebugOnlyPrintPaintCommands",
    Ya: "CFG_DebugOnlyPrintPaintCommands",
    type: "boolean",
    Pa: W.Qa
}, {
    Ma: "DebugOnlyPrintRawTouches",
    Ya: "CFG_DebugOnlyPrintRawTouches",
    type: "boolean",
    Pa: W.Qa
}, {
    Ma: "DebugOnlyPrintGestures",
    Ya: "CFG_DebugOnlyPrintGestures",
    type: "boolean",
    Pa: W.Qa
}, {
    Ma: "DebugOnlyPrintTouchRectangles",
    Ya: "CFG_DebugOnlyPrintTouchRectangles",
    type: "boolean",
    Pa: W.Qa
}, {
    Ma: "DebugOnlyDiagnosisDisplay",
    Ya: "CFG_DebugOnlyDiagnosisDisplay",
    type: "boolean",
    Pa: W.Qa
}, {
    Ma: "ClientName",
    Ya: "ClientName",
    type: "string",
    Pa: null
}];
Va = function(a) {
    this.a = a
};
Va.prototype = {
    h: function() {
        var a = this.a.Ga();
        var b = window.document.URL;
        b = b.substr(0, b.lastIndexOf("."));
        a.Uq(b + ".cfg.json", this)
    },
    Cj: function(a) {
        try {
            var b = this.Ow(a);
            this.ju(b);
            this.Pw(b);
            this.a.setConfiguration(b);
            this.Bu(b);
            this.Je()
        } catch (c) {
            this.H(c)
        }
    },
    ju: function(a) {
        if (a.TouchHandlingActive) {
            var b = q.tB();
            b || (a.TouchHandlingActive = b, y.info("No multitouch support detected, therefore disabling multitouch for this client."))
        }
    },
    Pw: function(a) {
        var b;
        for (b = 0; b < W.b.length; ++b) {
            var c = W.b[b];
            var d = C.Ih(this.a.jh,
                c.Ya);
            null !== d && (d = null !== c.Pa ? c.Pa(d) : d, a[c.Ma] = d, y.info("Overridden Config Entry: " + c.Ma + " = " + d))
        }
    },
    Ow: function(a) {
        try {
            var b = JSON.parse(a),
                c = new Configuration,
                d;
            for (d in b) void 0 !== d && (c[d] = b[d]);
            c.uB();
            return c
        } catch (e) {
            return this.Kg(e), new Configuration
        }
    },
    H: function(a) {
        this.Kg(a);
        this.a.setConfiguration(new Configuration);
        this.Je()
    },
    Je: function() {
        this.a.getConfiguration().CasFactoryName ? this.a.I(new ud(this.a), 0) : this.a.I(new vd(this.a), 0)
    },
    Kg: function(a) {
        y.error("Loading the configuration failed for the following reason: " +
            a + ". A default config will be used instead.")
    },
    className: function() {
        return "RetrievingConfigurationState"
    },
    Bu: function(a) {
        y.b("Configuration:");
        for (var b in a) a.hasOwnProperty(b) && y.b(t.i(" - {0}: {1}", b, a[b]));
        a.Benchmarking && y.info("Benchmarking active")
    }
};
var wd;
wd = function(a) {
    this.a = a
};
wd.prototype = {
    h: function() {
        var a = this.a.Ga(),
            b = this.a.Na();
        b.oA();
        a.Za(b.Oa(), this)
    },
    Tf: function() {
        return !0
    },
    hb: function(a) {
        null !== a && (a = (new T(a, !0, this.a.ya())).pa(), "" !== a && (this.a.s.fk = a));
        this.a.I(this.eu(), 0)
    },
    eu: function() {
        if (this.a.s.Cs) {
            if (0 === this.a.getConfiguration().PostDataInHeader) return new od(this.a);
            1 === this.a.getConfiguration().PostDataInHeader && (y.info("POST-Data in header active by override"), this.a.Fr(!0))
        }
        1 === this.a.getConfiguration().PostDataInHeader && y.warn("POST-Data in header active by override but not supported by Webserver");
        return new pd(this.a)
    },
    H: function(a) {
        this.a.error("Retrieving IP Info failed: " + a)
    },
    className: function() {
        return "RetrievingMyIpState"
    }
};
var xd;
xd = function(a) {
    this.a = a
};
xd.prototype = {
    h: function() {
        var a = this.a.Ga(),
            b = this.a.getConfiguration(),
            c = this.a.Na();
        c.$q(b.PlcAddress, b.CommBufferSize, b.UseLocalHost);
        a.Za(c.Oa(), this)
    },
    Tf: function() {
        return !0
    },
    hb: function(a) {
        null === a ? this.a.I(this, this.a.getConfiguration().PollingRegistrationInterval) : (a = (new T(a, !0, this.a.ya())).i(), a instanceof la ? (y.b("Successfully connected! SessionId: " + a.se + " IntelByteOrder: " + a.Ja), this.a.wA(a), this.a.Ac ? this.a.I(new sd(this.a), 0) : this.a.I(new wd(this.a), 0)) : this.a.error("Connection failed: " +
            a))
    },
    H: function(a) {
        this.a.error("Starting to connect failed: " + a)
    },
    className: function() {
        return "StartConnectState"
    }
};
var vd;
vd = function(a) {
    this.a = a
};
vd.prototype = {
    h: function() {
        var a = this.a.Ga(),
            b = this.a.getConfiguration();
        a.Uq(t.bf((b.Application + ".imagepoolcollection.csv").toLowerCase()), this)
    },
    Cj: function(a) {
        try {
            this.a.Da().Di.fill(a)
        } catch (b) {
            this.Kg(b)
        }
        this.Je()
    },
    H: function(a) {
        this.Kg(a);
        this.Je()
    },
    Je: function() {
        this.a.I(new xd(this.a), 0)
    },
    Kg: function(a) {
        y.error("Loading the imagepool failed for the following reason: " + a + ". Images will not work at all.")
    },
    className: function() {
        return "UploadImagePoolState"
    }
};
var yd;
yd = function(a, b) {
    this.a = a;
    this.yb = b;
    this.g = this.a.g
};
yd.prototype = {
    h: function() {
        if (null === this.g) this.a.I(this.yb, 0);
        else {
            if (3 === this.g.direction) {
                var a = t.b();
                if (a - this.g.lr < this.a.getConfiguration().UpdateRate) {
                    this.a.I(this.yb, 0);
                    return
                }
            }
            if (this.g.status.mb === U.R) {
                var b = H.fa;
                3 === this.g.direction && (b = H.R);
                b = new n(b, this.a.s.L, 0, 1);
                this.a.$f(null);
                this.a.I(this.yb, 0);
                this.a.Sa.push(b)
            } else if (this.g.status.mb === U.b) 3 !== this.g.direction && (b = this.Tt(this.g)), this.a.$f(null), this.a.I(this.yb, 0), 3 !== this.g.direction && this.a.Sa.push(b);
            else if (1 !== this.g.direction &&
                0 !== this.g.direction || this.g.status.result === D.b && !this.g.status.Fc || this.g.status.mb === U.fa) {
                if (1 === this.g.direction || 3 === this.g.direction) {
                    if (this.g.status.yd) {
                        this.g.status.yd = !1;
                        this.rl(this.g);
                        this.a.I(this.yb, 0);
                        return
                    }
                    if (1 === this.g.direction) {
                        if (this.g.status.mb !== U.pa && (this.g.status.qc || this.g.status.Gc)) {
                            b = this.a.Ga();
                            a = this.a.Na();
                            this.g.status.qc ? (0 < (this.g.Gb.lc & 4) && this.Er(this.g), 0 < (this.g.Gb.lc & 8) ? (a.Hy(this.g), this.g.status.mb = U.i) : a.oq(this.g)) : this.g.status.Gc && a.nq(this.g);
                            b.Za(a.Oa(),
                                this);
                            return
                        }
                    } else if (this.g.status.qc || this.g.status.Gc) {
                        null !== this.g.ub && (window.document.body.removeChild(this.g.ub), this.g.ub = null);
                        this.g.status.qc ? (this.Er(this.g), b = this.St(this.g), this.g.status.qc = !1, this.g.status.Gc = !0, this.a.Sa.push(b), b = new n(532, this.a.s.L, this.g.buffer.size(), 0)) : b = this.Rt(this.g);
                        this.a.I(this.yb, 0);
                        this.a.Sa.push(b);
                        this.g.lr = t.b();
                        return
                    }
                } else if (0 === this.g.direction) {
                    if (this.g.status.yd || this.g.status.Gc) {
                        b = this.a.Ga();
                        a = this.a.Na();
                        this.g.status.yd ? a.oq(this.g) :
                            this.g.status.Gc && a.nq(this.g);
                        b.Za(a.Oa(), this);
                        return
                    }
                } else if (2 === this.g.direction) {
                    if (this.g.status.yd) {
                        this.g.status.yd = !1;
                        b = this.Qt(this.g);
                        this.a.I(this.yb, 0);
                        this.a.Sa.push(b);
                        return
                    }
                    if (this.g.status.Fc && this.g.status.mb !== U.b) {
                        this.a.I(this.yb, 0);
                        this.jr(this.g);
                        return
                    }
                }
                this.a.I(this.yb, 0)
            } else b = this.a.Ga(), a = this.a.Na(), 0 !== this.g.Bh ? (a.Iy(this.g), b.Za(a.Oa(), this)) : (this.a.$f(null), this.a.I(this.yb, 0)), this.g.status.Fc = !0, this.g.status.mb = U.fa, this.g.status.result !== D.b && (this.g.status.mb =
                U.b)
        }
    },
    hb: function(a) {
        var b = !1;
        null !== a || 0 !== this.g.direction && 1 !== this.g.direction ? (a = new T(a, this.a.s.Ja, this.a.ya()), this.g.status.Fc && this.g.status.mb !== U.b ? (a.bA(this.g), this.a.I(this.yb, 0), this.jr(this.g)) : (0 === this.g.direction ? this.g.status.yd ? (this.g.status.yd = !1, a.Cm(this.g), this.g.status.result === D.b && (this.g.status.Gc = b = !0)) : this.g.status.Gc && a.dr(this.g) : this.g.status.mb === U.i ? (this.g.status.yd = !1, a.Cm(this.g), this.g.status.result === D.b && 0 < this.g.ff.Lc ? (null !== this.g.ub && window.document.body.removeChild(this.g.ub),
            this.g.status.mb = U.pa, this.Ew(this.g)) : (this.g.status.result = 0, this.g.status.mb = U.A, this.g.status.qc = !0, this.g.Gb.lc = this.g.Gb.lc & -5, this.g.Gb.lc &= -9)) : this.g.status.qc ? (a.Cm(this.g), this.g.status.qc = !1, this.g.status.result === D.b && (this.g.status.Gc = b = !0)) : this.g.status.Gc && a.dr(this.g), this.a.I(this.yb, 0), b && (b = new n(H.fa, this.a.s.L, this.g.Rm, this.g.status.result), this.a.Sa.push(b), 1 === this.g.direction && (null !== this.g.ub && window.document.body.removeChild(this.g.ub), this.g.ub = null)))) : (null !== this.g.ub &&
            (window.document.body.removeChild(this.g.ub), this.g.ub = null), b = new n(528, this.a.s.L, this.g.Rm, 7), this.a.$f(null), this.a.I(this.yb, 0), this.a.Sa.push(b))
    },
    Tf: function() {
        return !0
    },
    Er: function(a) {
        var b;
        var c = a.Kc.split("/");
        var d = a.cr.split("/");
        if (0 < c.length && 0 < d.length) {
            for (b = 0; b < c.length - 1; ++b) var e = 0 === b ? c[b] : e + "/" + c[b];
            e = void 0 !== e ? e + "/" + d[d.length - 1] : d[d.length - 1];
            a.Kc = e
        }
    },
    jr: function(a) {
        var b = null,
            c = this.Ny();
        null === a.buffer || 0 !== a.direction && 2 !== a.direction || (b = a.buffer.Hc());
        null !== this.g.ub &&
            window.document.body.removeChild(a.ub);
        a.status.mb = U.b;
        null !== b && a.status.result === D.b && (b = new Blob([b], {
            type: "application/octet-binary"
        }), a = a.Kc, a = a.split("/"), a = a[a.length - 1], c ? this.Sy(b, a) : this.download(b, a))
    },
    Sy: function(a, b) {
        window.navigator.msSaveBlob(a, b)
    },
    Ny: function() {
        var a = window.navigator.userAgent,
            b = a.indexOf("Trident/");
        return 0 < a.indexOf("MSIE ") ? !0 : 0 < b ? !0 : !1
    },
    download: function(a, b) {
        var c = window.document.createElement("a");
        c.setAttribute("href", window.URL.createObjectURL(a));
        c.setAttribute("download",
            b);
        window.document.createEvent ? (a = document.createEvent("MouseEvents"), a.initEvent("click", !0, !0), c.dispatchEvent(a)) : c.click()
    },
    gm: function() {
        return !0
    },
    H: function(a) {
        this.a.error("Error while processing the visualization: " + a)
    },
    className: function() {
        return "VisuFileTransferState"
    },
    di: function(a) {
        var b = window.document.createElement("p");
        b.textContent = a;
        return b
    },
    Ld: function(a, b, c) {
        var d = window.document.createElement("input"),
            e;
        d.className = "fileTransferButton";
        d.type = b;
        if (null !== a) d.value = a;
        else if (d.style.display =
            "none", null !== c && null !== c.Gb && 0 < c.Gb.Wk) {
            for (a = 0; a < c.Gb.Wk; ++a) b = c.Gb.xn[a], b = b.split("|"), "*.*" !== b[1] && (0 === a ? e = b[1].substr(1) : e = e + "," + b[1].substr(1));
            d.accept = e
        }
        return d
    },
    rl: function(a) {
        var b = window.document.createElement("div"),
            c = window.document.createElement("div"),
            d = window.document.createElement("div"),
            e = window.document.createElement("div"),
            f = window.document.createElement("div"),
            g = this.Ld(null, "file", a),
            h = this.Ld("Browse...", "button", a);
        a = this.Ld("Cancel", "button", a);
        var l = this.di("Choose file to transfer..."),
            r = this.di("File Transfer"),
            v = this;
        b.id = "visuFileTransfer";
        b.className = "fileTransferDialog";
        c.className = "fileTransferDialogContent";
        d.className = "fileTransferDialogHeader";
        e.className = "fileTransferDialogBody";
        f.className = "fileTransferDialogFooter";
        g.addEventListener("change", function(u) {
            v.vv(u, b)
        }, !1);
        a.addEventListener("click", function() {
            v.Hf(b)
        }, !1);
        h.addEventListener("click", function() {
            g.click()
        }, !1);
        d.appendChild(r);
        e.appendChild(l);
        f.appendChild(g);
        f.appendChild(a);
        f.appendChild(h);
        c.appendChild(d);
        c.appendChild(e);
        c.appendChild(f);
        b.appendChild(c);
        window.document.body.appendChild(b);
        this.g.ub = b
    },
    Ew: function(a) {
        var b = window.document.createElement("div"),
            c = window.document.createElement("div"),
            d = window.document.createElement("div"),
            e = window.document.createElement("div"),
            f = window.document.createElement("div"),
            g = this.Ld("Ok", "button", a);
        a = this.Ld("Cancel", "button", a);
        var h = this.di("The file already exists in the plc. Do you want to overwrite the file?"),
            l = this.di("File Transfer"),
            r = this;
        b.id = "visuFileTransfer";
        b.className = "fileTransferDialog";
        c.className = "fileTransferDialogContent";
        d.className = "fileTransferDialogHeader";
        e.className = "fileTransferDialogBody";
        f.className = "fileTransferDialogFooter";
        a.addEventListener("click", function() {
            r.Hf(b)
        }, !1);
        g.addEventListener("click", function() {
            r.Aw(b)
        }, !1);
        d.appendChild(l);
        e.appendChild(h);
        f.appendChild(a);
        f.appendChild(g);
        c.appendChild(d);
        c.appendChild(e);
        c.appendChild(f);
        b.appendChild(c);
        window.document.body.appendChild(b);
        this.g.ub = b
    },
    vv: function(a) {
        var b = new FileReader,
            c = this,
            d = this.a.g;
        b.onload = function(e) {
            c.ww(e)
        };
        d.cr = a.target.files[0].name;
        b.readAsArrayBuffer(a.target.files[0])
    },
    ww: function(a) {
        var b = this.a.g;
        b.buffer = J.b(a.target.result, this.a.s.Ja, this.a.ya());
        b.status.qc = !0
    },
    Ln: function(a, b) {
        var c = this.a.Da().fe();
        return new w((c.m + c.T - a) / 2, (c.o + c.X - b) / 2)
    },
    Hf: function(a) {
        var b = this.a.g;
        null !== b && (b.status.mb = U.R);
        window.document.body.removeChild(a)
    },
    Aw: function(a) {
        null !== this.a.g && (this.g.status.mb = U.A, this.g.Gb.lc = this.g.Gb.lc & -5, this.g.Gb.lc &= -9);
        window.document.body.removeChild(a);
        this.g.ub = null
    },
    Tt: function(a) {
        var b = this.a.s.CommBufferSize - 2E3,
            c = p.b(b + 4),
            d = O.b(c, !0);
        b = a.Kc.length;
        d.Eb(a.Kc, !1);
        a = new n(528, this.a.s.L, a.Rm, a.status.result);
        0 < b && a.$a(c);
        return a
    },
    Rt: function(a) {
        var b = 0;
        var c = this.a.s.CommBufferSize - 2E3,
            d = p.b(c + 4),
            e = O.b(d, !0),
            f;
        a.buffer.size() - a.status.Ve < c && (c = a.buffer.size() - a.status.Ve, a.status.mb = U.b, b = 1);
        e.B(c);
        for (f = 0; f < c; f++) e.va(a.buffer.getUint8());
        b = new n(530, this.a.s.L, b, 0);
        b.$a(d);
        a.status.Ve += c;
        return b
    },
    St: function(a) {
        var b = this.a.s.CommBufferSize -
            2E3,
            c = p.b(b + 4),
            d = O.b(c, !0);
        b = a.Kc.length;
        d.B(b);
        d.Eb(a.Kc, !1);
        a = new n(530, this.a.s.L, 2, 0);
        a.$a(c);
        return a
    },
    Qt: function(a) {
        var b = p.b(20);
        O.b(b, !0).Eb("DummyFileName", !1);
        var c = new n(H.R, this.a.s.L, 0, 0);
        c.$a(b);
        a.status.qc = !0;
        return c
    }
};
var zd;
zd = function(a, b) {
    this.a = a;
    this.fj = b
};
zd.prototype = {
    h: function() {
        var a = this.a.Ga(),
            b = this.a.Na(),
            c = new n(3145728, this.a.s.L, 0, 0),
            d = p.b(32),
            e = O.b(d, !0);
        e.B(1);
        e.Eb(this.fj, !1);
        c.$a(d);
        b.ag(c);
        a.Za(b.Oa(), this);
        y.i("Redundancy, request for the ID with ticket:" + this.fj)
    },
    hb: function(a) {
        a = (new T(a, this.a.s.Ja, this.a.ya())).b(null);
        a instanceof pa ? a.je() ? (this.a.fb.rr(D.i), this.a.fb.on = t.b(), this.a.I(new Ad(this.a), 0)) : this.H("Unexpected paint result in " + this.className()) : this.H(a)
    },
    H: function(a) {
        this.a.error("Error during redundancy initializing (1) the visualization: " +
            a)
    },
    className: function() {
        return "VisuOnlineInitRedundState1"
    }
};
var Ad;
Ad = function(a) {
    this.a = a
};
Ad.prototype = {
    h: function() {
        var a = this.a.Ga(),
            b = this.a.Na(),
            c = new n(1048576, this.a.s.L, 0, 0);
        b.ag(c);
        a.Za(b.Oa(), this)
    },
    hb: function(a) {
        a = (new T(a, this.a.s.Ja, this.a.ya())).b(null);
        var b = this;
        a instanceof pa ? a.je() ? (this.a.fb.$j = !0, this.a.Da().Cq(a, function() {
            var c = b.a.fb;
            c.Dh === D.i ? 7E3 > t.b() - c.on ? b.a.I(b, 10) : b.H("Timeout on receiving command in " + b.className()) : (y.i("Redundancy, ID to use, ID :" + c.Dh), y.i("Redundancy, ID to remove, ID :" + b.a.s.L), c.bk = b.a.s.L, b.a.s.L = c.Dh, c.$j = !1, b.a.I(new Bd(b.a),
                0))
        })) : this.H("Unexpected paint result in " + this.className()) : this.H(a)
    },
    H: function(a) {
        this.a.error("Error during redundancy initializing (2) the visualization: " + a)
    },
    className: function() {
        return "VisuOnlineInitRedundState2"
    }
};
var Bd;
Bd = function(a) {
    this.a = a
};
Bd.prototype = {
    h: function() {
        var a = this.a.Ga(),
            b = this.a.Na();
        b.Qm(this.a.fb.bk);
        a.Za(b.Oa(), this)
    },
    hb: function(a) {
        a = (new T(a, this.a.s.Ja, this.a.ya())).Lb();
        0 === a ? (y.i("Redundancy, Client removed:" + this.a.fb.bk), y.b("Start normal machine state after redundancy switchover, ID: " + this.a.s.L), this.a.I(new Cd(this.a), 0)) : this.H(a)
    },
    H: function(a) {
        this.a.error("Error during redundancy initializing (3) the visualization: " + a)
    },
    className: function() {
        return "VisuOnlineInitRedundState3"
    }
};
var Cd;
Cd = function(a) {
    this.a = a
};
Cd.prototype = {
    h: function() {
        var a = this.a.Ga(),
            b = this.a.Na(),
            c = n.R(this.a.s.L, this.a.getConfiguration().BestFit, this.a.getConfiguration().BestFitForDialogs, this.a.getConfiguration().ScaleTypeIsotropic, this.a.Da().fe(), this.a.Da().Ak);
        b.ag(c);
        a.Za(b.Oa(), this)
    },
    hb: function(a) {
        a = (new T(a, this.a.s.Ja, this.a.ya())).b(null);
        a instanceof pa ? !a.je() || 0 < a.Jd ? this.H("Unexpected paint result in " + this.className()) : this.a.I(new Dd(this.a), 0) : this.H(a)
    },
    H: function(a) {
        this.a.error("Error during initializing (1) the visualization: " + a)
    },
    className: function() {
        return "VisuOnlineInitState1"
    }
};
var Dd;
Dd = function(a) {
    this.a = a
};
Dd.prototype = {
    h: function() {
        var a = this.a.Ga(),
            b = this.a.Na(),
            c = new n(1048576, this.a.s.L, 0, 0),
            d = p.b(16),
            e = O.b(d, !0),
            f = this.a.getConfiguration();
        e.B(458752);
        e.B(7);
        var g = 0;
        !0 === f.HasKeyboard && (g |= 24);
        f.TouchHandlingActive && (g |= 3);
        e.B(g);
        c.$a(d);
        b.ag(c);
        a.Za(b.Oa(), this)
    },
    hb: function(a) {
        a = (new T(a, this.a.s.Ja, this.a.ya())).b(null);
        a instanceof pa ? !a.je() || 0 < a.Jd ? this.H("Unexpected paint result in " + this.className() + ", complete: " + a.je() + ", commands: " + a.Jd) : this.a.I(new Ed(this.a), 0) : this.H(a)
    },
    H: function(a) {
        this.a.error("Error during initializing (2) the visualization: " +
            a)
    },
    className: function() {
        return "VisuOnlineInitState2"
    }
};
var Ed;
Ed = function(a) {
    this.a = a
};
Ed.prototype = {
    h: function() {
        var a = this.a.Ga(),
            b = this.a.Na(),
            c = new n(1048576, this.a.s.L, 0, 0),
            d = p.b(32),
            e = O.b(d, !0);
        !1 === this.a.fb.Lh ? (e.B(1), e.Eb(this.a.getConfiguration().StartVisu, !1)) : (e.B(2), e.va(0));
        c.$a(d);
        b.ag(c);
        a.Za(b.Oa(), this)
    },
    hb: function(a) {
        a = (new T(a, this.a.s.Ja, this.a.ya())).b(null);
        a instanceof pa ? !a.je() || 0 < a.Jd ? this.H("Unexpected paint result in " + this.className() + ", complete: " + a.je() + ", commands: " + a.Jd) : (!0 === this.a.fb.Lh && (this.a.fb.Lh = !1, "TRACE" !== this.a.getConfiguration().LogLevel &&
            (history.replaceState(null, "", location.pathname + location.search), window.document.title = "")), this.a.I(new Fd(this.a), 0)) : this.H(a)
    },
    H: function(a) {
        this.a.error("Error during initializing (3) the visualization: " + a)
    },
    className: function() {
        return "VisuOnlineInitState3"
    }
};
var Fd;
Fd = function(a) {
    this.a = a;
    this.lf = null;
    this.Zo = t.b();
    this.a.BA(new Fb);
    this.Zl = !1;
    this.zo = !0;
    this.vl = !1
};
Fd.prototype = {
    h: function() {
        var a = this.a.Ga(),
            b = this.a.Na(),
            c = this.a.Da().$k;
        this.At(c);
        null === this.lf ? (c = this.a.Sa.empty() ? new n(1, this.a.s.L, 0, 0) : this.a.Sa.pop(), c.Wg ? (this.vl = !0, b.xB(c)) : (this.vl = !1, b.ag(c))) : b.vB(this.lf.uk);
        this.vx = t.b();
        a.Za(b.Oa(), this)
    },
    gm: function() {
        return null === this.lf && !this.Zl
    },
    hb: function(a) {
        if (this.vl) this.a.I(this.Go(), this.io());
        else {
            a = (new T(a, this.a.s.Ja, this.a.ya())).b(this.lf);
            var b = this;
            a instanceof pa ? a.je() ? (this.lf = null, this.zo && (this.a.Da().zy(), this.zo = !1),
                this.Zl = !0, this.a.Da().Cq(a, function() {
                    b.Zl = !1;
                    b.a.I(b.Go(), b.io())
                })) : (this.lf = a, this.a.I(this, 0)) : this.H(a)
        }
    },
    Go: function() {
        return !this.a.s.Hh && 4E3 <= t.b() - this.Zo ? (this.Zo = t.b(), new nd(this.a, this)) : null !== this.a.g ? new yd(this.a, this) : this
    },
    io: function() {
        var a = this.a.Sa;
        if (null !== this.a.g && 3 === this.a.g.direction) return this.a.getConfiguration().UpdateRate;
        if (a.empty() && null === this.a.g) {
            var b = t.b(),
                c = this.a.getConfiguration().UpdateRate;
            a = b - a.ap;
            return 0 <= a && a < Math.min(2 * c, 500) ? Math.max(10, c / 5) :
                Math.max(10, c - (b - this.vx))
        }
        return 0
    },
    At: function(a) {
        a.uy()
    },
    H: function(a, b) {
        var c = !1,
            d = !1,
            e = "";
        "number" === typeof b ? b >= F.b && 100 >= b && (d = !0, e = "Err=" + b) : "Client id not present or no longer valid" === a ? (d = !0, e = "Err=1000") : "Unexpected format of service: 6" === a && (d = !0, e = "Err=1001");
        d && this.a.fb.yz() && (this.a.fb.iB(!0), b = this.a.fb.un, b += location.pathname, b += location.search, b += "#CKT=" + this.a.fb.pn, "TRACE" === this.a.getConfiguration().LogLevel && (b += "#" + e), location.assign(b), c = !0);
        !1 === c && this.a.error("Error while processing the visualization: " +
            a)
    },
    className: function() {
        return "VisuOnlineState"
    }
};
var Gd;
Gd = function(a) {
    this.a = a;
    this.lx = 0
};
Gd.prototype = {
    h: function() {
        var a = this.a.Ga(),
            b = this.a.Na();
        b.wB(this.a.s.L);
        a.Za(b.Oa(), this)
    },
    hb: function(a) {
        a = (new T(a, this.a.s.Ja, this.a.ya())).Ia();
        "number" === typeof a ? 0 === a ? (y.b("Successfully finished visu registration: " + this.a.s.L), a = this.a.Nq(), "" !== a ? (this.a.fb.Lh = !0, this.a.I(new zd(this.a, a), 0)) : this.a.I(new Cd(this.a), 0)) : 1 === a ? (0 === this.lx++ % 20 && y.info("Still polling the registration of the visualization. Is the visu stopped?"), this.a.I(this, this.a.getConfiguration().PollingRegistrationInterval)) :
            this.H("Unexpected return value: " + a) : this.H(a)
    },
    H: function(a) {
        this.a.error("Visu registration in the plc failed: " + a)
    },
    className: function() {
        return "VisuPollingRegistrationState"
    }
};
var sd;
sd = function(a) {
    this.a = a
};
sd.prototype = {
    h: function() {
        var a = this.a.Ga(),
            b = this.a.Na(),
            c = this.a.getConfiguration();
        b.yB(c.Application, c.ClientName, this.a.s.fk, this.a.Ac);
        a.Za(b.Oa(), this)
    },
    hb: function(a) {
        a = (new T(a, this.a.s.Ja, this.a.ya())).lb();
        "number" === typeof a ? (y.b("Successful first visu registration step: " + a), this.a.s.L = a, window.ProgrammingSystemAccess && window.ProgrammingSystemAccess.notifyValidExternId(a), this.a.getConfiguration().CasFactoryName && this.oh(), a = new Gd(this.a), this.a.I(a, this.a.getConfiguration().PollingRegistrationInterval)) :
            this.H(a)
    },
    H: function(a) {
        this.a.error("Visu registration in the plc failed: " + a)
    },
    className: function() {
        return "VisuRegistrationState"
    },
    oh: function() {
        var a = this.a.s;
        if (null !== a && a.L !== D.i && (a.bg !== D.R || this.Ac)) {
            var b = this.a.Na(a);
            b.Qm(a.L);
            this.a.Ga().oh(b.Oa())
        }
    }
};
var Hd;
Hd = function(a, b) {
    this.a = a;
    this.Fi = this.Hd = null;
    this.sb = [];
    this.gb = -1;
    this.Eg = [];
    this.Ra = b;
    this.Sw = q.R();
    this.xq = function(c) {
        c.preventDefault()
    };
    this.vp(this.sb, !1)
};
Hd.prototype = {
    register: function(a, b) {
        this.Hd = a;
        this.Fi = b
    },
    Kb: function() {
        return this.a.Kb()
    },
    handleEvent: function(a, b) {
        var c = this.Sw;
        switch (b) {
            case H.A:
                return c ? this.Ti(a, !1) : this.Vd(a.Sb, !1);
            case H.i:
                return c ? this.Rg(a, !1) : this.Vd(a.Sb, !1);
            case H.b:
                return c ? this.Qg(a, !1) : this.Vd(a.Sb, !1);
            default:
                y.warn(t.i("BrowserTouchEventHandling.handleEvent. Unknown event: {0}", b))
        }
        return !1
    },
    Xa: function() {
        this.Dk();
        this.Zg(this.sb);
        this.Zg(this.Eg)
    },
    Re: function() {
        return this.a.ba ? t.ab() : this.Ra.Re()
    },
    up: function(a) {
        var b;
        for (b = 0; b < a.length; ++b) this.Re().addEventListener(a[b].e, a[b].La, a[b].Rf)
    },
    Zg: function(a) {
        var b;
        for (b = 0; b < a.length; ++b) this.Re().removeEventListener(a[b].e, a[b].La)
    },
    vp: function(a, b) {
        var c = b ? "Capturing " : "";
        q.R() ? (y.i(c + "Touchsupport using PointerEvents"), this.Vu(a, b), this.up(a)) : "ontouchstart" in window ? (y.i(c + "Touchsupport using TouchEvents"), this.Wu(a, b), this.up(a)) : y.warn("No touch support")
    },
    Wu: function(a, b) {
        if (!(this.Ra instanceof Q)) {
            var c = this,
                d = function(e) {
                    c.Vd(e, b)
                };
            a.push({
                e: "touchstart",
                La: d,
                Rf: b
            });
            a.push({
                e: "touchmove",
                La: d,
                Rf: b
            });
            a.push({
                e: "touchend",
                La: d,
                Rf: b
            })
        }
    },
    Vu: function(a, b) {
        if (!(this.Ra instanceof Q)) {
            var c = this;
            a.push({
                e: "pointerdown",
                La: function(d) {
                    c.xw(new yb(d), b)
                },
                Rf: b
            });
            a.push({
                e: "pointermove",
                La: function(d) {
                    c.Qg(new yb(d), b)
                },
                Rf: b
            });
            a.push({
                e: "pointerup",
                La: function(d) {
                    c.Rg(new yb(d), b)
                },
                Rf: b
            })
        }
    },
    $w: function() {
        0 < this.Eg.length || !this.a.ba || this.Ra instanceof Q || this.vp(this.Eg, !0)
    },
    Ft: function() {
        0 < this.Eg.length || !this.a.ba || this.Ra instanceof Q || this.Zg(this.Eg)
    },
    Nx: function(a, b) {
        var c;
        for (c = 0; c < a.length; ++c)
            if (a[c].identifier === b) return !0;
        return !1
    },
    kk: function(a, b, c) {
        var d;
        for (d = 0; d < a.length; ++d) {
            var e = a[d];
            b.Oe(this.Ra.lm(new yb(e), c))
        }
    },
    yn: function(a, b, c) {
        var d;
        for (d = 0; d < a.length; ++d) {
            var e = a[d];
            this.Nx(b, e.identifier) || c.Oe(this.Ra.lm(new yb(e), X.Oc))
        }
    },
    nu: function() {
        null !== this.a.getConfiguration() && this.a.getConfiguration().WorkaroundDisableMouseUpDownAfterActiveTouch && this.a.Mi.JA(t.b() + this.a.getConfiguration().WorkaroundSetIgnoreTimeMsForMouseUpDownAfterActiveTouch)
    },
    Vd: function(a) {
        if (null !== this.Hd) {
            this.Mp(a);
            this.nu();
            this.a.TB().vj(a);
            var b = new Id;
            "touchstart" === a.type ? (0 === this.Kb().Ta.length && this.jo(), this.kk(a.changedTouches, b, X.gc), this.yn(a.targetTouches, a.changedTouches, b, X.Oc)) : "touchmove" === a.type ? this.kk(a.targetTouches, b, X.Oc) : (this.kk(a.changedTouches, b, X.Nb), this.yn(a.targetTouches, a.changedTouches, b, X.Oc), 0 === a.targetTouches.length && this.uo());
            this.Hd(b)
        }
    },
    xw: function(a, b) {
        var c = a.Sb;
        if (this.Ti(a, b) && this.a.ba) {
            var d = this;
            this.a.Hk.hq(c, d, function(e) {
                d.Qg(new yb(e),
                    b)
            }, function(e) {
                d.Rg(new yb(e), b)
            })
        }
    },
    Ti: function(a, b) {
        var c = a.Sb;
        return "touch" === c.pointerType ? (this.a.Sc.vj(c), 0 === this.Kb().Ta.length && this.jo(), this.ym(c, b) ? (y.warn(t.i("Unexpected Pointerdown event for id: {0}; Ignored!", c.pointerId)), !1) : this.Tk(a, b, X.gc) ? !0 : !1) : !1
    },
    Rg: function(a, b) {
        var c = a.Sb;
        if (!this.ym(c, b)) return !1;
        if ("touch" === c.pointerType) {
            if (!this.Tk(a, b, X.Nb)) return !1;
            0 === this.Kb().Ta.length && this.uo();
            return !0
        }
        return !1
    },
    Qg: function(a, b) {
        var c = a.Sb;
        return this.ym(c, b) ? "touch" === c.pointerType ?
            this.Tk(a, b, X.Oc) ? !0 : !1 : !1 : !1
    },
    Tk: function(a, b, c) {
        var d = this.Ra.lm(a, c);
        this.Ux();
        switch (c) {
            case X.gc:
                this.Kb().us(d);
                break;
            case X.Oc:
            case X.Nb:
                this.Kb().hn(d.id()), this.Kb().Js(d)
        }
        var e = this.qv();
        if (b && c === X.gc)
            if (this.Fi(e)) d.Im(!0);
            else return this.Kb().mn(d), !1;
        this.Hd(e);
        c === X.Nb && this.Kb().mn(d);
        this.Mp(a.Sb);
        return !0
    },
    ym: function(a, b) {
        a = t.fa(a);
        if (-1 === this.Kb().Eh(a)) return !1;
        a = this.Kb().hn(a);
        return b ? a.Jg : !0
    },
    qv: function() {
        var a = new Id;
        this.Kb().Sr(a);
        return a
    },
    Ux: function() {
        this.Kb().Is(X.Oc)
    },
    Mp: function(a) {
        a.preventDefault();
        a.stopPropagation()
    },
    uo: function() {
        var a = this;
        this.Mn();
        this.gb = window.setTimeout(function() {
            a.Dk()
        }, 500)
    },
    Mn: function() {
        -1 !== this.gb && (window.clearTimeout(this.gb), this.gb = -1)
    },
    Dk: function() {
        this.Mn();
        t.ab().removeEventListener("contextmenu", this.xq)
    },
    jo: function() {
        this.Dk();
        t.ab().addEventListener("contextmenu", this.xq)
    }
};
var yb;
yb = function(a, b, c, d) {
    d || (d = null);
    b || (b = t.bd(a) ? t.lb(a.target, t.ab()).offset(q.qe(a)) : t.pa(a) ? t.lb(a.target, t.ab()).offset(q.Dd(a)) : new w(-1, -1));
    c || (c = b);
    this.Sb = a;
    this.Jf = b;
    this.td = c;
    this.cb = d
};
yb.prototype = {
    Ha: function() {
        return this.cb
    },
    sc: function(a) {
        this.cb = a
    }
};
var Jd;
Jd = function(a) {
    this.Nc = this.ic = null;
    a || (a = X.Ob);
    this.cb = null;
    this.Uj(a)
};
Jd.prototype = {
    type: function() {
        if (null === this.ic) throw Error("Unexpected call. Gesture data not yet assigned");
        return this.ic.type()
    },
    sc: function(a) {
        this.cb = a
    },
    Ha: function() {
        return this.cb
    },
    Uj: function(a) {
        if (null === this.ic || this.type() !== a) switch (a) {
            case X.ed:
                this.ic = new Kd;
                break;
            case X.Ob:
                this.ic = new Ld;
                break;
            case X.ue:
                this.ic = new Md;
                break;
            case X.Pc:
                this.ic = new Nd(!1);
                break;
            case X.uc:
                this.ic = new Nd(!0);
                break;
            default:
                throw Error("Unexpected gesture type");
        }
    },
    data: function() {
        return this.ic
    },
    clone: function() {
        var a =
            new Jd;
        null !== this.ic && (a.ic = this.ic.clone());
        null !== this.cb && (a.cb = this.cb);
        a.Nc = this.Nc;
        return a
    }
};
var X;
X = {
    Oc: 1,
    Nb: 2,
    gc: 4,
    Ph: 8,
    tn: 16,
    ek: 5,
    Ob: 0,
    ue: 1,
    ed: 2,
    Pc: 3,
    uc: 4,
    te: 0,
    Oh: 1,
    Gs: 2,
    Nh: 4,
    rn: 8,
    sn: 16,
    LB: 255,
    fc: 0,
    jg: 5,
    kg: 10
};
X.Mb = X.kg;
X.lg = 11;
X.cd = 12;
X.dd = 13;
X.Es = X.dd;
var Od;
Od = function() {
    this.Vj = this.dg = this.Fh = this.Kh = this.Yj = !1
};
var Pd;
Pd = function() {
    this.Ta = []
};
Pd.prototype = {
    fr: function(a, b) {
        y.b("Record GesturesTouchEvent");
        !this.empty() && this.Sv(a) && b ? this.Ta[this.Ta.length - 1] = a : this.Ta.push(a)
    },
    mA: function(a, b) {
        y.b("Replay");
        for (var c;
            "undefined" !== typeof(c = this.Ta.shift());) a.xh(c, b)
    },
    empty: function() {
        return 0 === this.Ta.length
    },
    Sv: function(a) {
        var b = this.Ta[this.Ta.length - 1],
            c;
        if (a.touches().length !== b.touches().length) return !1;
        for (c = 0; c < a.touches().length; ++c) {
            var d = a.touches()[c];
            var e = b.touches()[c];
            if (d.id() !== e.id() || d.flags() !== e.flags() || d.K(X.Nb) ||
                d.K(X.gc)) return !1
        }
        return !0
    }
};
var Qd;
Qd = function(a, b, c, d, e) {
    e = e ? e : null;
    this.Ua = a;
    this.jb = c;
    this.rd = new Rd(b);
    this.td = d;
    this.cb = e;
    this.Jg = !1
};
Qd.prototype = {
    id: function() {
        return this.Ua
    },
    Ha: function() {
        return this.cb
    },
    sc: function(a) {
        this.cb = a
    },
    Im: function(a) {
        this.Jg = a
    },
    location: function() {
        return this.rd
    },
    flags: function() {
        return this.jb
    },
    nh: function(a) {
        this.jb |= a
    },
    K: function(a) {
        return (this.jb & a) === a
    },
    update: function(a) {
        this.jb = a
    },
    clone: function() {
        var a = new Qd(this.id(), this.location().current(), this.flags(), this.td, this.Ha());
        a.Im(this.Jg);
        return a
    }
};
var Id;
Id = function() {
    this.ta = [];
    this.Mx = t.b()
};
Id.prototype = {
    touches: function() {
        return this.ta
    },
    Oe: function(a) {
        this.ta.push(a)
    },
    timeStamp: function() {
        return this.Mx
    }
};
var Rd;
Rd = function(a) {
    this.au = a;
    this.Yo = null
};
Rd.prototype = {
    current: function() {
        return this.au
    },
    uh: function() {
        return this.Yo
    },
    xr: function(a) {
        this.Yo = a
    }
};
var Y;
Y = {
    sm: function(a, b) {
        var c = 0 < b.touches().length,
            d;
        a.data().xy();
        for (d = 0; d < b.touches().length; ++d) {
            var e = b.touches()[d];
            a.data().Oe(e.clone());
            e.K(X.Nb) || (c = !1)
        }
        return c
    },
    ny: function(a, b) {
        var c;
        for (c = 0; c < a.touches().length; ++c)
            if (a.touches()[c].K(b)) return !0;
        return !1
    },
    Qf: function(a, b) {
        var c;
        for (c = 0; c < a.touches().length; ++c)
            if (!a.touches()[c].K(b)) return !1;
        return !0
    },
    wq: function(a) {
        var b = X.rn | X.sn;
        1 === a.touches().length ? b |= X.Oh | X.Nh : 2 === a.touches().length && (b |= X.Gs);
        return b
    },
    th: function(a) {
        return a ===
            X.Pc || a === X.uc
    }
};
var ab;
ab = function(a, b) {
    var c = this;
    this.a = a;
    this.Ra = b;
    this.zg = new Hd(a, this.Ra);
    this.zg.register(function(d) {
        c.Hd(d)
    }, function(d) {
        return c.Fi(d)
    });
    this.oc = null;
    this.sa = new Sd;
    this.Cl = -1;
    this.Gp("none");
    this.gl = new Td(this.a.ae)
};
ab.prototype = {
    Xa: function() {
        this.Gp("auto");
        this.zg.Xa()
    },
    handleEvent: function(a, b) {
        return this.zg.handleEvent(a, b)
    },
    Zp: function(a) {
        this.sa.cm(a);
        this.zt(a)
    },
    jq: function() {
        this.sa.clear();
        this.Et()
    },
    Sj: function(a) {
        this.a.D.Sj(a);
        a && (this.oc = this.Ra.wj(!0))
    },
    iz: function() {
        return this.a.ae.vm()
    },
    Lq: function() {
        return this.a.ae.Dj()
    },
    Gj: function() {
        return this.a.ae.Gj()
    },
    Lj: function(a, b, c) {
        a = n.pa(a, this.a.s.L, b);
        void 0 !== c && null !== c && a.sc(c);
        this.Ra.$b(a)
    },
    Bz: function() {
        return this.gl.active()
    },
    hB: function() {
        this.gl.stop()
    },
    Gq: function(a, b, c) {
        var d = new Od;
        c = this.ku(a, b, c);
        this.dl(a, X.rn) && this.sa.Zy(b, c) ? d.Vj = !0 : this.dl(a, X.sn) && this.sa.my(b, c) ? d.dg = !0 : this.dl(a, X.Oh | X.Nh) && (a = [], this.sa.vy(b, a, c), d.Kh = a[0], d.Fh = a[1]);
        d.Yj = !this.xt();
        return d
    },
    ku: function(a, b, c) {
        if (this.a.ba) {
            if (void 0 === c) {
                a = b.touches();
                if (0 < a.length)
                    for (b = 0; b < a.length; b++)
                        if (a[b] && a[b].Jg) return R.Wj;
                return 0
            }
            return c ? R.Wj : R.Nr
        }
        return 0
    },
    tm: function(a, b, c) {
        if (a >= X.kg && a <= X.Es)
            if (b.type() === X.Ob || b.type() === X.ue) {
                if (this.fv(a, b, b.Nc, c)) return !0
            } else if (this.Rv(b.type()) &&
            this.gv(a, b, b.Nc)) return !0;
        return !1
    },
    mj: function() {
        this.a.D.Ky();
        !this.a.D.Hj() && this.a.Pd.buffer().empty() && this.a.D.Km(!1)
    },
    Gp: function(a) {
        this.Ra.Re().style.touchAction = a
    },
    xt: function() {
        return this.a.D.Hj() ? (this.a.D.Km(!0), !1) : !0
    },
    dl: function(a, b) {
        return (a & b) === b
    },
    Rv: function(a) {
        return a === X.ed || Y.th(a)
    },
    To: function(a) {
        return a === X.uc
    },
    fv: function(a, b, c) {
        var d = Z.gk;
        if (a === X.Mb) {
            c = this.sa.Eq(b);
            if (null === c) return !0;
            b.Nc = c;
            this.Ex(c);
            this.a.D.rz()
        } else a !== X.dd && a !== X.cd || null === c || b.type() === X.Ob &&
            this.gl.start(this.a.Da(), c, this.oc, b, this) || (this.wo(d, b, c), this.sp(b, c));
        if (null !== c) {
            if (b.type() === X.ue || b.type() === X.Ob) d = b.data().gq(c, a, this);
            Z.Xf(d, Z.Tm) && (d = Z.Zc(d, Z.bn))
        }
        a !== X.cd && (this.wo(d, b, c), this.oc.Jj(this.a.Da(), c));
        return !1
    },
    Cz: function(a, b) {
        var c = this.oc.zm(b);
        this.sp(a, b);
        this.Lj(4098, c, a.Ha())
    },
    gv: function(a, b, c) {
        if (a === X.Mb) {
            c = this.sa.Eq(b);
            if (null === c && !this.To(b.type())) return !0;
            b.Nc = c;
            Y.th(b.type()) && this.ul(b, c)
        } else if (null !== c || this.To(b.type())) Y.th(b.type()) ? this.ul(b,
            c) : (a === X.dd || a === X.cd) && this.ul(b, c);
        return !1
    },
    ul: function(a, b) {
        b = a.data().createEvent(this.a.s.L, b, this.Ra);
        null !== a.Ha() && b.sc(a.Ha());
        this.mo(b)
    },
    mo: function(a) {
        this.Ra.$b(a)
    },
    sp: function(a, b) {
        var c = a.data().createEvent(this.a.s.L, b, this.Ra);
        c.Dr(b.na);
        null !== a.Ha() && c.sc(a.Ha());
        this.mo(c)
    },
    Ex: function(a) {
        a.info().zoom().Rj(1);
        a.info().scroll().ne(new w(0, 0));
        this.a.D.zf || this.oc.im(this.a.Da(), a.na)
    },
    wo: function(a, b, c) {
        Z.Xf(a, Z.ls) && this.qu(a, b, c);
        Z.K(a, Z.ik) && (c.info().zoom().Rj(c.info().zoom().wa.Wb),
            this.Zs(b, c));
        Z.K(a, Z.hk) && c.info().zoom().Rj(c.info().zoom().wa.Vb)
    },
    Zs: function(a, b) {
        this.ep(Z.cf | Z.df, b)
    },
    qu: function(a, b, c) {
        b.type() === X.ue ? this.ep(a, c) : b.type() === X.Ob && this.bw(a, c)
    },
    ep: function(a, b) {
        var c = b.vq(),
            d = b.info().zoom();
        if (Z.K(a, Z.eg)) d.Zf(new w(d.md.c + c.m, d.Rb.f));
        else if (Z.K(a, Z.cf)) {
            var e = d.md.c - (1 - d.Nd) * d.md.c;
            d.Zf(new w(e, d.Rb.f));
            b.info().scroll().ne(new w(d.Rb.c - d.md.c, b.info().scroll().Fa.f))
        }
        Z.K(a, Z.fg) ? d.Zf(new w(d.Rb.c, d.md.f + c.o)) : Z.K(a, Z.df) && (e = d.md.f - (1 - d.Nd) * d.md.f,
            d.Zf(new w(d.Rb.c, e)), b.info().scroll().ne(new w(b.info().scroll().Fa.c, d.Rb.f - d.md.f)))
    },
    bw: function(a, b) {
        b.Tq(a)
    },
    Fi: function(a) {
        var b = Y.wq(a);
        a = this.Gq(b, a, !0);
        return !!(a.Vj || a.Fh || a.dg || a.Kh)
    },
    Hd: function(a) {
        var b = this.a.getConfiguration();
        null !== b && this.a.D.Xk && b.TouchHandlingActive && (b.DebugOnlyPrintRawTouches && this.Eu(a), this.Ct(a), null === this.oc && (this.oc = this.Ra.wj(!1)), this.a.D.yl ? (this.a.Pd.buffer().fr(a, !0), this.Jl()) : this.a.Pd.xh(a, this) && (this.a.D.yl && this.a.Pd.buffer().fr(a, !0), this.a.Pd.buffer().empty() ||
            this.Jl()))
    },
    Ct: function(a) {
        Y.Qf(a, X.gc) ? this.a.Mi.wr(!0) : Y.Qf(a, X.Nb) && this.a.Mi.wr(!1)
    },
    Jl: function() {
        if (-1 === this.Cl) {
            var a = this;
            this.Cl = window.setTimeout(function() {
                a.Cw()
            }, 25)
        }
    },
    Cw: function() {
        this.Cl = -1;
        this.a.D.Hj() ? this.Jl() : (this.a.Pd.buffer().mA(this.a.Pd, this), this.a.D.Km(!1))
    },
    Eu: function(a) {
        var b;
        var c = t.i("Touches ({0}): ", a.touches().length);
        for (b = 0; b < a.touches().length; ++b) {
            var d = a.touches()[b];
            var e = "";
            null !== d.Ha() && (e = " (" + d.Ha().toString() + ")");
            var f = "D";
            var g = "";
            d.K(X.Oc) ? f = "M" :
                d.K(X.Nb) && (f = "U");
            d.K(X.Ph) && (g = "P");
            c += t.i("[{0}{1}{2} ({3}/{4}){5}] ", g, f, d.id(), d.location().current().c, d.location().current().f, e)
        }
        y.i(c)
    },
    zt: function(a) {
        a.K(R.Wj) && this.zg.$w()
    },
    Et: function() {
        this.zg.Ft()
    }
};
var Td;
Td = function(a) {
    this.gb = -1;
    this.nb = this.qb = this.oc = this.Va = this.Le = null;
    this.Xo = a
};
Td.prototype = {
    start: function(a, b, c, d, e) {
        this.Va = a;
        this.Le = b;
        this.oc = c;
        this.qb = d.clone();
        this.nb = e;
        var f = this;
        this.gb = window.setInterval(function() {
            f.Hd()
        }, 60);
        return -1 !== this.gb
    },
    stop: function() {
        -1 !== this.gb && (window.clearInterval(this.gb), this.nb.Cz(this.qb, this.Le), this.gb = -1, this.qb = this.oc = this.Va = this.Le = null)
    },
    active: function() {
        return -1 !== this.gb
    },
    vm: function() {
        return this.Xo.vm()
    },
    Dj: function() {
        return this.Xo.Dj()
    },
    Hd: function() {
        var a = this.Le.info().scroll();
        1 > Math.abs(a.xb.c) && 1 > Math.abs(a.xb.f) ?
            this.stop() : (a.xb.kr(1 - this.Dj()), a.xb.c = t.hg(a.xb.c), a.xb.f = t.hg(a.xb.f), a.Fa.offset(a.xb), a = this.Le.jm(), this.Le.Tq(a), Z.K(a, Z.bn) || Z.K(a, Z.ms) && Z.K(a, Z.ns) ? this.stop() : this.oc.Jj(this.Va, this.Le))
    }
};
var Za;
Za = function() {
    this.Ip = 0;
    this.co = 1;
    this.Dp = !0
};
Za.prototype = {
    XA: function(a) {
        this.Ip = a
    },
    vm: function() {
        return this.Ip
    },
    AA: function(a) {
        this.co = a
    },
    Dj: function() {
        return this.co
    },
    VA: function(a) {
        this.Dp = a
    },
    Gj: function() {
        return this.Dp
    }
};
var cb;
cb = function() {
    this.yl = this.Xk = !1;
    this.Yk = 0;
    this.zf = !1
};
cb.prototype = {
    vr: function(a) {
        this.Xk = a
    },
    Km: function(a) {
        this.yl = a
    },
    rz: function() {
        this.Yk++
    },
    Ky: function() {
        this.Yk--
    },
    Hj: function() {
        return 0 < this.Yk
    },
    Sj: function(a) {
        this.zf = a
    }
};
var Z;
Z = {
    gk: 0,
    ik: 1,
    hk: 2
};
Z.KB = Z.ik | Z.hk;
Z.eg = 4;
Z.fg = 8;
Z.cf = 16;
Z.df = 32;
Z.ls = Z.eg | Z.fg | Z.cf | Z.df;
Z.ms = Z.eg | Z.cf;
Z.ns = Z.fg | Z.df;
Z.bn = 65536;
Z.Ym = 131072;
Z.Zm = 262144;
Z.Wm = 524288;
Z.Xm = 1048576;
Z.an = 2097152;
Z.$m = 4194304;
Z.Um = Z.Ym | Z.Wm;
Z.Vm = Z.Zm | Z.Xm;
Z.Xj = Z.Um | Z.Vm;
Z.Pr = Z.an | Z.$m;
Z.Tm = Z.Pr | Z.Xj;
Z.Zc = function(a, b) {
    return a | b
};
Z.hA = function(a) {
    return a & ~Z.Xj
};
Z.K = function(a, b) {
    return (a & b) === b
};
Z.Xf = function(a, b) {
    return 0 !== (a & b)
};
var bb;
bb = function(a) {
    this.a = a
};
bb.prototype = {
    lm: function(a, b) {
        b = this.Pt(a, b, this);
        null !== a.Ha() && b.sc(a.Ha());
        return b
    },
    Pt: function(a, b) {
        return new Qd(t.fa(a.Sb), a.Jf, b, a.td)
    },
    wj: function(a) {
        return this.a.ba ? new Ud : new Vd(this.Re(), a)
    },
    Re: function() {
        return this.a.Da().he().canvas
    },
    $b: function(a) {
        this.a.$b(a)
    }
};
var Q;
Q = function(a, b, c) {
    bb.call(this, a);
    this.Xd = b;
    this.lw = c
};
Q.prototype = Object.create(bb.prototype);
Q.prototype.constructor = Q;
Q.prototype.wj = function() {
    return this.Xd
};
Q.prototype.Re = function() {
    return this.lw
};
var $a;
$a = function(a) {
    var b;
    this.M = new Pd;
    this.Yg = [];
    this.Yg[0] = new Wd;
    for (b = 1; b < X.ek; ++b) this.Yg[b] = new Xd;
    this.zp();
    this.Ll = new Yd(a);
    this.D = new Zd;
    this.sf = new $d;
    this.Gg = null;
    this.Cu = a.DebugOnlyPrintGestures
};
$a.prototype = {
    xh: function(a, b) {
        return 1 > a.touches().length || a.touches().length > X.ek ? !1 : this.ru(a, b)
    },
    Uv: function(a) {
        return !this.sf.vf.dg && Y.Qf(a, X.gc)
    },
    Vo: function(a, b) {
        return !b.Bz() && !this.sf.vf.dg && Y.Qf(a, X.Nb)
    },
    ru: function(a, b) {
        var c = new Jd,
            d = !1;
        this.Uu(a);
        this.wt(a, b) && (this.Uv(a) && this.xv(a, b), this.D.qa.state() !== X.Mb && this.D.qa.state() !== X.lg || this.$u(a, b), this.D.ir(), this.zp(), this.sf.vf.Vj && this.D.qa.qb.Uj(X.Pc));
        if (this.D.qa.qb.type() !== X.Pc) {
            var e = a.touches().length - 1;
            e = this.Yg[e].xh(this,
                a, c);
            if (e === X.jg || e >= X.kg) {
                if (e >= X.kg) return null !== this.Gg ? (this.Vo(a, b) && b.Lj(4098, a.touches()[0].location().current(), a.touches()[0].Ha()), this.Xg(this.Gg.state(), this.Gg.qb, a, b), this.Gg = null, this.Xg(e, c, a, b)) : (this.Xg(e, c, a, b), this.Vo(a, b) && b.Lj(4098, a.touches()[0].location().current(), a.touches()[0].Ha())), !0;
                this.D.qa.assign(e, c);
                this.D.qa.fq(a);
                d = !0
            }
        }
        if (!d) return this.sf.vf.Yj || (e = this.gu(c, a), this.Xg(e, c, a, b)), !0;
        this.Ck(X.fc, c);
        return !1
    },
    xv: function(a, b) {
        b.hB();
        b.Lj(4097, a.touches()[0].location().current(),
            a.touches()[0].Ha())
    },
    buffer: function() {
        return this.M
    },
    sz: function(a) {
        var b = new Jd(X.uc);
        a = a.clone();
        a.update(X.gc | X.Ph);
        b.data().Oe(a);
        this.Gg = new ae(b)
    },
    Xg: function(a, b, c, d) {
        if (this.D.qa.state() !== X.cd) {
            var e = this.D.qa.qb.Nc;
            this.yt(a, b);
            this.Ck(a, b);
            this.D.qa.assign(a, b.clone());
            b.Nc = e;
            e = {
                delay: !1,
                uj: function() {
                    d.tm(X.cd, b)
                }
            };
            d.tm(a, b, e) && (this.Ck(X.cd, b), e.delay || d.tm(X.cd, b), this.D.qa.Tj(X.cd));
            this.D.qa.qb.Nc = b.Nc;
            a !== X.dd && this.D.qa.fq(c)
        }
        a === X.dd && this.D.ir()
    },
    yt: function(a, b) {
        var c;
        if (a ===
            X.Mb && b.type() === X.uc) {
            a = !1;
            for (c = 0; c < b.data().touches().length; ++c)
                if (b.data().touches()[c].K(X.Ph)) {
                    a = !0;
                    break
                } if (!a)
                for (c = 0; c < b.data().touches().length; ++c)
                    if (b.data().touches()[c].K(X.gc)) {
                        this.D.qa.GA(b.data().touches()[c].id());
                        break
                    }
        }
        if (this.D.qa.Eo)
            for (c = 0; c < b.data().touches().length; ++c)
                if (b.data().touches()[c].id() === this.D.qa.Fn) {
                    b.data().touches()[c].nh(X.tn);
                    break
                }
    },
    gu: function(a, b) {
        var c = Y.Qf(b, X.Nb);
        var d = this.D.qa.qb.type() === X.Pc ? X.Pc : X.uc;
        a.Uj(d);
        Y.sm(a, b);
        return c ? X.dd : this.D.qa.state() ===
            X.Mb || this.D.qa.state() === X.lg ? X.lg : X.Mb
    },
    zp: function() {
        var a;
        for (a = 0; a < this.Yg.length; ++a) this.Yg[a].Tj(X.fc)
    },
    Uu: function(a) {
        var b;
        for (b = 0; b < a.touches().length; ++b) {
            var c = a.touches()[b];
            this.D.qB(c) || this.D.hy(c) || y.error("Could not store touch information; probably a touch release/up was missing")
        }
    },
    wt: function(a, b) {
        return this.Pv(a) ? (this.sf.QA(b.Gq(Y.wq(a), a)), !0) : !1
    },
    $u: function(a, b) {
        Y.th(this.D.qa.qb.type()) && Y.sm(this.D.qa.qb, a);
        this.Xg(X.dd, this.D.qa.qb, a, b)
    },
    Pv: function(a) {
        if (this.D.qa.state() ===
            X.fc) return !0;
        if (Y.th(this.D.qa.qb.type())) return Y.Qf(a, X.gc);
        if (this.D.qa.gh.length !== a.touches().length) return !0;
        var b;
        for (b = 0; b < a.touches().length; ++b)
            if (!this.D.qa.xz(a.touches()[b].id())) return !0;
        return !1
    },
    Ck: function(a, b) {
        if (this.Cu) {
            var c = "";
            switch (a) {
                case X.fc:
                    y.b("No gesture");
                    return;
                case X.jg:
                    c = "Gesture (candidate); ";
                    break;
                case X.Mb:
                    c = "Gesture (new); ";
                    break;
                case X.dd:
                    c = "Gesture (finished); ";
                    break;
                case X.lg:
                    return;
                case X.cd:
                    c = "Gesture (cancelled); "
            }
            c += b.data().zj();
            null !== b.Ha() && (c +=
                " IdStack: " + b.Ha().toString());
            y.b(c)
        }
    }
};
var be;
be = function() {
    this.ka = X.fc;
    this.qb = new Jd;
    this.gh = [];
    this.Eo = !1;
    this.Fn = -1
};
be.prototype = {
    state: function() {
        return this.ka
    },
    Tj: function(a) {
        this.ka = a
    },
    GA: function(a) {
        this.Eo = !0;
        this.Fn = a
    },
    assign: function(a, b) {
        this.ka = a;
        this.qb = b
    },
    fq: function(a) {
        var b;
        this.gh = [];
        for (b = 0; b < a.touches().length; ++b) this.gh.push(a.touches()[b].id())
    },
    xz: function(a) {
        var b;
        for (b = 0; b < this.gh.length; ++b)
            if (this.gh[b] === a) return !0;
        return !1
    }
};
var $d;
$d = function() {
    this.vf = null
};
$d.prototype = {
    QA: function(a) {
        this.vf = a
    }
};
var ae;
ae = function(a) {
    this.ka = X.Mb;
    this.qb = a
};
ae.prototype = {
    state: function() {
        return this.ka
    }
};
var Zd;
Zd = function() {
    this.Ge = [];
    this.qa = new be
};
Zd.prototype = {
    qB: function(a) {
        var b;
        for (b = 0; b < this.Ge.length; ++b)
            if (this.Ge[b].id === a.id()) return a.location().xr(this.Ge[b].uh), a.K(X.Nb) ? this.Ge.splice(b, 1) : this.Ge[b].uh = a.location().uh(), !0;
        return !1
    },
    hy: function(a) {
        if (!a.K(X.gc)) return !0;
        if (this.Ge.length === X.ek) return !1;
        this.Ge.push({
            id: a.id(),
            uh: a.location().current()
        });
        return !0
    },
    ir: function() {
        this.qa = new be
    }
};
var Yd;
Yd = function(a) {
    this.cv = a.GesturesFlickPanThresholdPxPerSecond;
    this.Nw = a.GesturesPanFlickTimeThresholdMs;
    this.Mw = a.GesturesPanClickThresholdDistSquare
};
Yd.prototype = {};
var Kd;
Kd = function(a) {
    void 0 === a && (a = new w(0, 0));
    this.tb = a;
    this.Jb = new w(0, 0);
    this.Nf = 0
};
Kd.prototype = {
    type: function() {
        return X.ed
    },
    clone: function() {
        var a = new Kd(this.tb);
        a.ph(this);
        return a
    },
    zj: function() {
        return t.i("Flick: start({0}), overall move({1}), velocity {2}", t.R(this.tb), t.R(this.Jb), this.Nf)
    },
    createEvent: function(a, b) {
        a = new n(2051, a, b.id(), 0);
        b = p.b(12);
        var c = O.b(b, !0);
        c.B(this.tb.Yc());
        c.B(this.Jb.Yc());
        c.B(this.Nf);
        a.$a(b);
        return a
    },
    ph: function(a) {
        this.tb = a.tb;
        this.Jb = a.Jb;
        this.Nf = a.Nf
    },
    start: function() {
        return this.tb
    },
    setVelocity: function(a) {
        this.Nf = a
    },
    Pm: function(a) {
        this.Jb =
            a.pe(this.tb)
    }
};
var Nd;
Nd = function(a) {
    this.hh = a;
    this.ta = []
};
Nd.prototype = {
    type: function() {
        return this.hh ? X.uc : X.Pc
    },
    touches: function() {
        return this.ta
    },
    xy: function() {
        this.ta = []
    },
    Oe: function(a) {
        this.ta.push(a)
    },
    clone: function() {
        var a = new Nd(this.hh);
        a.ta = this.ta.slice(0);
        return a
    },
    zj: function() {
        var a = "",
            b;
        var c = this.hh ? "TouchToMouse" : "IEC-Touches";
        for (b = 0; b < this.ta.length; ++b)
            if (2 > b) a += t.i("[{0}, {1}]({2}) ", b, this.ta[b].flags(), t.R(this.ta[b].location().current()));
            else {
                a += "...";
                break
            } return t.i("{0} ({1}): {2}", c, this.ta.length, a)
    },
    createEvent: function(a,
        b, c) {
        var d = 0,
            e, f = !0;
        var g = c.a.ba ? 12 : 0;
        var h = null;
        this.hh || (d = b.id());
        var l = this.ta.length;
        b = this.hh ? 2054 : 2052;
        g = p.b((8 + g) * this.ta.length);
        var r = O.b(g, !0);
        for (e = 0; e < this.ta.length; ++e) {
            r.B(this.ta[e].location().current().Yc());
            var v = 255 & this.fw(this.ta[e]);
            this.ta[e].K(X.Oc) || (f = !1);
            if (this.ta[e].K(X.Ph) || this.ta[e].K(X.tn)) v |= 256;
            v |= (this.ta[e].id() & 65535) << 16 >>> 0;
            r.B(v)
        }
        if (c.a.ba) {
            for (e = 0; e < this.ta.length; ++e)
                if (v = this.ta[e].Ha(), null !== v) {
                    if (null === h || h !== v) h = v;
                    r.B(v.kb);
                    r.B(v.zb)
                } else r.B(0), r.B(0);
            for (e = 0; e < this.ta.length; ++e) r.B(this.ta[e].td.Yc())
        }
        f && b++;
        a = new n(b, a, d, l);
        a.$a(g);
        !c.a.ba || 2052 !== b && 2053 !== b || a.sc(h);
        return a
    },
    fw: function(a) {
        return a.K(X.Oc) ? 2 : a.K(X.Nb) ? 3 : a.K(X.gc) ? 1 : 0
    }
};
var Ld;
Ld = function(a) {
    void 0 === a && (a = new w(0, 0));
    this.tb = a;
    this.Jb = new w(0, 0);
    this.xb = new w(0, 0);
    this.cp = 0
};
Ld.prototype = {
    type: function() {
        return X.Ob
    },
    clone: function() {
        var a = new Ld(this.tb);
        a.ph(this);
        return a
    },
    ph: function(a) {
        this.tb = a.tb;
        this.Jb = a.Jb;
        this.xb = a.xb
    },
    gq: function(a, b, c) {
        var d = a.info().scroll(),
            e = this.tb.ac(this.Jb);
        b === X.Mb && d.zA(this.tb);
        b = this.aw(this.xb, c, a);
        c.Gj() || a.na.Ay(e.c) ? (d.xA(this.Jb.c), d.nr(b.c)) : d.nr(0);
        c.Gj() || a.na.By(e.f) ? (d.yA(this.Jb.f), d.pr(b.f)) : d.pr(0);
        return a.jm()
    },
    aw: function(a, b, c) {
        c = c.na.size().scale(b.iz());
        b = new w(c.O * b.Lq(), c.Z * b.Lq());
        return new w(Math.max(-b.c,
            Math.min(b.c, a.c)), Math.max(-b.f, Math.min(b.f, a.f)))
    },
    zj: function() {
        return t.i("Pan: start({0}), overall move({1})", t.R(this.tb), t.R(this.Jb))
    },
    createEvent: function(a, b) {
        a = new n(2050, a, b.id(), 0);
        var c = p.b(8);
        var d = O.b(c, !0);
        d.B(b.info().scroll().ug.Yc());
        d.B(b.info().scroll().Fa.Yc());
        a.$a(c);
        return a
    },
    start: function() {
        return this.tb
    },
    Pm: function(a) {
        this.Jb = a.pe(this.tb)
    },
    pB: function(a, b) {
        var c = b - this.cp;
        1E-6 > c && (c = 1);
        this.cp = b;
        this.xb = a.qA(60 / c)
    }
};
var Md;
Md = function() {
    this.Nl = new w(0, 0);
    this.Kn = new w(0, 0);
    this.Gw = 1;
    this.Wi = this.aj = 0
};
Md.prototype = {
    type: function() {
        return X.ue
    },
    clone: function() {},
    zj: function() {
        return "SpreadPinch: "
    },
    gq: function(a, b) {
        var c = a.info().zoom(),
            d = a.info().scroll();
        b === X.Mb && c.Zf(this.Nl);
        c.Zf(this.Kn);
        c.Rj(this.Gw);
        c.YA(this.aj);
        c.setOrientation(this.Wi);
        d.ne(this.Kn.pe(this.Nl));
        b = a.jm();
        Z.Xf(b, Z.Xj) && this.Tv(a) && (b = Z.hA(b));
        return b
    },
    createEvent: function(a, b) {
        a = new n(2049, a, b.id(), 0);
        var c = b.info().zoom();
        b = p.b(16);
        var d = O.b(b, !0);
        d.B(c.Rb.Yc());
        d.B(c.md.Yc());
        d.B(65536 * c.Nd);
        var e = c.aj / 2 / Math.PI * 65536;
        c = c.orientation() / 2 / Math.PI * 65536;
        d.B(e | c << 16);
        a.$a(b);
        return a
    },
    Tv: function(a) {
        return 400 > a.info().scroll().Jy.rm(new w(0, 0))
    }
};
var Xd;
Xd = function() {};
Xd.prototype = {
    xh: function() {
        return X.fc
    },
    state: function() {
        return X.fc
    },
    Tj: function() {}
};
var Wd;
Wd = function() {
    this.ka = X.fc;
    this.Pl = 0;
    this.cb = this.Pb = this.Df = this.Ef = null;
    this.Md = -1
};
Wd.prototype = {
    xh: function(a, b, c) {
        var d = a.sf.vf;
        if (Y.ny(b, X.Nb)) this.ka === X.jg && (this.Pb = X.te, this.Md = X.uc, this.Kv(a, b)), this.ka = this.pt();
        else {
            var e = b.touches()[0].location();
            switch (this.ka) {
                case X.fc:
                    if (d.Yj) return X.fc;
                    d.dg ? (this.Pb = X.te, this.Md = X.uc, this.ka = X.Mb) : d.Kh || d.Fh ? (this.Pb = X.te, d.Kh && (this.Pb |= X.Oh), d.Fh && (this.Pb |= X.Nh), this.ka = X.jg) : (this.Pb = X.te, this.Md = X.uc, this.ka = X.Mb);
                    this.Fv(b);
                    break;
                case X.jg:
                    if (e = e.current().rm(e.uh()) > a.Ll.Mw)
                        if (this.Pb === X.Oh) this.Hi(b, X.Ob);
                        else if (this.Pb ===
                        X.Nh) this.Hi(b, X.ed);
                    else if (e = b.timeStamp() - this.Pl > a.Ll.Nw) this.Ul(b), this.Df.Nf < a.Ll.cv ? this.Hi(b, X.Ob) : this.Hi(b, X.ed);
                    break;
                default:
                    this.Ul(b), this.ka = X.lg
            }
        }
        if (this.ka >= X.kg) switch (c.Uj(this.Md), this.Md) {
            case X.Ob:
                c.data().ph(this.Ef);
                c.sc(this.cb);
                break;
            case X.ed:
                c.data().ph(this.Df);
                c.sc(this.cb);
                break;
            case X.Pc:
            case X.uc:
                Y.sm(c, b);
                break;
            default:
                throw Error("unexpected");
        }
        return this.ka
    },
    state: function() {
        return this.ka
    },
    Tj: function(a) {
        this.ka = a
    },
    Fv: function(a) {
        a = a.touches()[0];
        var b = a.location().current();
        this.Pl = t.b();
        this.Df = new Kd(b);
        this.Ef = new Ld(b);
        this.cb = a.Ha()
    },
    Hi: function(a, b) {
        this.Ul(a);
        this.Pb = X.te;
        this.Md = b;
        this.ka = X.Mb
    },
    Kv: function(a, b) {
        a.sz(b.touches()[0])
    },
    Ul: function(a) {
        var b = a.touches()[0].location().current();
        if (this.Md === X.Ob || this.Pb !== X.te) {
            var c = b.pe(this.Ef.start().ac(this.Ef.Jb));
            this.Ef.pB(c, a.timeStamp());
            this.Ef.Pm(b)
        }
        if (this.Md === X.ed || this.Pb !== X.te) c = this.Df.start().Ry(b), a = a.timeStamp() - this.Pl, 1E-6 > a && (a = 10), this.Df.setVelocity(c / a * 1E3), this.Df.Pm(b)
    },
    pt: function() {
        return this.ka ===
            X.fc ? X.fc : X.dd
    }
};
var jd;
jd = function(a, b, c) {
    this.Ua = a;
    this.na = b;
    this.jb = c;
    this.pd = new ce
};
jd.prototype = {
    id: function() {
        return this.Ua
    },
    flags: function() {
        return this.jb
    },
    nh: function(a) {
        this.jb |= a
    },
    K: function(a) {
        return (this.jb & a) === a
    },
    info: function() {
        return this.pd
    },
    Sf: function(a) {
        return a.c >= this.na.m && a.c <= this.na.T && a.f >= this.na.o && a.f <= this.na.X
    },
    Yi: function(a, b, c, d) {
        if (!Z.Xf(d, Z.Tm)) {
            var e = Math.abs(b.c - c.c);
            b = Math.abs(b.f - c.f);
            if (Z.Xf(a, Z.Um) && e > b || Z.Xf(a, Z.Vm) && b > e) d = Z.Zc(d, a)
        }
        return d
    },
    jm: function() {
        var a = Z.gk,
            b = this.pd.zoom(),
            c = this.pd.scroll(),
            d = b.Nd,
            e = c.Fa,
            f = this.vq();
        d < b.wa.Wb &&
            (a = Z.Zc(a, Z.ik), a = Z.Zc(a, Z.an));
        d > b.wa.Vb && (a = Z.Zc(a, Z.hk), a = Z.Zc(a, Z.$m));
        e.c < f.m && (a = Z.Zc(a, Z.eg), a = this.Yi(Z.Ym, e, c.wa.Wb, a));
        e.f < f.o && (a = Z.Zc(a, Z.fg), a = this.Yi(Z.Zm, e, c.wa.Wb, a));
        e.c > f.T && (a = Z.Zc(a, Z.cf), a = this.Yi(Z.Wm, e, c.wa.Vb, a));
        e.f > f.X && (a = Z.Zc(a, Z.df), a = this.Yi(Z.Xm, e, c.wa.Vb, a));
        return a
    },
    Tq: function(a) {
        var b = this.info().scroll(),
            c = b.wa;
        Z.K(a, Z.eg) && b.ne(new w(c.Wb.c, b.Fa.f));
        Z.K(a, Z.fg) && b.ne(new w(b.Fa.c, c.Wb.f));
        Z.K(a, Z.cf) && b.ne(new w(c.Vb.c, b.Fa.f));
        Z.K(a, Z.df) && b.ne(new w(b.Fa.c,
            c.Vb.f))
    },
    vq: function() {
        var a = this.na.vb().pe(this.pd.scroll().wa.Vb);
        var b = this.na.rc().pe(this.pd.scroll().wa.Wb);
        b = (new I(a.c, a.f, b.c, b.f)).b(this.pd.zoom().Rb, this.pd.zoom().Nd);
        a = this.na.vb().pe(b.vb());
        b = this.na.rc().pe(b.rc());
        b = new I(a.c, a.f, b.c, b.f);
        a = b.rc().min(this.pd.scroll().wa.Wb);
        b = b.vb().min(this.pd.scroll().wa.Vb);
        return new I(a.c, a.f, b.c, b.f)
    }
};
var R;
R = {
    gk: 0,
    nn: 1,
    Ns: 3,
    JB: 4,
    en: 8,
    qn: 16,
    wn: 32,
    Mh: 64,
    xs: 128,
    Nr: 256,
    MB: 512,
    Wj: 1024
};
var ce;
ce = function() {
    this.ey = new de;
    this.qx = new ee;
    new I(0, 0, 0, 0);
    this.ud = []
};
ce.prototype = {
    zoom: function() {
        return this.ey
    },
    scroll: function() {
        return this.qx
    },
    Fm: function(a) {
        return this.ud.length > a ? (a = this.ud[a], "undefined" !== typeof a ? a : null) : null
    },
    Gr: function(a, b) {
        this.ud[a] = b
    },
    uz: function(a) {
        for (var b = 0; b < this.ud.length; ++b)
            if ("undefined" === typeof this.ud[b] || null !== this.ud[b] && this.ud[b].zi === a) this.ud[b] = null
    }
};
var ee;
ee = function() {
    this.wa = new fe;
    this.ug = new w(0, 0);
    this.Fa = new w(0, 0);
    this.xb = new w(0, 0)
};
ee.prototype = {
    zA: function(a) {
        this.ug = a
    },
    Jy: function() {
        return this.Fa
    },
    ne: function(a) {
        this.Fa = a
    },
    xA: function(a) {
        this.Fa.c = a
    },
    yA: function(a) {
        this.Fa.f = a
    },
    nr: function(a) {
        this.xb.c = a
    },
    pr: function(a) {
        this.xb.f = a
    }
};
var de;
de = function() {
    this.wa = new ge;
    this.Rb = new w(0, 0);
    this.md = new w(0, 0);
    this.Nd = 1;
    this.Wi = this.aj = 0
};
de.prototype = {
    Zf: function(a) {
        this.Rb = a
    },
    Rj: function(a) {
        this.Nd = a
    },
    YA: function(a) {
        this.aj = a
    },
    orientation: function() {
        return this.Wi
    },
    setOrientation: function(a) {
        this.Wi = a
    }
};
var kd;
kd = function(a, b, c, d) {
    this.zi = a;
    this.ll = b;
    this.ml = c;
    this.ql = d
};
kd.prototype = {
    offset: function() {
        return this.ql
    }
};
var Sd;
Sd = function() {
    this.P = []
};
Sd.prototype = {
    Eq: function(a) {
        var b;
        switch (a.type()) {
            case X.ue:
                var c = R.Ns;
                break;
            case X.Ob:
                c = R.nn;
                break;
            case X.ed:
                c = R.en;
                break;
            case X.Pc:
                c = R.qn;
                break;
            default:
                c = 0
        }
        for (b = 0; b < this.P.length; ++b)
            if (this.P[b].K(c) && (a.type() === X.ue && this.P[b].Sf(a.data().Nl) || a.type() === X.Ob && this.P[b].Sf(a.data().start()) || a.type() === X.ed && this.P[b].Sf(a.data().start()) || a.type() === X.Pc && this.Bn(a.data().touches(), this.P[b]))) return this.P[b];
        return null
    },
    Zy: function(a, b) {
        var c;
        for (c = 0; c < this.P.length; ++c)
            if (this.P[c].K(R.qn) &&
                this.P[c].K(b) && this.Bn(a.touches(), this.P[c])) return this.P[c];
        return null
    },
    my: function(a, b) {
        var c, d, e = [];
        for (c = 0; c < this.P.length; ++c)
            for (d = 0; d < a.touches().length; ++d) e[d] || this.P[c].Sf(a.touches()[d].location().current()) && this.P[c].K(R.xs) && this.P[c].K(b) && (e[d] = !0);
        for (d = 0; d < a.touches().length; ++d)
            if (!0 !== e[d]) return !1;
        return !0
    },
    vy: function(a, b, c) {
        b[0] = !1;
        b[1] = !1;
        if (1 === a.touches().length) {
            var d = a.touches()[0].location().current();
            for (a = 0; a < this.P.length; ++a)
                if (this.P[a].Sf(d)) {
                    var e = !1;
                    this.P[a].K(R.nn) &&
                        this.P[a].K(c) && (e = b[0] = !0);
                    this.P[a].K(R.en) && this.P[a].K(c) && (e = b[1] = !0);
                    if (!e) break
                }
        }
    },
    clear: function() {
        this.P = []
    },
    cm: function(a) {
        this.P.unshift(a)
    },
    Fj: function(a) {
        return this.P.length > a ? this.P[a] : null
    },
    jz: function(a) {
        for (var b = 0; b < this.P.length; ++b)
            if (this.P[b].id() === a) return this.P[b];
        return null
    },
    vz: function(a) {
        for (var b = 0; b < this.P.length; ++b) this.P[b].info().uz(a)
    },
    Bn: function(a, b) {
        var c;
        for (c = 0; c < a.length; ++c)
            if (!b.Sf(a[c].location().current())) return !1;
        return !0
    }
};
var fe;
fe = function() {
    this.Wb = new w(0, 0);
    this.Vb = new w(0, 0)
};
fe.prototype = {
    Ar: function(a) {
        this.Wb = a
    },
    yr: function(a) {
        this.Vb = a
    }
};
var ge;
ge = function() {
    this.Vb = this.Wb = 0
};
ge.prototype = {
    Br: function(a) {
        this.Wb = a
    },
    zr: function(a) {
        this.Vb = a
    }
};
var he;
he = function() {};
he.prototype = {
    Jj: function() {},
    Kj: function() {},
    im: function() {},
    zm: function(a) {
        return a.info().scroll().ug.ac(a.info().scroll().Fa)
    }
};
var Ud;
Ud = function() {
    he.call(this)
};
Ud.prototype = Object.create(he.prototype);
Ud.prototype.constructor = Ud;
var Vd;
Vd = function(a, b) {
    he.call(this);
    b || (this.Gl = this.Zn(a.width, a.height), this.Qw = this.Xt())
};
Vd.prototype = Object.create(he.prototype);
k = Vd.prototype;
k.constructor = Vd;
k.Jj = function(a, b) {
    var c = a.he();
    c.save();
    a.a.W.a.D.zf ? null !== b.info().Fm(0) && this.Kj(a, b) : (this.Kw(c, b), this.Lw(c, b));
    c.restore()
};
k.Kw = function(a, b) {
    var c = b.na.m,
        d = b.na.o,
        e = b.na.w() + 1;
    b = b.na.v() + 1;
    a.fillStyle = this.Qw;
    a.fillRect(c, d, e, b)
};
k.Lw = function(a, b) {
    var c = b.na.m,
        d = b.na.o,
        e = b.na.w() + 1,
        f = b.na.v() + 1;
    a.beginPath();
    a.rect(c, d, e, f);
    a.clip();
    this.Qp(a, b, null);
    a.drawImage(this.Gl, c, d, e, f, c, d, e, f)
};
k.Kj = function(a, b) {
    var c = a.he();
    var d = b.na.m;
    var e = b.na.o;
    var f = b.na.w() + 1;
    var g = b.na.v() + 1;
    c.beginPath();
    c.rect(d, e, f, g);
    c.clip();
    for (e = 0; e < b.info().ud.length; ++e) d = b.info().Fm(e), null !== d && (f = a.Cc.Nj(d.zi), f = f.ei.canvas, c.save(), this.Qp(c, b, d), c.drawImage(f, 0, 0), c.restore())
};
k.Qp = function(a, b, c) {
    a.translate(b.info().zoom().Rb.c, b.info().zoom().Rb.f);
    a.scale(b.info().zoom().Nd, b.info().zoom().Nd);
    a.translate(-b.info().zoom().Rb.c, -b.info().zoom().Rb.f);
    a.translate(null !== c && c.ll ? 0 : b.info().scroll().Fa.c, null !== c && c.ml ? 0 : b.info().scroll().Fa.f);
    null !== c && a.translate(b.na.m - c.offset().c, b.na.o - c.offset().f)
};
k.im = function(a, b) {
    var c = this.Gl.getContext("2d");
    c.drawImage(a.Ea.canvas, b.m, b.o, b.w(), b.v(), b.m, b.o, b.w(), b.v());
    c.drawImage(a.Y.canvas, b.m, b.o, b.w(), b.v(), b.m, b.o, b.w(), b.v())
};
k.Zn = function(a, b) {
    var c = window.document.createElement("canvas");
    c.width = a;
    c.height = b;
    return c
};
k.Xt = function() {
    var a = this.Zn(8, 8),
        b = a.getContext("2d");
    b.fillStyle = "#fff";
    b.fillRect(0, 0, a.width, a.height);
    b.UB = "#000";
    b.lineWidth = 1;
    b.beginPath();
    b.moveTo(b.lineWidth / 2, a.height);
    b.lineTo(b.lineWidth / 2, b.lineWidth / 2);
    b.lineTo(a.width, b.lineWidth / 2);
    b.stroke();
    b.closePath();
    return this.Gl.getContext("2d").createPattern(a, "repeat")
};
k.zm = function(a) {
    return a.info().scroll().ug.ac(a.info().scroll().Fa)
};
var Sa, ie;
ie = function() {
    this.bj = -1;
    this.vc = !1
};
Sa = function(a) {
    this.a = a;
    this.Wg = this.vc = this.Cf = !1;
    this.bp = this.$o = this.hl = 0;
    this.Ud = null;
    this.ol = !1;
    this.vd = []
};
Sa.prototype = {
    eB: function(a) {
        this.Cf || this.Jv();
        this.vc && (1 > a || a > m.kn ? y.warn("Cannot benchmark with invalid type: " + a) : (this.vd[a].vc = !0, this.vd[a].bj = t.Lb()))
    },
    Xy: function(a, b) {
        if (this.vc && !a && (a = t.Lb(), b == m.dk && (this.bp = a - this.$o, this.$o = a), this.Wg)) {
            this.ol && this.vd[m.cg].vc && (this.hl = a - this.vd[m.cg].bj, this.rp(this.hl, m.cg), this.ol = !1);
            var c = this.vd[b];
            c.vc && this.rp(a - c.bj, b)
        }
    },
    Wq: function(a) {
        this.vc && (this.Ud = q.Dd(a), this.Kp())
    },
    kB: function(a) {
        this.vc && (this.Ud = a, this.Kp())
    },
    Mj: function(a) {
        !this.vc ||
            null === this.Ud || this.Ud.c < a.m || this.Ud.c > a.T || this.Ud.f < a.o || this.Ud.f > a.X || (this.Ud = null, this.ol = !0)
    },
    Ez: function() {
        return Math.round(this.hl / 1E3)
    },
    Fz: function() {
        return Math.round(this.bp / 1E3)
    },
    rp: function(a, b) {
        a = new n(2097152, this.a.s.L, b, a & 4294967295);
        a.WA();
        this.a.$b(a)
    },
    Jv: function() {
        var a = this.a.getConfiguration();
        this.vc = a.Benchmarking || a.DebugOnlyDiagnosisDisplay;
        this.Wg = a.Benchmarking;
        this.vd.push(null);
        for (a = 1; a <= m.kn; a++) this.vd.push(new ie);
        this.Cf = !0
    },
    Kp: function() {
        this.vd[m.cg].vc = !0;
        this.vd[m.cg].bj = t.Lb()
    }
};
var da;
(function() {
    function a(b) {
        if (0 > b) throw "Only non negative values supported";
        if (4294967296 <= b) throw "Only values occupiing less than 32-Bit supported";
    }
    da = function(b) {
        if (void 0 !== b)
            if ("number" == typeof b) a(b), this.kb = b, this.zb = 0;
            else if (b instanceof da) this.kb = b.kb, this.zb = b.zb;
        else throw "Unexpected initial value";
        else this.zb = this.kb = 0
    };
    da.prototype = {
        ck: function(b) {
            if (0 > b || 64 <= b) throw "Unexpected shift amount";
            if (32 < b) this.ck(32), this.ck(b - 32);
            else if (32 === b) this.zb = this.kb, this.kb = 0;
            else {
                var c = this.Ut(b);
                var d = (c & this.kb) >>> 0;
                this.zb = this.zb << b >>> 0;
                this.zb = (this.zb | d >>> 32 - b) >>> 0;
                this.kb &= ~c;
                this.kb = this.kb << b >>> 0
            }
        },
        ln: function(b) {
            if ("number" == typeof b) a(b), this.ln(new da(b));
            else if (b instanceof da) this.kb = (this.kb | b.kb) >>> 0, this.zb = (this.zb | b.zb) >>> 0;
            else throw "Unexpected argument";
        },
        Ut: function(b) {
            var c, d = 0;
            if (0 === b) return 0;
            for (c = 0; c < b - 1; ++c) d = (d | 2147483648) >>> 0, d >>>= 1;
            return (d | 2147483648) >>> 0
        },
        toString: function() {
            return this.zb + " " + this.kb
        }
    }
})();
var ta;
ta = function() {
    this.clear()
};
ta.prototype = {
    clear: function() {
        this.P = []
    },
    cm: function(a) {
        this.P.push(a)
    },
    eq: function(a) {
        a.beginPath();
        for (var b = 0; b < this.P.length; ++b) a.rect(this.P[b].m, this.P[b].o, this.P[b].w(), this.P[b].v());
        a.clip()
    }
};
var Mb;
Mb = function(a, b) {
    this.A = a;
    this.b = b;
    this.Hn = [];
    this.eo = [];
    b = this.R(this.A);
    for (a = 0; a < this.b; ++a) {
        var c = Math.floor(b.La + (a + 1) * (128 - Math.floor(b.La / 2)) / this.b);
        this.Hn[this.b - a - 1] = this.i(b.Fb, b.zh, c, b.Wp);
        c = Math.floor(Math.floor(b.La / 3) + Math.floor(2 * a * b.La / (3 * this.b)));
        this.eo[a] = this.i(b.Fb, b.zh, c, b.Wp)
    }
};
Mb.prototype = {
    az: function(a) {
        return this.Hn[a]
    },
    Jq: function(a) {
        return this.eo[a]
    },
    R: function(a) {
        var b = {};
        var c = ((a & 16711680) >> 16) / 255;
        var d = ((a & 65280) >> 8) / 255;
        var e = (a & 255) / 255;
        var f = Math.min(c, Math.min(d, e));
        var g = Math.max(c, Math.max(d, e));
        var h = g - f;
        b.La = (f + g) / 2;
        if (0 === h) b.Fb = b.zh = 0;
        else {
            b.zh = .5 > b.La ? h / (g + f) : h / (2 - g - f);
            f = ((g - c) / 6 + h / 2) / h;
            var l = ((g - d) / 6 + h / 2) / h;
            h = ((g - e) / 6 + h / 2) / h;
            c === g ? b.Fb = h - l : d === g ? b.Fb = 1 / 3 + f - h : e === g && (b.Fb = 2 / 3 + l - f);
            0 > b.Fb && (b.Fb += 1);
            1 < b.Fb && --b.Fb
        }
        b.Fb = Math.round(255 * b.Fb);
        b.zh = Math.round(255 *
            b.zh);
        b.La = Math.round(255 * b.La);
        b.Wp = Math.round(((a & 4278190080) >> 24) / 255 * 255);
        return b
    },
    i: function(a, b, c, d) {
        var e;
        if (0 === b) c = e = a = c;
        else {
            a /= 255;
            b /= 255;
            c /= 255;
            b = .5 > c ? c * (1 + b) : c + b - c * b;
            var f = 2 * c - b;
            c = Math.round(255 * this.Vk(f, b, a + 1 / 3));
            e = Math.round(255 * this.Vk(f, b, a));
            a = Math.round(255 * this.Vk(f, b, a - 1 / 3))
        }
        return (d << 24) + (c << 16) + (e << 8) + a
    },
    Vk: function(a, b, c) {
        0 > c && (c += 1);
        1 < c && --c;
        return 1 > 6 * c ? a + 6 * (b - a) * c : 1 > 2 * c ? b : 2 > 3 * c ? a + (b - a) * (2 / 3 - c) * 6 : a
    }
};
var Ca;
Ca = function() {};
Ca.prototype = {
    b: function(a, b) {
        this.xx(a, b, 90)
    },
    i: function(a) {
        return (a = this.mv(a)) && "" !== a
    },
    xx: function(a, b, c) {
        var d = new Date;
        d.setTime(d.getTime() + 864E5 * c);
        document.cookie = a + "=" + b + "; expires=" + d.toUTCString()
    },
    mv: function(a) {
        a += "=";
        var b, c;
        var d = document.cookie.split(";");
        for (b = 0; b < d.length; b++) {
            for (c = d[b];
                " " == c.charAt(0);) c = c.substring(1);
            if (-1 !== c.indexOf(a)) return c.substring(a.length, c.length)
        }
        return ""
    }
};
var rd;
rd = function() {};
rd.i = function(a) {
    a = window.atob(a.substring(a.indexOf("-----BEGIN PUBLIC KEY-----") + 26, a.indexOf("-----END PUBLIC KEY-----")));
    a = t.mg(a);
    return window.crypto.subtle.importKey("spki", a, {
        name: "RSA-OAEP",
        hash: "SHA-256"
    }, !0, ["encrypt"])
};
rd.b = function(a, b) {
    return window.crypto.subtle.encrypt({
        name: "RSA-OAEP",
        hash: {
            name: "SHA-256"
        }
    }, a, b)
};
var za;
za = function(a) {
    this.a = a;
    this.wb = []
};
za.prototype = {
    yj: function(a) {
        if (null !== this.a.getConfiguration() && this.a.getConfiguration().DebugOnlyDiagnosisDisplay) {
            this.$s();
            var b = 13 * this.wb.length + 3;
            a.save();
            a.strokeStyle = "rgb(0,0,0)";
            a.fillStyle = "rgb(220,220,220)";
            a.font = "10px Arial";
            a.beginPath();
            a.rect(10, 10, 150, b);
            a.clip();
            a.fillRect(10, 10, 150, b);
            a.strokeRect(10, 10, 150, b);
            a.fillStyle = "rgb(0,0,0)";
            a.textAlign = "left";
            a.textBaseline = "top";
            for (b = 0; b < this.wb.length; ++b) {
                var c = t.i("{0}: {1}", this.wb[b].title, this.wb[b].We());
                a.fillText(c, 13,
                    13 + 13 * b)
            }
            a.restore()
        }
    },
    $s: function() {
        if (0 === this.wb.length) {
            var a = this.a.Lf,
                b = this.a.Da(),
                c = this;
            this.wb.push({
                title: "DPR",
                We: function() {
                    return b.Pq() ? t.i("{0} (Changed)", q.pa()) : q.pa()
                }
            });
            this.wb.push({
                title: "Canvas-Size",
                We: function() {
                    return t.i("{0}/{1}", b.fe().w(), b.fe().v())
                }
            });
            this.wb.push({
                title: "Resize-Count",
                We: function() {
                    return null !== a ? a.lp : "---"
                }
            });
            this.wb.push({
                title: "Window-Size",
                We: function() {
                    return t.i("{0}/{1}", window.innerWidth, window.innerHeight)
                }
            });
            this.wb.push({
                title: "DocElem-Size",
                We: function() {
                    return t.i("{0}/{1}", document.documentElement.clientWidth, document.documentElement.clientHeight)
                }
            });
            this.wb.push({
                title: "Last Input Reaction (*)",
                We: function() {
                    return t.i("{0}", c.a.wc.Ez())
                }
            });
            this.wb.push({
                title: "FPS (*)",
                We: function() {
                    return (1E3 / c.a.wc.Fz()).toFixed(1)
                }
            })
        }
    }
};
var Ma;
Ma = function(a) {
    this.a = a;
    this.Hb = null;
    this.tk = this.kj = !1;
    this.sg = this.wg = null;
    this.sb = []
};
Ma.prototype = {
    vj: function(a) {
        (t.$c(a) || t.pa(a) && "touch" === a.pointerType || t.Bd(a)) && this.xm() && this.km(this.a.getConfiguration().CommitEditcontrolOnClickOut)
    },
    xm: function() {
        return null !== this.Hb
    },
    open: function(a, b, c) {
        this.Hb = a;
        this.kj = b;
        this.Ps();
        c.a.ba ? (this.sg = c.a.U().ma(), this.sg.qr(this.Hb)) : (this.wg = c.Ea.canvas.parentNode, this.wg.appendChild(this.Hb))
    },
    close: function() {
        null !== this.Hb && (null !== this.wg && this.wg.removeChild(this.Hb), null !== this.sg && this.sg.qr(null), this.Zg());
        this.sg = this.wg = this.Hb =
            null
    },
    km: function(a) {
        if (!this.tk) {
            var b = t.Dd(this.Hb);
            var c = this.Hb.value.length + 1;
            this.kj && (c *= 2);
            var d = p.b(c);
            O.b(d, this.a.s.Ja, this.a.sh()).Eb(this.Hb.value, this.kj);
            c = new n(512, this.a.s.L, a ? this.kj ? 3 : 1 : 2, 0);
            c.$a(d);
            c.Dr(b.Rq(4));
            this.a.Sa.push(c);
            a ? this.tk = !0 : this.close()
        }
    },
    nA: function() {
        this.tk = !1
    },
    Hu: function(a) {
        null !== this.Hb && (a.stopPropagation(), 27 === a.keyCode ? (a.preventDefault(), this.km(!1)) : 13 === a.keyCode && this.km(!0))
    },
    Gu: function(a) {
        a.stopPropagation()
    },
    Ju: function(a) {
        a.stopPropagation()
    },
    Iu: function(a) {
        a.stopPropagation()
    },
    Ps: function() {
        var a = this,
            b;
        this.sb.push({
            e: "keydown",
            La: function(c) {
                a.Hu(c)
            }
        });
        this.sb.push({
            e: "keyup",
            La: function(c) {
                a.Ju(c)
            }
        });
        this.sb.push({
            e: "focus",
            La: function(c) {
                a.Gu(c)
            }
        });
        this.sb.push({
            e: "keypress",
            La: function(c) {
                a.Iu(c)
            }
        });
        for (b = 0; b < this.sb.length; ++b) this.Hb.addEventListener(this.sb[b].e, this.sb[b].La)
    },
    Zg: function() {
        var a;
        for (a = 0; a < this.sb.length; ++a) this.Hb.removeEventListener(this.sb[a].e, this.sb[a].La);
        this.sb = []
    }
};
var Ua;
Ua = function(a) {
    this.yk = a.ya();
    this.rf = a.sh()
};
Ua.prototype = {};
var jb;
jb = function(a) {
    void 0 === a && (a = null);
    this.Ui = a
};
jb.prototype = {
    at: function() {
        if (null === this.Ui) try {
            this.Ui = (new Configuration).sh()
        } catch (a) {
            this.Ui = {
                encode: function() {
                    return 63
                }
            }
        }
    },
    yq: function(a) {
        this.at();
        a = this.Ui.encode(String.fromCharCode(a));
        return 1 === a.length ? a[0] : 63
    }
};
var eb;
eb = function(a, b) {
    this.ci = a;
    this.$t = t.b();
    this.gw = null !== b ? b.ConnectionInfoValidTimeMsForLeaveAfterError : 1E3
};
eb.prototype = {
    gB: function() {
        return t.b() - this.$t < this.gw
    }
};
var je;
je = function() {
    this.Ta = []
};
je.prototype = {
    us: function(a) {
        this.Ta.push(a)
    },
    gn: function(a) {
        this.Ta.forEach(a)
    },
    ys: function(a) {
        0 <= a && this.Ta.splice(a, 1)
    },
    Is: function(a) {
        this.gn(function(b) {
            b.update && b.update(a)
        })
    },
    Sr: function(a) {
        a.Oe && this.gn(function(b) {
            a.Oe(b)
        })
    }
};
var ka;
ka = function(a) {
    try {
        this.b(a)
    } catch (b) {
        throw Error("Parsing the fontstring '" + a + "' failed for the following reason: " + b);
    }
};
ka.prototype = {
    b: function(a) {
        var b = null,
            c = null,
            d, e = !1,
            f = a.split(/\s+/);
        for (d = 0; d < f.length; ++d) {
            var g = f[d];
            switch (g) {
                case "normal":
                    break;
                case "italic":
                case "oblique":
                    break;
                case "small-caps":
                    break;
                case "bold":
                case "bolder":
                case "lighter":
                case "100":
                case "200":
                case "300":
                case "400":
                case "500":
                case "600":
                case "700":
                case "800":
                case "900":
                    break;
                default:
                    null === c ? (g = g.split("/"), g = t.Ia(g[0]), "p" === g.charAt(g.length - 2) && "x" === g.charAt(g.length - 1) && (c = parseInt(g.substr(0, g.length - 2), 10))) : (b = g, d < f.length - 1 &&
                        (b += " " + f.slice(d + 1).join(" ")), e = !0)
            }
            if (e) break
        }
        if (null === b) throw Error("Font Family/Name missing");
        if (null === c || isNaN(c)) throw Error("Invalid or unsupported font Size");
        this.Xr = c;
        this.fn = a
    }
};
var Pa;
Pa = function() {
    je.call(this)
};
Pa.prototype = Object.create(je.prototype);
k = Pa.prototype;
k.constructor = Pa;
k.Eh = function(a) {
    for (var b = 0; b < this.Ta.length; b++)
        if (this.Ta[b].id() === a) return b;
    return -1
};
k.Os = function(a, b) {
    a = this.Eh(a);
    if (0 <= a) {
        var c = this.Ta[a];
        this.Ta[a] = b;
        b.location().xr(c.location().current());
        b.Im(c.Jg)
    }
};
k.hn = function(a) {
    a = this.Eh(a);
    return 0 <= a ? this.Ta[a] : null
};
k.Js = function(a) {
    null !== a && a.id && this.Os(a.id(), a)
};
k.zs = function(a) {
    a = this.Eh(a);
    this.ys(a)
};
k.mn = function(a) {
    null !== a && a.id && this.zs(a.id())
};
var w;
w = function(a, b) {
    this.c = a;
    this.f = b
};
w.prototype = {
    Nm: function(a) {
        this.c -= a.c;
        this.f -= a.f;
        return this
    },
    pe: function(a) {
        return this.clone().Nm(a)
    },
    min: function(a) {
        return new w(Math.min(this.c, a.c), Math.min(this.f, a.f))
    },
    max: function(a) {
        return new w(Math.max(this.c, a.c), Math.max(this.f, a.f))
    },
    offset: function(a) {
        this.c += a.c;
        this.f += a.f;
        return this
    },
    ac: function(a) {
        return this.clone().offset(a)
    },
    Rz: function(a) {
        this.c += a.O;
        this.f += a.Z;
        return this
    },
    Zq: function(a) {
        return this.clone().Rz(a)
    },
    Yc: function() {
        return (this.f >>> 0 & 65535 | this.c >>> 0 << 16) >>>
            0
    },
    Ry: function(a) {
        return Math.sqrt(this.rm(a))
    },
    rm: function(a) {
        return (this.c - a.c) * (this.c - a.c) + (this.f - a.f) * (this.f - a.f)
    },
    clone: function() {
        return new w(this.c, this.f)
    },
    kr: function(a) {
        this.c *= a;
        this.f *= a;
        return this
    },
    qA: function(a) {
        return this.clone().kr(a)
    },
    rotate: function(a, b) {
        if (0 === a % 360) return this;
        var c = a * Math.PI / 180;
        a = Math.cos(c);
        c = Math.sin(c);
        var d = this.c,
            e = this.f;
        if (b) {
            var f = b.c;
            b = b.f
        } else f = b = 0;
        this.c = d * a - e * c + f * (1 - a) + b * c;
        this.f = d * c + e * a + b * (1 - a) - f * c;
        return this
    }
};
var I;
I = function(a, b, c, d, e) {
    this.m = a;
    this.o = b;
    this.T = c;
    this.X = d;
    this.ec = void 0 !== e ? e : null
};
I.prototype = {
    w: function() {
        return this.T - this.m
    },
    v: function() {
        return this.X - this.o
    },
    qh: function() {
        return new w((this.m + this.T) / 2, (this.o + this.X) / 2)
    },
    clone: function() {
        return new I(this.m, this.o, this.T, this.X, this.ec)
    },
    vb: function() {
        return new w(this.m, this.o)
    },
    rc: function() {
        return new w(this.T, this.X)
    },
    b: function(a, b) {
        var c = this.size().scale(b),
            d = this.vb().Nm(a);
        b = (new A(d.c, d.f)).scale(b);
        a = a.Zq(b);
        c = a.Zq(c);
        return new I(a.c, a.f, c.c, c.f)
    },
    size: function() {
        return new A(this.w(), this.v())
    },
    ac: function(a,
        b) {
        return new I(this.m + a, this.o + b, this.T + a, this.X + b, this.ec)
    },
    Rq: function(a) {
        return new I(this.m - a, this.o - a, this.T + a, this.X + a, this.ec)
    },
    Yy: function(a) {
        return this.m === a.m && this.o === a.o && this.T === a.T && this.X === a.X
    },
    normalize: function() {
        if (this.m > this.T) {
            var a = this.T;
            this.T = this.m;
            this.m = a
        }
        this.o > this.X && (a = this.X, this.X = this.o, this.o = a)
    },
    Mz: function() {
        var a = this.clone();
        a.normalize();
        return a
    },
    Ay: function(a) {
        return a >= this.m && a <= this.T
    },
    By: function(a) {
        return a >= this.o && a <= this.X
    }
};
var db;
db = function(a) {
    this.a = a;
    this.qg = null;
    this.oo = !1;
    this.lp = 0;
    this.mp = q.pa()
};
db.prototype = {
    py: function() {
        var a = this;
        this.qg = function() {
            a.Dw()
        };
        window.addEventListener("resize", this.qg, !1)
    },
    detach: function() {
        null !== this.qg && (window.removeEventListener("resize", this.qg, !1), this.qg = null)
    },
    Dw: function() {
        var a = q.pa(),
            b = this.oo ? a : 1;
        a !== this.mp && (this.oo = !0, this.mp = b = a, this.a.Da().Pz());
        this.lp++;
        this.a.Da().Dq(b);
        null !== this.s && null !== this.ob && (a = n.R(this.a.s.L, this.a.getConfiguration().BestFit, this.a.getConfiguration().BestFitForDialogs, this.a.getConfiguration().ScaleTypeIsotropic,
            this.a.Da().fe(), this.a.Da().Ak), this.a.CA(a))
    }
};
var A;
A = function(a, b) {
    this.O = a;
    this.Z = b
};
A.prototype = {
    scale: function(a) {
        return new A(this.O * a, this.Z * a)
    }
};
var Wa;
Wa = function(a, b, c, d) {
    this.ea = a;
    this.Tc = b;
    this.Tc.clear();
    this.Yv = t.b();
    this.Dx = t.b();
    this.cu = d;
    this.Ib = null;
    if (c) this.b();
    else {
        var e = this,
            f = function() {
                e.i();
                e.gb = window.requestAnimationFrame(f)
            };
        this.gb = window.requestAnimationFrame(f)
    }
};
Wa.prototype = {
    close: function() {
        this.Tc.clear();
        window.cancelAnimationFrame(this.gb)
    },
    i: function() {
        if (!(t.b() - this.Dx < this.cu)) {
            var a = this.Tc.he(),
                b = this.Tc.fe(),
                c = 2 * Math.PI / 6,
                d = (2 * Math.PI - 5 * c) / 5,
                e = 250 / 3,
                f = 10 + e,
                g = 2 * Math.PI * (t.b() - this.Yv) / 5E3,
                h = 1;
            a.save();
            if (250 > b.w() || 250 > b.v()) h = .9 * Math.min(b.w() / 250, b.v() / 250);
            a.scale(h, h);
            a.translate(Math.max(5, (b.w() - 250) / 2), Math.max(5, (b.v() - 250) / 2));
            a.strokeStyle = "#a90018";
            a.lineWidth = 4;
            a.strokeRect(0, 0, 250, 250);
            a.fillStyle = "#f4f4f4";
            a.fillRect(0, 0, 250, 250);
            for (b = 0; 5 > b; ++b) a.save(), a.translate(125, f), a.rotate(g + b * (c + d)), this.Au(a, c, e, "#cd001c"), a.restore();
            null === this.Ib && this.fu(a, 250);
            a.font = this.Ib;
            a.textAlign = "center";
            a.textBaseline = "bottom";
            a.fillStyle = "#000000";
            a.fillText(this.ea, 125, 2750 / 12);
            a.restore()
        }
    },
    fu: function(a, b) {
        var c = 40;
        for (a.font = this.Ho(c); 2 < c && a.measureText(this.ea).width >= .95 * b;) c -= 2, a.font = this.Ho(c);
        this.Ib = a.font
    },
    Ho: function(a) {
        return "italic " + a + "px Arial"
    },
    Au: function(a, b, c, d) {
        var e = .9 * c;
        a.beginPath();
        a.moveTo(0, -c);
        a.arc(0,
            0, c, -Math.PI / 2, b - Math.PI / 2, !1);
        a.lineTo(Math.sin(b) * e, -(Math.cos(b) * e));
        a.arc(0, 0, e, b - Math.PI / 2, -Math.PI / 2, !0);
        a.lineTo(0, -c);
        a.closePath();
        a.strokeStyle = d;
        a.fillStyle = a.strokeStyle;
        a.stroke();
        a.fill()
    },
    b: function() {
        var a = this.Tc.Y;
        a.font = "1em Arial";
        a.textAlign = "left";
        a.textBaseline = "top";
        a.fillStyle = "#000";
        a.fillText(this.ea, 20, 20)
    }
};
var xa;
xa = function(a) {
    this.Tc = a;
    this.dh = []
};
xa.prototype = {
    clear: function() {
        this.dh = []
    },
    count: function() {
        return this.dh.length
    },
    w: function(a) {
        return this.dh[a].c
    },
    v: function(a) {
        return this.dh[a].f
    },
    Yp: function(a, b, c) {
        a = G.Qr(this.Tc, a, b, c);
        this.dh.push(a)
    }
};
var ya;
ya = function(a) {
    this.Tc = a;
    this.Gf = []
};
ya.prototype = {
    clear: function() {
        this.Gf = []
    },
    count: function() {
        return this.Gf.length
    },
    lz: function(a) {
        return this.Gf[a]
    },
    jy: function(a) {
        this.Gf.push(a.length + 1);
        var b;
        for (b = 1; b <= a.length; b++) {
            var c = G.Ia(this.Tc.getContext(), a.substring(0, b), !0);
            this.Gf.push(c)
        }
        a = t.A(this.Tc);
        this.Gf.push(a)
    }
};
var id;
id = function() {
    this.gp = this.hp = this.ip = this.jp = this.ro = this.so = this.Ka = null
};
id.b = function(a, b, c, d, e, f) {
    var g = new id;
    g.gp = a;
    g.hp = b;
    g.ip = c;
    g.jp = d;
    g.ro = e;
    g.so = f;
    return g
};
id.prototype = {
    rj: function(a, b) {
        null !== this.Ka ? this.mx(a, b) : this.Ys(a)
    },
    mx: function(a, b) {
        a.translate(b.m, b.o);
        a.rotate(this.Ka);
        a.translate(-b.m, -b.o)
    },
    Ys: function(a) {
        a.transform(this.gp, this.hp, this.ip, this.jp, this.ro, this.so)
    }
};
var C;
C = {
    Qa: function(a) {
        if (null !== a) {
            if ("false" === a.toLowerCase()) return !1;
            if ("true" === a.toLowerCase()) return !0
        }
        return null
    },
    As: function() {
        var a = {};
        location.search.substr(1).split("&").forEach(function(b) {
            b = b.split("=");
            a[b[0]] = b[1]
        });
        return a
    },
    Ih: function(a, b) {
        return void 0 === a[b] ? null : a[b]
    },
    gs: function(a) {
        a = (new RegExp("[\\?&]" + a + "=([^&#]*)")).exec(window.location.href);
        return null === a ? null : a[1]
    },
    jn: function(a, b, c) {
        return null !== C.Ih(a, b) ? C.Qa(a[b]) : c
    },
    Zr: function(a, b) {
        var c = window.WebvisuInst;
        a = void 0 ===
            c ? C.gs(a) : C.Ih(c.jh, a);
        return null !== a ? C.Qa(a) : b
    }
};
var t;
t = function() {};
t.Bj = function() {
    var a = window.performance || {};
    a.now = function() {
        return a.now || a.webkitNow || a.i || a.A || a.b || function() {
            return (new Date).getTime()
        }
    }();
    return a.now()
};
t.bf = function(a) {
    var b = window.location;
    var c = b.pathname.lastIndexOf("/"); - 1 !== c && (a = b.pathname.substr(0, c + 1) + a, "/" === a[0] && (a = a.substr(1)));
    return b.protocol + "//" + b.host + "/" + a
};
t.sj = function(a) {
    var b = 3,
        c = 5,
        d = 16,
        e;
    void 0 === a && (a = "");
    void 0 === b && (b = 0);
    void 0 === c && (c = 0);
    void 0 === d && (d = 0);
    void 0 === e && (e = 0);
    a = a.split(".");
    c = [b, c, d, e];
    if (4 !== a.length) return !1;
    for (b = 0; 3 >= b; b++)
        if (d = parseInt(a[b], 10), isNaN(d) || d < c[b]) return !1;
    return !0
};
t.b = function() {
    return (new Date).getTime()
};
t.mg = function(a) {
    if (null === a || void 0 === a) return new ArrayBuffer(0);
    var b = new ArrayBuffer(a.length),
        c = new Uint8Array(b),
        d;
    var e = 0;
    for (d = a.length; e < d; e++) c[e] = a.charCodeAt(e);
    return b
};
t.Lb = function() {
    return 1E3 * t.Bj()
};
t.Qh = function(a, b) {
    var c = a;
    var d = a.indexOf("px"); - 1 !== d && (c = a.slice(0, d), d = c.lastIndexOf(" "), d = -1 !== d ? c.slice(d, c.length) : c, c = a.replace(d, b));
    return c
};
t.A = function(a) {
    return t.Mc(a.getState().Bg)
};
t.Mc = function(a) {
    return 1.15 * a
};
t.Dd = function(a) {
    var b = 0,
        c = 0,
        d = a;
    do b += d.offsetLeft, c += d.offsetTop; while (null !== (d = d.offsetParent));
    return new I(b, c, b + a.offsetWidth, c + a.offsetHeight)
};
t.Cd = function(a, b) {
    var c;
    b instanceof I ? c = new w(b.m, b.o) : c = b;
    a.style.position = "absolute";
    a.style.left = Math.floor(c.c) + "px";
    a.style.top = Math.floor(c.f) + "px";
    b instanceof I && (a.style.width = Math.floor(b.w()) + "px", a.style.height = Math.floor(b.v()) + "px")
};
t.i = function(a) {
    var b = arguments;
    if (0 === b.length) return "";
    var c = b[0];
    for (b = 1; b < arguments.length; b++) {
        var d = new RegExp("\\{" + (b - 1) + "\\}", "gi");
        c = c.replace(d, arguments[b])
    }
    return c
};
t.xj = function(a) {
    return t.i("{0}/{1} {2}/{3}", a.m, a.o, a.T, a.X)
};
t.R = function(a) {
    return t.i("{0}/{1}", a.c, a.f)
};
t.Ch = function(a) {
    var b = 0,
        c;
    for (c in a) a.hasOwnProperty(c) && b++;
    return b
};
t.Ia = function(a) {
    return a.replace(/^\s\s*/, "").replace(/\s\s*$/, "")
};
t.Ye = function(a, b) {
    var c = window.document.createElement("canvas");
    c.width = a;
    c.height = b;
    return c
};
t.hg = function(a) {
    return 0 < a ? Math.floor(a) : Math.ceil(a)
};
t.ad = function(a) {
    return 3 <= a.length && "SVG" === a.substring(a.length - 3).toUpperCase()
};
t.Aj = function(a) {
    var b = a.pageX;
    a = a.pageY;
    var c = t.ng(t.ab());
    return new w(b - c.c, a - c.f)
};
t.ng = function(a) {
    a = a.getBoundingClientRect();
    return new w(a.left + (void 0 !== window.pageXOffset ? window.pageXOffset : (document.documentElement || document.body.parentNode || document.body).scrollLeft), a.top + (void 0 !== window.pageYOffset ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop))
};
t.tj = function(a, b) {
    a = a.getBoundingClientRect();
    b = b.getBoundingClientRect();
    return new w(b.left - a.left, b.top - a.top)
};
t.$e = function(a) {
    var b = p.b(4),
        c = O.b(b, !0);
    c.Db(a.c);
    c.Db(a.f);
    return b
};
t.lb = function(a, b) {
    var c = 0,
        d = 0;
    null !== a && ("" !== a.style.paddingLeft && (c = parseInt(a.style.paddingLeft, 10)), "" !== a.style.paddingTop && (d = parseInt(a.style.paddingTop, 10)));
    for (; null !== a && a !== b;) {
        var e = 0;
        void 0 !== a.style && "" !== a.style.borderWidth && (e = parseInt(a.style.borderWidth, 10));
        a.offsetLeft && (c += a.offsetLeft + e);
        a.offsetTop && (d += a.offsetTop + e);
        a = a.parentNode
    }
    return new w(c, d)
};
t.Sh = function(a, b) {
    var c = 0,
        d = 0;
    null !== a && a.style && ("" !== a.style.paddingLeft && (c = parseInt(a.style.paddingLeft, 10)), "" !== a.style.paddingTop && (d = parseInt(a.style.paddingTop, 10)));
    return new w(b.c - c, b.f - d)
};
t.ab = function() {
    return document.getElementById("cdsRoot")
};
t.Rh = function(a, b) {
    a.a.ba && (a.a.ai.yh(), a.a.kc.yh(), a.a.kc.Pe(b))
};
t.fa = function(a) {
    if (t.bd(a)) return a.identifier;
    if (t.pa(a)) return a.pointerId;
    throw Error("IllegalArgument!");
};
t.bd = function(a) {
    return "undefined" !== typeof Touch && a instanceof Touch
};
t.$c = function(a) {
    return 1 === a.which
};
t.Bd = function(a) {
    return "undefined" !== typeof TouchEvent && a instanceof TouchEvent
};
t.pa = function(a) {
    return "undefined" !== typeof PointerEvent && a instanceof PointerEvent
};
t.lj = function(a) {
    return "undefined" !== typeof MouseEvent && a instanceof MouseEvent
};
t.af = function(a, b) {
    b = b.split("_").slice(1);
    try {
        for (var c in b) {
            var d = a.nd(parseInt(b[c], 10));
            a = d.U()
        }
    } catch (e) {
        return null
    }
    return void 0 !== d ? d : null
};
t.ig = function(a, b) {
    var c = [],
        d;
    for (d = 0; d <= b - 1; d++) c.push(a.getInt16());
    return c
};
t.Ze = function(a) {
    return a(0, 0, 0, [], null, !0).Ha()
};
t.qe = function(a, b, c) {
    c.Sk ? (a.m += Math.floor(a.w() / 2) - Math.floor(b.O / 2), a.T = a.m + b.O) : c.Fl ? a.m = a.T - b.O : a.T = a.m + b.O;
    c.Xl ? (a.o += Math.floor(a.v() / 2) - Math.floor(b.Z / 2), a.X = a.o + b.Z) : c.pk ? a.o = a.X - b.Z : a.X = a.o + b.Z;
    return a
};
t.re = function(a, b, c) {
    a.w() < b.w() && (c.Sk ? a = a.ac(Math.floor(b.w() / 2) - Math.floor(a.w() / 2), 0) : c.Fl && (a = a.ac(b.w() - a.w(), 0)));
    a.v() < b.v() && (c.Xl ? a = a.ac(0, Math.floor(b.v() / 2) - Math.floor(a.v() / 2)) : c.pk && (a = a.ac(0, b.v() - a.v())));
    return a
};
t.gg = function(a) {
    return "cdsRoot" === a.id
};
var y, M;
y = function() {
    this.level = M.Gh
};
y.b = function(a) {
    this.level >= M.Zj && console.info("--DEBUG--" + JSON.stringify(a))
};
y.info = function(a) {
    this.level >= M.Gh && console.info("--INFO--" + JSON.stringify(a))
};
y.warn = function(a) {
    this.level >= M.vn && console.warn(a)
};
y.i = function(a) {
    this.level >= M.jk && console.info("--TRACE--" + JSON.stringify(a))
};
y.error = function(a) {
    this.level >= M.cn && console.error(a)
};
y.A = function(a) {
    this.level = a
};
M = {
    IB: 0,
    Vr: 1,
    cn: 2,
    vn: 3,
    Gh: 4,
    Zj: 5,
    jk: 6
};