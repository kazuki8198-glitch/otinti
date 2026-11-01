class_name FlightPhysics
extends RefCounted

## FLIGHT LAB physics.js の GDScript 移植（Phase 0/1）
## 原典: cadet-wt-next/flight-lab/src/physics.js (898fe8a) — blade-element 空力、プロペラ左転傾向、
## 車輪バネ、地面効果、エンジン/燃料/電気システム、W&B。座標系は原典のまま:
## world x=東, y=上, z=南 / body x=右翼, y=上, -z=機首。状態は Dictionary、ベクトルは Array[float]。
## 数値の同値性は test/run_tests.gd が tools/gen_reference.mjs の生成する参照値と照合する。

const DEG = PI / 180.0
const KT = 1.943844
const FT = 3.28084
const G = 9.81

static func clampf_(x: float, a: float, b: float) -> float:
	return a if x < a else (b if x > b else x)

static func lerpf_(a: float, b: float, t: float) -> float:
	return a + (b - a) * t

static func smoothstep_(a: float, b: float, x: float) -> float:
	var t = clampf_((x - a) / (b - a), 0.0, 1.0)
	return t * t * (3.0 - 2.0 * t)

static func wrap360(a: float) -> float:
	return fposmod(a, 360.0)

static func wrap180(a: float) -> float:
	return fposmod(a + 540.0, 360.0) - 180.0

# ---------------------------------------------------------------- vectors / quaternions [x,y,z,(w)]
static func vadd(a: Array, b: Array) -> Array:
	return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]

static func vsub(a: Array, b: Array) -> Array:
	return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]

static func vscale(a: Array, s: float) -> Array:
	return [a[0] * s, a[1] * s, a[2] * s]

static func vmadd(a: Array, b: Array, s: float) -> Array:
	return [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s]

static func vdot(a: Array, b: Array) -> float:
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

static func vcross(a: Array, b: Array) -> Array:
	return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

static func vlen(a: Array) -> float:
	return sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])

static func vnorm(a: Array) -> Array:
	var l = vlen(a)
	if l == 0.0:
		l = 1.0
	return [a[0] / l, a[1] / l, a[2] / l]

static func qmul(a: Array, b: Array) -> Array:
	return [
		a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
		a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
		a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
		a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]

static func qconj(q: Array) -> Array:
	return [-q[0], -q[1], -q[2], q[3]]

static func qaxis(ax: Array, ang: float) -> Array:
	var s = sin(ang / 2.0)
	return [ax[0] * s, ax[1] * s, ax[2] * s, cos(ang / 2.0)]

static func qnorm(q: Array) -> Array:
	var l = sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3])
	if l == 0.0:
		l = 1.0
	return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]

static func qrot(q: Array, v: Array) -> Array:
	var x: float = q[0]; var y: float = q[1]; var z: float = q[2]; var w: float = q[3]
	var tx: float = 2.0 * (y * v[2] - z * v[1]); var ty: float = 2.0 * (z * v[0] - x * v[2]); var tz: float = 2.0 * (x * v[1] - y * v[0])
	return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)]

static func qFromHPB(hdg: float, pitch: float = 0.0, bank: float = 0.0) -> Array:
	var q = qaxis([0.0, 1.0, 0.0], -hdg * DEG)
	q = qmul(q, qaxis([1.0, 0.0, 0.0], pitch * DEG))
	q = qmul(q, qaxis([0.0, 0.0, 1.0], -bank * DEG))
	return q

# ---------------------------------------------------------------- JS Math.imul / uint32 emulation + RNG (原典 makeRng)
static func _u32(x: int) -> int:
	return x & 0xFFFFFFFF

static func _imul(a: int, b: int) -> int:
	var aa = a & 0xFFFFFFFF
	var bb = b & 0xFFFFFFFF
	var al = aa & 0xFFFF; var ah = (aa >> 16) & 0xFFFF
	var bl = bb & 0xFFFF; var bh = (bb >> 16) & 0xFFFF
	var lo = al * bl
	var mid = al * bh + ah * bl
	return (lo + ((mid & 0xFFFF) << 16)) & 0xFFFFFFFF

class Rng:
	var s: int
	func _init(seed_: int) -> void:
		s = seed_ & 0xFFFFFFFF
	func _imul2(a: int, b: int) -> int:
		var aa = a & 0xFFFFFFFF
		var bb = b & 0xFFFFFFFF
		var al = aa & 0xFFFF; var ah = (aa >> 16) & 0xFFFF
		var bl = bb & 0xFFFF; var bh = (bb >> 16) & 0xFFFF
		return (al * bl + (((al * bh + ah * bl) & 0xFFFF) << 16)) & 0xFFFFFFFF
	func next() -> float:
		s = (s + 0x6D2B79F5) & 0xFFFFFFFF
		var t = s
		t = _imul2(t ^ (t >> 15), t | 1)
		t = (t ^ ((t + _imul2(t ^ (t >> 7), t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
		return float((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0

static var _PERM: Array = []
static var _GX: Array = []
static var _GY: Array = []

static func _ensure_noise() -> void:
	if _PERM.size() == 512:
		return
	_PERM.resize(512)
	_GX.resize(16); _GY.resize(16)
	for i in range(16):
		_GX[i] = cos(float(i) * PI / 8.0)
		_GY[i] = sin(float(i) * PI / 8.0)
	var r = Rng.new(20240917)
	var p: Array = []
	for i in range(256):
		p.append(i)
	for i in range(255, 0, -1):
		var j = int(floor(r.next() * float(i + 1)))
		var tmp = p[i]; p[i] = p[j]; p[j] = tmp
	for i in range(512):
		_PERM[i] = p[i & 255]

static func perlin(x: float, y: float) -> float:
	_ensure_noise()
	var xi = int(floor(x)); var yi = int(floor(y))
	var X = xi & 255; var Y = yi & 255
	var xf = x - float(xi); var yf = y - float(yi)
	var a: int = _PERM[X + _PERM[Y]] & 15
	var b: int = _PERM[X + 1 + _PERM[Y]] & 15
	var c: int = _PERM[X + _PERM[Y + 1]] & 15
	var d: int = _PERM[X + 1 + _PERM[Y + 1]] & 15
	var u = xf * xf * xf * (xf * (xf * 6.0 - 15.0) + 10.0)
	var v = yf * yf * yf * (yf * (yf * 6.0 - 15.0) + 10.0)
	var n00: float = _GX[a] * xf + _GY[a] * yf
	var n10: float = _GX[b] * (xf - 1.0) + _GY[b] * yf
	var n01: float = _GX[c] * xf + _GY[c] * (yf - 1.0)
	var n11: float = _GX[d] * (xf - 1.0) + _GY[d] * (yf - 1.0)
	var x0 = n00 + u * (n10 - n00)
	var x1 = n01 + u * (n11 - n01)
	return (x0 + v * (x1 - x0)) * 1.42

# ---------------------------------------------------------------- the teaching world
const GROUND_FT = 55.0
static var GROUND_M: float = GROUND_FT / FT
const MAGVAR_W = 6.0

static func lab_rwy() -> Dictionary:
	return {"id": "LAB RWY 36", "n": 0.0, "e": -40000.0, "trueHdg": 354.0, "len": 1200.0, "wid": 30.0, "elevFt": GROUND_FT}

static func rwyCoords(rwy: Dictionary, n: float, e: float) -> Dictionary:
	var h: float = rwy["trueHdg"] * DEG
	var dn = n - float(rwy["n"]); var de = e - float(rwy["e"])
	return {"along": dn * cos(h) + de * sin(h), "cross": -dn * sin(h) + de * cos(h)}

static func rwyToNE(rwy: Dictionary, along: float, cross: float) -> Array:
	var h: float = rwy["trueHdg"] * DEG
	return [float(rwy["n"]) + along * cos(h) - cross * sin(h), float(rwy["e"]) + along * sin(h) + cross * cos(h)]

static func onRunway(rwy: Dictionary, n: float, e: float, margin: float = 0.0) -> bool:
	var c = rwyCoords(rwy, n, e)
	return c["along"] >= -margin and c["along"] <= float(rwy["len"]) + margin and absf(float(c["cross"])) <= float(rwy["wid"]) / 2.0 + margin

static var PAVED: Array = [[-40, 1240, -15, 15, "rwy"], [-10, 1210, 95, 110, "twy"], [10, 25, 15, 95, "twy"], [600, 615, 15, 95, "twy"], [1175, 1190, 15, 95, "twy"], [450, 750, 110, 230, "apron"]]

static func pavedAt(n: float, e: float) -> Variant:
	var c = rwyCoords(lab_rwy(), n, e)
	for p in PAVED:
		if c["along"] >= float(p[0]) and c["along"] <= float(p[1]) and c["cross"] >= float(p[2]) and c["cross"] <= float(p[3]):
			return p[4]
	return null

static var LAKES: Array = [[6000, -36500, 700, 1], [12500, -26000, 900, 2.3], [-9000, -27000, 600, 4], [-19000, -41000, 1100, 0.5], [2500, -47000, 500, 5.1], [-3500, -30500, 450, 2.9], [20000, -33000, 1300, 3.7], [9000, -18000, 800, 1.7]]

static func inLake(n: float, e: float) -> bool:
	for L in LAKES:
		var dn = n - float(L[0]); var de = e - float(L[1])
		var d = sqrt(dn * dn + de * de)
		if d > float(L[2]) * 1.3:
			continue
		var a = atan2(dn, de)
		var rr: float = float(L[2]) * (1.0 + 0.16 * sin(a * 3.0 + float(L[3])) + 0.08 * sin(a * 7.0 + float(L[3]) * 2.0))
		if d < rr:
			return true
	return false

static func groundAt(x: float, z: float) -> Dictionary:
	var n = -z; var e = x
	var p = pavedAt(n, e)
	return {"h": GROUND_M, "n": [0.0, 1.0, 0.0], "paved": p != null, "kind": p, "water": p == null and inLake(n, e)}

# ---------------------------------------------------------------- the aircraft (原典 AIRCRAFT の数値をそのまま転記)
static var FLAP_DEG: Array = [0.0, 10.0, 20.0, 30.0]

static func AIRCRAFT() -> Array:
	return [
		{
			"id": "pa28", "name": "Piper PA-28-181 Archer", "short": "Archer", "engines1": 1,
			"fuse": [[-3.25, 0.30, 0.30, 0.02], [-3.05, 0.43, 0.42, 0.02], [-2.5, 0.55, 0.54, 0.04], [-1.5, 0.60, 0.62, 0.06], [-0.5, 0.60, 0.64, 0.08], [0.6, 0.53, 0.57, 0.10], [1.7, 0.38, 0.44, 0.16], [2.8, 0.22, 0.30, 0.24], [3.75, 0.09, 0.17, 0.30], [4.0, 0.03, 0.07, 0.32]],
			"wing": {"y": -0.45, "dih": 7.0, "rootX": 0.55, "tipX": 5.4, "rootLE": -1.0, "rootC": 1.6, "tipLE": -0.85, "tipC": 1.2, "t0": 0.15, "t1": 0.12, "hinge": 0.74, "flap": [0.6, 2.6], "ail": [2.8, 5.2]},
			"hstab": {"y": 0.25, "span": 2.0, "rootLE": 3.05, "tipLE": 3.05, "te": 3.8, "hinge": 3.05, "t": 0.09},
			"vstab": {"y0": 0.25, "y1": 1.5, "rootLE": 2.35, "topLE": 3.2, "te": 3.95, "hinge": 3.55, "t": 0.1},
			"engines": [{"type": "nose", "z": -3.34, "y": 0.02, "r": 0.94, "blades": 2}],
			"gear": {"fixed": true, "wheelR": 0.25, "nose": [0.0, -1.15, -2.3], "mains": [[1.6, -1.15, 0.25]]},
			"eye": [-0.3, 0.62, -0.4], "flapLabels": ["UP", "10°", "25°", "40°"], "fuelCap": 24.0, "carb": true,
			"phys": {"mass": 1050.0, "S": 15.8, "b": 10.8, "c": 1.6, "L": 7.25, "CL0": 0.28, "CLa": 4.8, "aStall": 0.28, "CD0": 0.032, "K": 0.05, "CDgear": 0.0, "Cm0": 0.015, "Cma": -1.1, "Cmde": 0.34, "Cmq": -15.0, "Clda": 0.055, "Clp": -0.5, "Clb": -0.12, "Cnb": 0.1, "Cndr": 0.03, "Cnr": -0.14, "CYb": -0.6, "flapCL": 0.55, "flapStall": 0.045, "flapCD": 0.7, "engine": {"type": "prop", "P": 134000.0, "T0": 2400.0, "eta": 0.85, "etaK": 0.8}, "maxG": 3.8, "rollRate": 55.0, "pitchRate": 12.0},
			"v": {"s0": 45.0, "s1": 50.0, "rotate": 60.0, "x": 64.0, "y": 76.0, "climb": 87.0, "glide": 76.0, "glideLand": 66.0, "appr": 70.0, "apprShort": 65.0, "ga": 64.0, "va": 113.0, "fe": 102.0, "no": 125.0, "ne": 154.0, "xwind": 17.0, "apprFlaps": 3, "apprThr": 0.3, "cruise": 110.0, "cruiseThr": 0.79, "toFlaps": 0, "descMax": 122.0}
		},
		{
			"id": "pa44", "name": "Piper PA-44-180 Seminole", "short": "Seminole", "engines1": 2, "twin": true, "counterRotating": true, "cs": true,
			"fuse": [[-3.3, 0.30, 0.30, 0.02], [-3.1, 0.44, 0.43, 0.02], [-2.5, 0.58, 0.56, 0.04], [-1.5, 0.62, 0.66, 0.06], [-0.5, 0.62, 0.68, 0.08], [0.6, 0.56, 0.62, 0.10], [1.8, 0.42, 0.48, 0.16], [3.0, 0.26, 0.34, 0.26], [4.3, 0.12, 0.22, 0.36], [5.1, 0.04, 0.10, 0.42]],
			"wing": {"y": -0.45, "dih": 7.0, "rootX": 0.6, "tipX": 5.88, "rootLE": -1.0, "rootC": 1.75, "tipLE": -0.75, "tipC": 1.25, "t0": 0.15, "t1": 0.12, "hinge": 0.74, "flap": [0.6, 3.2], "ail": [3.4, 5.6]},
			"hstab": {"y": 1.95, "span": 2.0, "rootLE": 4.3, "tipLE": 4.5, "te": 5.1, "hinge": 4.4, "t": 0.09},
			"vstab": {"y0": 0.3, "y1": 1.95, "rootLE": 3.4, "topLE": 4.3, "te": 5.2, "hinge": 4.7, "t": 0.1},
			"engines": [{"type": "wing", "x": 1.95, "y": -0.35, "z": -2.1, "r": 0.94, "blades": 2}],
			"gear": {"fixed": false, "wheelR": 0.27, "nose": [0.0, -1.2, -2.5], "mains": [[1.6, -1.2, 0.3]]},
			"eye": [-0.3, 0.58, -0.6], "flapLabels": ["UP", "10°", "25°", "40°"], "fuelCap": 54.0,
			"phys": {"mass": 1650.0, "S": 17.08, "b": 11.77, "c": 1.6, "L": 8.41, "CL0": 0.32, "CLa": 4.8, "aStall": 0.29, "CD0": 0.028, "K": 0.05, "CDgear": 0.022, "Cm0": 0.01, "Cma": -1.1, "Cmde": 0.32, "Cmq": -16.0, "Clda": 0.055, "Clp": -0.5, "Clb": -0.1, "Cnb": 0.11, "Cndr": 0.045, "Cnr": -0.14, "CYb": -0.6, "flapCL": 0.55, "flapStall": 0.045, "flapCD": 0.7, "engine": {"type": "prop", "P": 268000.0, "T0": 5200.0, "eta": 0.82, "etaK": 0.45}, "maxG": 3.8, "rollRate": 50.0, "pitchRate": 11.0},
			"v": {"s0": 55.0, "s1": 57.0, "mc": 56.0, "rotate": 75.0, "x": 82.0, "y": 88.0, "xse": 88.0, "sse": 82.0, "yse": 88.0, "glide": 88.0, "appr": 88.0, "apprFull": 80.0, "ga": 88.0, "va": 135.0, "fe": 111.0, "lo": 109.0, "le": 140.0, "no": 169.0, "ne": 202.0, "xwind": 17.0, "apprFlaps": 2, "apprThr": 0.3, "cruise": 140.0, "cruiseThr": 0.75, "toFlaps": 0, "climb": 105.0}
		},
		{
			"id": "pa28r", "name": "Piper PA-28R-201 Arrow III", "short": "Arrow", "engines1": 1, "cs": true, "propCtrl": true, "complex": true, "propGov": [1900.0, 2700.0],
			"fuse": [[-3.25, 0.30, 0.30, 0.02], [-3.05, 0.43, 0.42, 0.02], [-2.5, 0.55, 0.54, 0.04], [-1.5, 0.60, 0.62, 0.06], [-0.5, 0.60, 0.64, 0.08], [0.6, 0.53, 0.57, 0.10], [1.7, 0.38, 0.44, 0.16], [2.8, 0.22, 0.30, 0.24], [3.75, 0.09, 0.17, 0.30], [4.0, 0.03, 0.07, 0.32]],
			"wing": {"y": -0.45, "dih": 7.0, "rootX": 0.55, "tipX": 5.4, "rootLE": -1.0, "rootC": 1.6, "tipLE": -0.85, "tipC": 1.2, "t0": 0.15, "t1": 0.12, "hinge": 0.74, "flap": [0.6, 2.6], "ail": [2.8, 5.2]},
			"hstab": {"y": 0.25, "span": 2.0, "rootLE": 3.05, "tipLE": 3.05, "te": 3.8, "hinge": 3.05, "t": 0.09},
			"vstab": {"y0": 0.25, "y1": 1.5, "rootLE": 2.35, "topLE": 3.2, "te": 3.95, "hinge": 3.55, "t": 0.1},
			"engines": [{"type": "nose", "z": -3.34, "y": 0.02, "r": 0.99, "blades": 3}],
			"gear": {"fixed": false, "wheelR": 0.25, "nose": [0.0, -1.15, -2.3], "mains": [[1.6, -1.15, 0.25]]},
			"eye": [-0.3, 0.62, -0.4], "flapLabels": ["UP", "10°", "25°", "40°"], "fuelCap": 36.0,
			"phys": {"mass": 1180.0, "S": 15.8, "b": 10.8, "c": 1.6, "L": 7.36, "CL0": 0.28, "CLa": 4.8, "aStall": 0.28, "CD0": 0.030, "K": 0.05, "CDgear": 0.020, "Cm0": 0.015, "Cma": -1.1, "Cmde": 0.34, "Cmq": -15.0, "Clda": 0.055, "Clp": -0.5, "Clb": -0.12, "Cnb": 0.1, "Cndr": 0.03, "Cnr": -0.14, "CYb": -0.6, "flapCL": 0.55, "flapStall": 0.045, "flapCD": 0.7, "engine": {"type": "prop", "P": 149000.0, "T0": 2800.0, "eta": 0.85, "etaK": 0.55}, "maxG": 3.8, "rollRate": 55.0, "pitchRate": 12.0},
			"v": {"s0": 53.0, "s1": 58.0, "rotate": 65.0, "x": 78.0, "y": 90.0, "climb": 100.0, "glide": 79.0, "glideLand": 72.0, "appr": 75.0, "apprShort": 70.0, "ga": 78.0, "va": 125.0, "fe": 103.0, "lo": 107.0, "le": 129.0, "no": 146.0, "ne": 183.0, "xwind": 17.0, "apprFlaps": 3, "apprThr": 0.3, "cruise": 125.0, "cruiseThr": 0.75, "toFlaps": 0}
		},
	]

static func aircraftById(id: String) -> Dictionary:
	for a in AIRCRAFT():
		if a["id"] == id:
			return a
	return AIRCRAFT()[0]

static func fuseAt(F: Array, z: float) -> Array:
	for i in range(F.size() - 1):
		var a: Array = F[i]; var b: Array = F[i + 1]
		if z <= float(b[0]):
			var t = clampf_((z - float(a[0])) / (float(b[0]) - float(a[0])), 0.0, 1.0)
			var out: Array = []
			for k in range(a.size()):
				out.append(lerpf_(float(a[k]), float(b[k]), t))
			return out
	return F[F.size() - 1]

# wingFns: 原典はクロージャを返す。GDScript では辞書に Callable を入れて再現する
static func wingFns(w: Dictionary) -> Dictionary:
	var span: float = float(w["tipX"]) - float(w["rootX"])
	var f = func(ax: float) -> float: return clampf_((ax - float(w["rootX"])) / span, 0.0, 1.0)
	return {
		"y": func(ax: float) -> float: return float(w["y"]) + (ax - float(w["rootX"])) * tan(float(w["dih"]) * DEG),
		"c": func(ax: float) -> float: return lerpf_(float(w["rootC"]), float(w["tipC"]), f.call(ax)),
		"le": func(ax: float) -> float: return lerpf_(float(w["rootLE"]), float(w["tipLE"]), f.call(ax)),
		"t": func(ax: float) -> float: return lerpf_(float(w["t0"]), float(w["t1"]), f.call(ax)),
	}

# ---------------------------------------------------------------- blade-element aerodynamics
const EL_N = 8

static func buildElements(A: Dictionary, P: Dictionary) -> Dictionary:
	var W = wingFns(A["wing"])
	var w: Dictionary = A["wing"]; var hs: Dictionary = A["hstab"]; var vs: Dictionary = A["vstab"]
	var pcs: Array = []
	var Gd: float = float(w["dih"]) * DEG
	var fwd = [0.0, 0.0, -1.0]
	var area = 0.0; var flapS = 0.0
	for side in [-1, 1]:
		for i in range(EL_N):
			var x0: float = float(w["tipX"]) * float(i) / EL_N
			var x1: float = float(w["tipX"]) * float(i + 1) / EL_N
			var xc = (x0 + x1) / 2.0
			var xa = maxf(xc, float(w["rootX"]))
			var c: float = W["c"].call(xa)
			var sv = vnorm([1.0, float(side) * tan(Gd), 0.0])
			var flapArr: Array = w["flap"]; var ailArr: Array = w["ail"]
			var p = {
				"kind": 0, "side": side, "S": c * (x1 - x0),
				"r": [float(side) * xc, W["y"].call(xa), W["le"].call(xa) + 0.25 * c],
				"s": sv, "n": vnorm(vcross(sv, fwd)),
				"flap": xc >= float(flapArr[0]) and xc <= float(flapArr[1]),
				"ail": (float(side) if (xc >= float(ailArr[0]) - 0.2 and xc <= float(ailArr[1])) else 0.0),
				"span01": xc / float(w["tipX"]),
			}
			pcs.append(p); area += float(p["S"])
	for p in pcs:
		p["S"] = float(p["S"]) * float(P["S"]) / area
		if p["flap"]:
			flapS += float(p["S"])
	var hle = func(x: float) -> float: return lerpf_(float(hs["rootLE"]), float(hs["tipLE"]), x / float(hs["span"]))
	for side in [-1, 1]:
		for i in range(2):
			var xc: float = float(hs["span"]) * (float(i) + 0.5) / 2.0
			var c = maxf(float(hs["te"]) - hle.call(xc), 0.2)
			pcs.append({"kind": 1, "side": side, "S": c * float(hs["span"]) / 2.0, "r": [float(side) * xc, float(hs["y"]), hle.call(xc) + 0.25 * c], "s": [1.0, 0.0, 0.0], "n": [0.0, 1.0, 0.0], "wash": (0.6 if i else 1.0)})
	var fle = func(y: float) -> float: return lerpf_(float(vs["rootLE"]), float(vs["topLE"]), (y - float(vs["y0"])) / (float(vs["y1"]) - float(vs["y0"])))
	for i in range(2):
		var dy: float = (float(vs["y1"]) - float(vs["y0"])) / 2.0
		var yc: float = float(vs["y0"]) + dy * (float(i) + 0.5)
		var c = maxf(float(vs["te"]) - fle.call(yc), 0.2)
		pcs.append({"kind": 2, "side": 0, "S": c * dy, "r": [0.0, yc, fle.call(yc) + 0.25 * c], "s": [0.0, 1.0, 0.0], "n": [-1.0, 0.0, 0.0], "wash": (0.5 if i else 1.0)})
	var E = {"pcs": pcs, "flapK": (float(P["S"]) / flapS if flapS > 0.0 else 0.0), "dCmF": 0.0, "at": 3.5, "af": 3.0, "it": 0.0, "deps": 0.35, "ke": 1.0, "ka": 1.0, "kr": 1.0, "gdi": 0.0, "dCma": 0.0, "dCmq": 0.0, "dClp": 0.0, "dClr": 0.0, "dCnr": 0.0, "dCnp": 0.0, "dCnda": 0.0, "dCY": 0.0, "finYZ": 0.0}
	var Vc: float = float(A["v"]["cruise"]) / KT
	var rho = 1.225; var q = 0.5 * rho * Vc * Vc; var hv = 0.25 * rho * Vc
	var a0 = (float(P["mass"]) * G / (q * float(P["S"])) - float(P["CL0"])) / float(P["CLa"])
	var vAt = func(a: float, b: float = 0.0) -> Array: return [Vc * sin(b), -Vc * sin(a) * cos(b), -Vc * cos(a) * cos(b)]
	var run = func(o: Dictionary = {}) -> Dictionary:
		var vb: Array = o["vb"] if o.has("vb") else vAt.call(o.get("a", a0), o.get("b", 0.0))
		var wv: Array = o["w"] if o.has("w") else [0.0, 0.0, 0.0]
		return aeroElements(E, P, vb, wv, rho, {"flapF": 0.0, "elev": o.get("elev", 0.0), "ail": o.get("ail", 0.0), "rud": o.get("rud", 0.0), "dq": 0.0})
	var d = func(f: Callable, h: float) -> float: return (float(f.call(h)) - float(f.call(-h))) / (2.0 * h)
	var Mx = func(o: Dictionary) -> float: return float(run.call(o)["M"][0])
	var Lroll = func(o: Dictionary) -> float: return -float(run.call(o)["M"][2])
	var Nyaw = func(o: Dictionary) -> float: return -float(run.call(o)["M"][1])
	var qSc = q * float(P["S"]) * float(P["c"]); var qSb = q * float(P["S"]) * float(P["b"])
	var slope = func(at: float) -> float:
		E["at"] = at
		return d.call(func(h: float) -> float: return Mx.call({"a": a0 + h}), 0.01)
	var s0 = slope.call(0.0); var s1 = slope.call(1.0)
	var at: float = (float(P["Cma"]) * cos(a0) * qSc - s0) / (s1 - s0)
	at = clampf_(at if is_finite(at) else 3.5, 0.5, 14.0); E["at"] = at
	E["dCma"] = float(P["Cma"]) - slope.call(at) / (qSc * cos(a0))
	E["it"] = 0.0; var m0 = Mx.call({"a": 0.0}); E["it"] = 0.01; var m1 = Mx.call({"a": 0.0}); E["it"] = -m0 * 0.01 / (m1 - m0)
	E["ke"] = 1.0; E["ke"] = float(P["Cmde"]) * qSc / d.call(func(h: float) -> float: return Mx.call({"elev": h}), 0.05)
	E["dCmF"] = 0.0
	var mm0: float = run.call({})["M"][0]
	var mm1: float = aeroElements(E, P, vAt.call(a0), [0.0, 0.0, 0.0], rho, {"flapF": 1.0, "elev": 0.0, "ail": 0.0, "rud": 0.0, "dq": 0.0})["M"][0]
	E["dCmF"] = -(mm1 - mm0) / qSc
	E["dCmq"] = float(P["Cmq"]) - d.call(func(h: float) -> float: return Mx.call({"w": [h, 0.0, 0.0]}), 0.02) / (hv * float(P["S"]) * float(P["c"]) * float(P["c"]))
	E["ka"] = 1.0; E["ka"] = float(P["Clda"]) * qSb / d.call(func(h: float) -> float: return Lroll.call({"ail": h}), 0.05)
	var nb = func(af: float) -> float:
		E["af"] = af
		return d.call(func(h: float) -> float: return Nyaw.call({"b": h}), 0.01)
	var n0 = nb.call(0.0); var n1 = nb.call(1.0); E["af"] = clampf_((float(P["Cnb"]) * qSb - n0) / (n1 - n0), 0.3, 14.0)
	E["kr"] = 1.0; E["kr"] = float(P["Cndr"]) * qSb / d.call(func(h: float) -> float: return Nyaw.call({"rud": h}), 0.05)
	var lb = func(gdi: float) -> float:
		E["gdi"] = gdi
		return d.call(func(h: float) -> float: return Lroll.call({"b": h}), 0.01)
	var l0 = lb.call(0.0); var l1 = lb.call(1.0); E["gdi"] = (float(P["Clb"]) * qSb - l0) / (l1 - l0)
	E["dClp"] = float(P["Clp"]) - d.call(func(h: float) -> float: return Lroll.call({"w": [0.0, 0.0, -h]}), 0.02) / (hv * float(P["S"]) * float(P["b"]) * float(P["b"]))
	E["dClr"] = float(P.get("Clr", 0.0)) - d.call(func(h: float) -> float: return Lroll.call({"w": [0.0, -h, 0.0]}), 0.02) / (hv * float(P["S"]) * float(P["b"]) * float(P["b"]))
	E["dCnr"] = float(P["Cnr"]) - d.call(func(h: float) -> float: return Nyaw.call({"w": [0.0, -h, 0.0]}), 0.02) / (hv * float(P["S"]) * float(P["b"]) * float(P["b"]))
	E["dCnp"] = float(P.get("Cnp", 0.0)) - d.call(func(h: float) -> float: return Nyaw.call({"w": [0.0, 0.0, -h]}), 0.02) / (hv * float(P["S"]) * float(P["b"]) * float(P["b"]))
	E["dCnda"] = float(P.get("Cnda", 0.0)) - d.call(func(h: float) -> float: return Nyaw.call({"ail": h}), 0.05) / qSb
	E["dCY"] = float(P["CYb"]) - d.call(func(h: float) -> float: return float(run.call({"b": h})["F"][0]), 0.01) / (q * float(P["S"]))
	var sy = 0.0; var sz = 0.0; var sa = 0.0
	for p in pcs:
		if p["kind"] == 2:
			sy += float(p["r"][1]) * float(p["S"]); sz += float(p["r"][2]) * float(p["S"]); sa += float(p["S"])
	E["finYZ"] = sy / maxf(sz, 0.5) if sa != 0.0 else 0.0
	return E

static func aeroElements(E: Dictionary, P: Dictionary, vb: Array, w: Array, rho: float, o: Dictionary) -> Dictionary:
	var F = [0.0, 0.0, 0.0]; var M = [0.0, 0.0, 0.0]
	var V = vlen(vb)
	if V == 0.0:
		V = 1.0
	var sb: float = vb[0] / V
	var clw = 0.0; var stw = 0.0; var eps = 0.0
	var geEps = 1.0
	if o.has("hgt"):
		for p in E["pcs"]:
			if p["kind"] == 1:
				var hh = maxf(float(o["hgt"].call(p)), 0.3) / float(P["b"])
				var gg = (16.0 * hh * hh) / (1.0 + 16.0 * hh * hh)
				geEps = 0.93 + 0.07 * gg
				break
	var aS0: float = float(P["aStall"]) - float(P["flapStall"]) * float(o["flapF"])
	var pcs: Array = E["pcs"]
	for pass_ in range(2):
		for pi in range(pcs.size()):
			var p: Dictionary = pcs[pi]
			if (p["kind"] == 0) != (pass_ == 0):
				continue
			var r: Array = p["r"]
			var vx: float = vb[0] + w[1] * r[2] - w[2] * r[1]
			var vy: float = vb[1] + w[2] * r[0] - w[0] * r[2]
			var vz: float = vb[2] + w[0] * r[1] - w[1] * r[0]
			if o.has("gust"):
				var ggust: Array = o["gust"].call(p)
				vx -= float(ggust[0]); vy -= float(ggust[1]); vz -= float(ggust[2])
			var sv: Array = p["s"]; var nv: Array = p["n"]
			var vs: float = vx * sv[0] + vy * sv[1] + vz * sv[2]
			var px: float = vx - vs * sv[0]; var py: float = vy - vs * sv[1]; var pz: float = vz - vs * sv[2]
			var Vp = sqrt(px * px + py * py + pz * pz)
			if Vp < 0.5:
				continue
			var a = atan2(-(px * nv[0] + py * nv[1] + pz * nv[2]), -pz)
			var qd = 0.5 * rho * Vp * Vp
			var slope = 0.0; var cl0 = 0.0; var dcl = 0.0; var aS = 0.0; var cdi = 0.0; var ge = 1.0
			if p["kind"] == 0:
				a += float(p["side"]) * float(E["gdi"]) * sb
				if o.has("hgt"):
					var h = maxf(float(o["hgt"].call(p)), 0.3) / float(P["b"])
					ge = (16.0 * h * h) / (1.0 + 16.0 * h * h)
				slope = float(P["CLa"]) * (1.0 + 0.06 * (1.0 - ge))
				cl0 = float(P["CL0"]) + (float(P["flapCL"]) * float(o["flapF"]) * float(E["flapK"]) if p["flap"] else 0.0)
				dcl = float(E["ka"]) * float(o["ail"]) * float(p["ail"]) if float(p["ail"]) != 0.0 else 0.0
				aS = aS0 + 0.03 * float(p["span01"])
				cdi = float(P["K"]) * ge
			elif p["kind"] == 1:
				a += float(E["it"]) - eps; slope = float(E["at"]); dcl = float(E["ke"]) * float(o["elev"]); aS = 0.32; cdi = 0.09
			else:
				slope = float(E["af"]); dcl = float(E["kr"]) * float(o["rud"]); aS = 0.36; cdi = 0.09
			var over = maxf(a - aS, -aS - 0.06 - a)
			var st = smoothstep_(0.0, 0.07, over)
			if o.has("stH"):
				var stH: Array = o["stH"]
				var cur = float(stH[pi])
				var tau = 0.06 if st > cur else 0.4
				st = cur + (st - cur) * minf(1.0, float(o.get("dt", 0.0)) / tau)
				stH[pi] = st
			var lin = cl0 + slope * a + dcl * (1.0 - 0.5 * st)
			var CL = lerpf_(lin, 1.15 * sin(2.0 * a), st)
			var sa = sin(a)
			var CD = cdi * lin * lin * (1.0 - st) + st * 1.25 * sa * sa
			var lx: float = sv[1] * pz - sv[2] * py; var ly: float = sv[2] * px - sv[0] * pz; var lz: float = sv[0] * py - sv[1] * px
			var ll = sqrt(lx * lx + ly * ly + lz * lz)
			if ll == 0.0:
				ll = 1.0
			var k = qd * float(p["S"])
			var cx: float = float(o["dq"]) * float(p["wash"]) * float(p["S"]) * dcl * (1.0 - 0.5 * st) if p["kind"] != 0 else 0.0
			var fx: float = k * (CL * lx / ll - CD * px / Vp) + cx * lx / ll
			var fy: float = k * (CL * ly / ll - CD * py / Vp) + cx * ly / ll
			var fz: float = k * (CL * lz / ll - CD * pz / Vp) + cx * lz / ll
			if p["kind"] == 1:
				F[0] -= k * CD * px / Vp; F[1] -= k * CD * py / Vp; F[2] -= k * CD * pz / Vp
			else:
				F[0] += fx; F[1] += fy; F[2] += fz
			M[0] += (0.0 if p["kind"] == 0 else r[1]) * fz - r[2] * fy
			M[1] += r[2] * fx - r[0] * fz
			M[2] += r[0] * fy - r[1] * fx
			p["cl"] = CL; p["st"] = st; p["a"] = a
			if p["kind"] == 0:
				clw += CL * float(p["S"]); stw += st * float(p["S"])
			if pass_ == 0:
				eps = float(E["deps"]) * (clw / float(P["S"])) / float(P["CLa"]) * geEps
	return {"F": F, "M": M, "CLw": clw / float(P["S"]), "stallW": stw / float(P["S"])}

# ---------------------------------------------------------------- weight and balance
const LB_KG = 0.45359237
const PERSON_KG = 77.0
const FUEL_KG_GAL = 6.0 * LB_KG

static func WB() -> Dictionary:
	return {
		"pa28": {"mtowLb": 2550.0, "fwdIn": 82.0, "aftIn": 93.0, "emptyArm": 85.5, "frontArm": 80.5, "rearArm": 118.1, "bagArm": 142.8, "bagMaxKg": 90.0, "fuelArm": 95.0, "tabsGal": 17.0},
		"pa44": {"mtowLb": 3800.0, "fwdIn": 84.0, "aftIn": 94.0, "emptyArm": 89.0, "frontArm": 84.0, "rearArm": 118.9, "bagArm": 142.0, "bagMaxKg": 90.0, "fuelArm": 95.7, "tabsGal": 40.0},
		"pa28r": {"mtowLb": 2750.0, "fwdIn": 84.0, "aftIn": 93.0, "emptyArm": 86.0, "frontArm": 80.5, "rearArm": 118.1, "bagArm": 142.8, "bagMaxKg": 90.0, "fuelArm": 95.0, "tabsGal": 25.0},
	}

static func stdLoading() -> Dictionary:
	return {"fuel": "std", "front": 2, "rear": 0, "bagKg": 0.0}

static func cleanLoading(A: Dictionary, ld: Variant) -> Dictionary:
	var W: Dictionary = WB().get(A["id"], {})
	if W.is_empty():
		return stdLoading()
	var o: Dictionary = ld if ld is Dictionary else {}
	var num = func(v: Variant) -> float: return float(v) if v is float or v is int else NAN
	var frontV = num.call(o.get("front", NAN))
	var rearV = num.call(o.get("rear", NAN))
	var bagV = num.call(o.get("bagKg", NAN))
	return {
		"fuel": o.get("fuel", "std") if ["std", "full", "tabs", "half"].has(o.get("fuel", "std")) else "std",
		"front": int(clampf_(round(2.0 if is_nan(frontV) else frontV), 0.0, 2.0)),
		"rear": int(clampf_(round(0.0 if is_nan(rearV) else rearV), 0.0, 2.0)),
		"bagKg": clampf_(0.0 if is_nan(bagV) else bagV, 0.0, float(W["bagMaxKg"])),
	}

static func fuelPerTank(A: Dictionary, mode: String) -> float:
	var W: Dictionary = WB()[A["id"]]
	if mode == "full":
		return float(A["fuelCap"])
	if mode == "tabs":
		return float(W["tabsGal"])
	if mode == "half":
		return float(A["fuelCap"]) / 2.0
	return float(A["fuelCap"]) * 0.8

static func computeWB(A: Dictionary, ld: Variant, fuelGal: Variant = null) -> Variant:
	var W: Dictionary = WB().get(A["id"], {})
	if W.is_empty():
		return null
	var L = cleanLoading(A, ld)
	var fg: Array
	if fuelGal is Array and fuelGal.size() == 2 and is_finite(float(fuelGal[0])) and is_finite(float(fuelGal[1])):
		fg = [float(fuelGal[0]), float(fuelGal[1])]
	else:
		var per = fuelPerTank(A, L["fuel"])
		fg = [per, per]
	var emptyKg: float = float(A["phys"]["mass"]) - 2.0 * PERSON_KG - 2.0 * float(A["fuelCap"]) * 0.8 * FUEL_KG_GAL
	var kg = emptyKg + float(L["front"]) * PERSON_KG + float(L["rear"]) * PERSON_KG + float(L["bagKg"]) + (fg[0] + fg[1]) * FUEL_KG_GAL
	var mom = emptyKg * float(W["emptyArm"]) + float(L["front"]) * PERSON_KG * float(W["frontArm"]) + float(L["rear"]) * PERSON_KG * float(W["rearArm"]) + float(L["bagKg"]) * float(W["bagArm"]) + (fg[0] + fg[1]) * FUEL_KG_GAL * float(W["fuelArm"])
	if int(L["front"]) == 2 and int(L["rear"]) == 0 and float(L["bagKg"]) == 0.0 and absf(fg[0] - float(A["fuelCap"]) * 0.8) < 1e-9 and absf(fg[1] - float(A["fuelCap"]) * 0.8) < 1e-9:
		kg = float(A["phys"]["mass"])
	var cgIn = mom / kg
	var lb = kg / LB_KG
	var problems: Array = []
	if lb > float(W["mtowLb"]):
		problems.append("over")
	if cgIn < float(W["fwdIn"]):
		problems.append("nose")
	elif cgIn > float(W["aftIn"]):
		problems.append("tail")
	var spreadIn = sqrt((emptyKg * pow(float(W["emptyArm"]) - cgIn, 2.0) + float(L["front"]) * PERSON_KG * pow(float(W["frontArm"]) - cgIn, 2.0) + float(L["rear"]) * PERSON_KG * pow(float(W["rearArm"]) - cgIn, 2.0) + float(L["bagKg"]) * pow(float(W["bagArm"]) - cgIn, 2.0) + (fg[0] + fg[1]) * FUEL_KG_GAL * pow(float(W["fuelArm"]) - cgIn, 2.0)) / kg)
	return {"kg": kg, "lb": lb, "cgIn": cgIn, "spreadIn": spreadIn, "mtowLb": W["mtowLb"], "fwdIn": W["fwdIn"], "aftIn": W["aftIn"], "ok": problems.is_empty(), "problems": problems, "fuelGal": fg.duplicate(), "loading": L, "emptyKg": emptyKg}

static func refCgOf(A: Dictionary) -> float:
	var w = computeWB(A, stdLoading())
	return float(w["cgIn"]) if w != null else 0.0

static func refSpreadOf(A: Dictionary) -> float:
	var w = computeWB(A, stdLoading())
	return float(w["spreadIn"]) if w != null else 0.0

static func applyLoading(s: Dictionary, ld: Variant) -> Variant:
	var A: Dictionary = s["A"]
	var W: Dictionary = WB().get(A["id"], {})
	if W.is_empty():
		return null
	var L = cleanLoading(A, ld)
	if L["fuel"] != "std":
		var per = fuelPerTank(A, L["fuel"])
		s["fuel"] = [per, per]
	var wb = computeWB(A, L, s["fuel"])
	s["loading"] = L; s["wb"] = wb
	var d = deriveAircraft(A, float(wb["kg"]), {"cgIn": wb["cgIn"], "spreadIn": wb["spreadIn"]})
	s["AC"] = d["AC"]; s["WHEELS"] = d["WHEELS"]; s["WHEEL_BOTTOM"] = d["WHEEL_BOTTOM"]; s["HARDPTS"] = d["HARDPTS"]; s["TAILSKID"] = d["TAILSKID"]
	if (s.get("contacts", []) as Array).size() != (d["WHEELS"] as Array).size():
		var cs: Array = []
		for i in range((d["WHEELS"] as Array).size()):
			cs.append(false)
		s["contacts"] = cs
	return wb

# ---------------------------------------------------------------- deriveAircraft
static func deriveAircraft(A: Dictionary, mass: Variant = null, load: Variant = null) -> Dictionary:
	var P: Dictionary = (A["phys"] as Dictionary).duplicate()
	P["mass"] = float(mass) if mass != null else float(A["phys"]["mass"])
	var m: float = P["mass"]
	if load is Dictionary and is_finite(float((load as Dictionary).get("cgIn", NAN))):
		var dIn: float = float(load["cgIn"]) - refCgOf(A)
		P["Cma"] = float(A["phys"]["Cma"]) + float(A["phys"]["CLa"]) * dIn / (float(P["c"]) / 0.0254)
		P["Cm0"] = float(A["phys"]["Cm0"]) + clampf_(dIn * 0.0025, -0.015, 0.015)
	var iMul = 1.0
	if load is Dictionary and is_finite(float((load as Dictionary).get("spreadIn", NAN))):
		var rs = refSpreadOf(A)
		if rs > 0.0:
			iMul = clampf_(0.7 + 0.3 * (float(load["spreadIn"]) * float(load["spreadIn"])) / (rs * rs), 0.9, 1.35)
	var I = [m * pow(0.18 * float(P["L"]), 2.0) * iMul, m * pow(0.19 * (float(P["L"]) + float(P["b"])) / 2.0, 2.0), m * pow(0.12 * float(P["b"]), 2.0) * iMul]
	var wr: float = A["gear"]["wheelR"]
	var bottom: float = float(A["gear"]["nose"][1]) - wr
	var zn: float = A["gear"]["nose"][2]; var zm: float = A["gear"]["mains"][0][2]
	var Fn = m * G * zm / (zm - zn)
	var Fm = m * G * -zn / (zm - zn) / (float((A["gear"]["mains"] as Array).size()) * 2.0)
	var defl = clampf_(wr * 0.38, 0.05, 0.22)
	var spring = func(load_: float) -> Dictionary:
		var k = load_ / defl
		return {"k": k, "c": 2.0 * 0.65 * sqrt(k * load_ / G)}
	var wheels: Array = []
	var sd: Dictionary = spring.call(maxf(Fn, m * G * 0.35))
	wheels.append({"off": [0.0, bottom, zn], "k": sd["k"], "c": sd["c"], "nose": true})
	for mm in A["gear"]["mains"]:
		for sgn in [-1, 1]:
			var sd2: Dictionary = spring.call(Fm)
			wheels.append({"off": [float(sgn) * float(mm[0]), bottom, float(mm[2])], "k": sd2["k"], "c": sd2["c"]})
	var F: Array = A["fuse"]
	var zTail: float = F[F.size() - 1][0]
	var tailSt = fuseAt(F, zTail - (zTail - float(F[0][0])) * 0.1)
	var W = wingFns(A["wing"]); var hs: Dictionary = A["hstab"]; var vs: Dictionary = A["vstab"]
	var hard: Array = [
		{"off": [0.0, float(F[0][3]), float(F[0][0]) - (0.4 if A["engines"][0]["type"] == "nose" else 0.0)], "name": "機首"},
		{"off": [-float(A["wing"]["tipX"]), W["y"].call(float(A["wing"]["tipX"])), W["le"].call(float(A["wing"]["tipX"])) + W["c"].call(float(A["wing"]["tipX"])) * 0.4], "name": "左の翼端"},
		{"off": [float(A["wing"]["tipX"]), W["y"].call(float(A["wing"]["tipX"])), W["le"].call(float(A["wing"]["tipX"])) + W["c"].call(float(A["wing"]["tipX"])) * 0.4], "name": "右の翼端"},
		{"off": [0.0, float(vs["y1"]), float(vs["topLE"]) + 0.2], "name": "垂直尾翼"},
		{"off": [-float(hs["span"]), float(hs["y"]), (float(hs["tipLE"]) + float(hs["te"])) / 2.0], "name": "水平尾翼"},
		{"off": [float(hs["span"]), float(hs["y"]), (float(hs["tipLE"]) + float(hs["te"])) / 2.0], "name": "水平尾翼"},
	]
	for sgn in [-1, 1]:
		var x: float = float(A["wing"]["tipX"]) * 0.55
		hard.append({"off": [float(sgn) * x, W["y"].call(x) - W["t"].call(x) * W["c"].call(x) * 0.3, W["le"].call(x) + W["c"].call(x) * 0.4], "name": ("左翼" if sgn < 0 else "右翼")})
	for z in [float(F[0][0]) * 0.45, float(F[F.size() - 1][0]) * 0.3]:
		var fd = fuseAt(F, z)
		hard.append({"off": [0.0, float(fd[3]) - float(fd[2]), z], "name": "胴体下面"})
	for e in A["engines"]:
		if e["type"] == "nose":
			hard.append({"off": [0.0, float(e["y"]) - float(e["r"]), float(e["z"])], "name": "プロペラ"})
		if e["type"] == "wing":
			for sgn in [-1, 1]:
				hard.append({"off": [float(sgn) * float(e["x"]), float(e["y"]) - float(e["r"]), float(e["z"])], "name": "プロペラ"})
	var Eng: Dictionary = P["engine"]
	var pr = {}
	var Vc: float = float(A["v"]["cruise"]) / KT
	var qc = 0.5 * 1.225 * Vc * Vc
	var CLc = m * G / (qc * float(P["S"]))
	var ac = (CLc - float(P["CL0"])) / float(P["CLa"])
	var Tc = (float(P["CD0"]) + float(P.get("CDgear", 0.0)) * (1.0 if A["gear"]["fixed"] else 0.0) + float(P["K"]) * CLc * CLc) * qc * float(P["S"])
	pr["Vd"] = Vc * 1.2; pr["a0"] = 0.012 * float(P["b"]); pr["a1"] = 0.15 * float(P["b"])
	pr["fin"] = 0.0 if A.get("counterRotating", false) else Tc * (float(pr["a0"]) + float(pr["a1"]) * ac) / qc
	if A.get("counterRotating", false):
		pr["a0"] = 0.0; pr["a1"] = 0.0
	pr["Ip"] = 2.5 * float(Eng["P"]) / 92000.0 / float(A.get("engines1", 1))
	pr["tq"] = 0.0 if A.get("counterRotating", false) else 0.12 * minf(1.0, 92000.0 / float(Eng["P"]))
	var thrC: float = A["v"].get("cruiseThr", 0.65)
	var omC = rpmFor(A, thrC, Vc) * PI / 30.0
	var ac2: Dictionary = P.duplicate()
	ac2["I"] = I; ac2["prop"] = pr
	ac2["Cnda"] = float(P["Cnda"]) if P.has("Cnda") else -0.1 * float(P["Clda"])
	ac2["Cnp"] = float(P["Cnp"]) if P.has("Cnp") else -0.04
	ac2["Clr"] = float(P["Clr"]) if P.has("Clr") else 0.06
	ac2["el"] = buildElements(A, ac2)
	var finRollC = -float(ac2["el"]["finYZ"]) * (-Tc * float(pr["a0"]) + float(pr["fin"]) * qc)
	pr["rig"] = ((0.04 + 0.96 * thrC) * float(Eng["P"]) / 0.85 / omC * float(pr["tq"]) - finRollC) / qc
	return {"AC": ac2, "WHEELS": wheels, "WHEEL_BOTTOM": bottom, "HARDPTS": hard, "TAILSKID": {"off": [0.0, float(tailSt[3]) - float(tailSt[2]), zTail - (zTail - float(F[0][0])) * 0.1], "k": 30.0 * m, "c": 4.0 * m}}

# ---------------------------------------------------------------- atmosphere, rpm, wind, thrust
static func atmos(h: float, dev: float = 0.0) -> Dictionary:
	h = maxf(h, -500.0)
	var Ts = 0.0; var p = 0.0
	if h < 11000.0:
		Ts = 288.15 - 0.0065 * h; p = 101325.0 * pow(Ts / 288.15, 5.25588)
	else:
		Ts = 216.65; p = 22632.1 * exp(-(h - 11000.0) / 6341.62)
	var T = Ts + dev
	var rho = p / (287.05 * T)
	return {"T": T, "p": p, "rho": rho, "a": sqrt(1.4 * 287.05 * T), "sigma": rho / 1.225}

static func rpmFor(A: Dictionary, thr: float, u: float, pw: float = 1.0, dead: bool = false, propLev: Variant = null) -> float:
	if dead:
		return clampf_(14.0 * u, 0.0, 1300.0)
	if A.get("propCtrl", false):
		var govA: Array = A["propGov"]
		var gov: float = float(govA[0]) + (float(govA[1]) - float(govA[0])) * clampf_(1.0 if propLev == null else float(propLev), 0.0, 1.0)
		return gov * clampf_(0.30 + 3.0 * maxf(thr, 0.0), 0.0, 1.0)
	if A.get("cs", false):
		return 2250.0 + 450.0 * sqrt(maxf(thr, 0.0))
	return minf(650.0 + 1650.0 * sqrt(maxf(thr, 0.0)) * pow(maxf(pw, 0.1), 0.3) + 6.0 * maxf(u, 0.0), 2850.0)

static func windGradient(agl: float) -> float:
	var h = clampf_(agl, 1.0, 400.0)
	return clampf_(log(h / 0.03) / log(10.0 / 0.03), 0.55, 1.35)

static func windAt(s: Dictionary, t: float, agl: float) -> Array:
	var W: Dictionary = s.get("wind", {"fromDeg": 0.0, "kt": 0.0, "gust": 0.4})
	var k: float = W.get("gust", 1.0)
	var gust = minf(1.0, maxf(agl, 0.0) / 300.0 + 0.4) * k
	var from: float = float(W.get("fromDeg", 0.0)) * DEG
	var sp: float = float(W.get("kt", 0.0)) / KT
	var wg = windGradient(agl)
	if W.get("topKt", null) != null and float(W.get("topFt", 0.0)) > 0.0:
		var f = clampf_(agl / (float(W["topFt"]) / FT), 0.0, 1.0)
		var dd = fmod(float(W["topFrom"]) - float(W["fromDeg"]), 360.0)
		if dd > 180.0:
			dd -= 360.0
		elif dd < -180.0:
			dd += 360.0
		from = (float(W["fromDeg"]) + dd * f) * DEG
		sp = (float(W["kt"]) + (float(W["topKt"]) - float(W["kt"])) * f) / KT
		wg = 1.0
	var w = [-sin(from) * sp, 0.0, cos(from) * sp]
	return [w[0] * wg + perlin(t * 0.35, 1.7) * 1.4 * gust, perlin(t * 0.5, 4.4) * 0.5 * gust, w[2] * wg + perlin(t * 0.31, 8.2) * 1.1 * gust]

static func propThrust(P: Dictionary, th: float, V: float, pw: float, nE: float = 1.0) -> float:
	var ua = maxf(V, 1.0)
	var Eng: Dictionary = P["engine"]; var Pr: Dictionary = P["prop"]
	var eta: float = float(Eng["eta"]) * pow(minf(1.0, ua / float(Pr["Vd"])), float(Eng["etaK"]))
	return (0.04 + 0.96 * th) * pw * minf(float(Eng["T0"]) / nE * (1.0 - 0.25 * minf(V / float(Pr["Vd"]), 1.0)), eta * float(Eng["P"]) / nE / ua)

const TRIM_MAX = 0.45
const LINE_FUEL_S = 6.0
const MIX_CUT = 0.12

static func trimFor(s: Dictionary, V: float, flapF: float, n: float = 1.0, rho: float = 1.225) -> Dictionary:
	var AC: Dictionary = s["AC"]
	var qd = 0.5 * rho * V * V
	var cl0: float = float(AC["CL0"]) + float(AC["flapCL"]) * flapF
	var alpha = (n * float(AC["mass"]) * G / (qd * float(AC["S"])) - cl0) / float(AC["CLa"])
	return {"alpha": alpha, "elev": clampf_((-float(AC["Cma"]) * sin(alpha) - float(AC["Cm0"])) / float(AC["Cmde"]), -1.0, 1.0)}

static func trimLevel(s: Dictionary) -> float:
	var flapF: float = s["flapDeg"] / 30.0 if (s["A"]["wing"] as Dictionary).has("flap") else 0.0
	var rho: float = s["rho"] if s.get("rho", null) != null else float(atmos(float(s["pos"][1]))["rho"])
	var a1 = float(trimFor(s, maxf(float(s.get("tas", 0.0)), 20.0), flapF, 1.0, rho)["alpha"])
	return clampf_(float(s["elev"]) + float(s["trim"]) + float(s["AC"]["Cma"]) / float(s["AC"]["Cmde"]) * (float(s["alpha"]) - a1), -TRIM_MAX, TRIM_MAX)

static func steadyState(s: Dictionary, kt: float, fpm: float, o: Dictionary = {}) -> Dictionary:
	var P: Dictionary = s["AC"]; var A: Dictionary = s["A"]
	var atm = atmos(float(o.get("altFt", 3000.0)) / FT, float(o.get("oatDev", s.get("oatDev", 0.0))))
	var Wgt = float(P["mass"]) * G
	var flapF: float = FLAP_DEG[int(o.get("flaps", 0))] / 30.0 if (A["wing"] as Dictionary).has("flap") else 0.0
	var gear: float = 1.0 if A["gear"]["fixed"] else (1.0 if o.get("gear", false) else 0.0)
	var V = kt / KT / sqrt(float(atm["sigma"]))
	var q = 0.5 * float(atm["rho"]) * V * V
	var n = 1.0 / cos(float(o.get("bank", 0.0)) * DEG)
	var cl0: float = float(P["CL0"]) + float(P["flapCL"]) * flapF
	var pw = maxf(0.0, 1.132 * float(atm["sigma"]) - 0.132)
	var ne = 0.5 if o.get("oei", false) else 1.0
	var thrust = func(thr: Variant) -> float:
		if thr is String and thr == "dead":
			return -0.026 * q * float(P["S"]) * pow(float(P["mass"]) / 1050.0, 0.3)
		var thf = float(thr)
		return ne * (propThrust(P, thf, V, pw, 1.0) - (1.0 - thf) * 2.5 * V * float(P["mass"]) / 1000.0) - (0.004 * q * float(P["S"]) if o.get("oei", false) else 0.0)
	var forces = func(gm: float) -> Dictionary:
		var CL = n * Wgt * cos(gm) / (q * float(P["S"]))
		var a = (CL - cl0) / float(P["CLa"])
		var CD: float = float(P["CD0"]) + (0.02 * flapF + 0.05 * flapF * flapF) * float(P.get("flapCD", 1.0)) + float(P.get("CDgear", 0.0)) * gear + float(P["K"]) * CL * CL
		return {"a": a, "D": CD * q * float(P["S"])}
	var gm = 0.0; var thr: Variant = null
	if o.get("pwr", null) != null and (o["pwr"] == "full" or o["pwr"] == "idle" or o["pwr"] == "dead"):
		var T: float = thrust.call(1.0 if o["pwr"] == "full" else ("dead" if o["pwr"] == "dead" else 0.0))
		gm = 0.0
		for i in range(30):
			var ff: Dictionary = forces.call(gm)
			gm = asin(clampf_((T - float(ff["D"])) / Wgt, -0.9, 0.9))
		thr = 1.0 if o["pwr"] == "full" else 0.0
	else:
		gm = asin(clampf_(fpm / 196.85 / V, -0.9, 0.9))
		var need: float = float(forces.call(gm)["D"]) + Wgt * sin(gm)
		var lo = 0.0; var hi = 1.0
		for i in range(40):
			var mid = (lo + hi) / 2.0
			if float(thrust.call(mid)) < need:
				lo = mid
			else:
				hi = mid
		thr = (lo + hi) / 2.0
		if float(thrust.call(1.0)) < need:
			thr = 1.01
	var f: Dictionary = forces.call(gm)
	var pitch = (gm + float(f["a"])) / DEG * cos(float(o.get("bank", 0.0)) * DEG)
	var dead = o.get("pwr", null) == "dead"
	return {"thr": thr, "pitch": pitch, "fpm": sin(gm) * V * 196.85, "aoa": float(f["a"]) / DEG, "rpm": rpmFor(A, 0.0 if dead else minf(float(thr), 1.0), V, pw, dead), "ok": float(thr) <= 1.0}

# ---------------------------------------------------------------- controls
static func SENS() -> Dictionary:
	return {
		"low": {"direct": 0.45, "pitch": 0.16, "roll": 0.36, "pMax": 0.4, "rMax": 0.6, "bank": 30.0, "gamma": 8.0},
		"mid": {"direct": 0.7, "pitch": 0.26, "roll": 0.55, "pMax": 0.55, "rMax": 0.8, "bank": 45.0, "gamma": 12.0},
		"high": {"direct": 1.0, "pitch": 0.42, "roll": 0.85, "pMax": 0.75, "rMax": 1.0, "bank": 60.0, "gamma": 18.0},
	}

static func pitchHold(s: Dictionary, alpha: float, qd: float, qdc: float, aS: float) -> void:
	var AC: Dictionary = s["AC"]
	var f = qrot(s["q"], [0.0, 0.0, -1.0])
	var th = asin(clampf_(f[1], -1.0, 1.0))
	var thT: float = float(s.get("pTgt", 0.0)) if s.get("pTgt", null) != null else 0.0
	thT *= DEG
	if not s["onGround"] and alpha > aS - 0.05:
		thT = minf(thT, th - (alpha - (aS - 0.05)) * 2.0)
	var ratio = qd / maxf(qdc, 1.0)
	var e0 = (-float(AC["Cma"]) * sin(alpha) - float(AC["Cm0"])) / float(AC["Cmde"]) * ratio
	var Mde = maxf(qdc * float(AC["S"]) * float(AC["c"]) * float(AC["Cmde"]) / float(AC["I"][0]), 0.02)
	var qCmd = clampf_((thT - th) * 1.6 + float(s.get("pRate", 0.0)) * DEG, -0.2, 0.2)
	s["pHI"] = 0.0 if s["onGround"] else clampf_(float(s.get("pHI", 0.0)) + (thT - th) * (1.0 / 120.0) * 0.8, -0.3, 0.3)
	s["elev"] = clampf_(e0 + clampf_(2.5 / Mde, 0.1, 30.0) * (qCmd - float(s["w"][0])) + float(s["pHI"]) - float(s["trim"]), -1.0, 1.0)

static func bankHold(s: Dictionary, V: float, rMax: float) -> void:
	var AC: Dictionary = s["AC"]
	var r = qrot(s["q"], [1.0, 0.0, 0.0]); var up = qrot(s["q"], [0.0, 1.0, 0.0])
	var bank = atan2(-r[1], up[1]); var p = -float(s["w"][2])
	if s.get("bTgt", null) == null:
		s["bTgt"] = 0.0 if absf(bank) < 4.0 * DEG else clampf_(bank, -60.0 * DEG, 60.0 * DEG)
		s["bHI"] = 0.0
	var err: float = float(s["bTgt"]) - bank
	if absf(err) < 3.0 * DEG:
		s["bHI"] = clampf_(float(s.get("bHI", 0.0)) + err * (1.0 / 120.0) * 0.6, -0.05, 0.05)
	var pMaxR: float = float(AC["rollRate"]) * DEG * 0.5
	var pCmd = clampf_(err * 1.2 + float(s.get("bHI", 0.0)), -pMaxR, pMaxR)
	var kAil = absf(float(AC["Clp"])) * float(AC["b"]) / (2.0 * maxf(V, 10.0) * float(AC["Clda"]))
	s["ail"] = clampf_((pCmd + 0.9 * (pCmd - p)) * kAil, -rMax, rMax)
	s["bankHoldOn"] = true

static func applyControls(s: Dictionary, V: float, alpha: float, qd: float, qdc: float, flapF: float, aS: float, cl0: float) -> void:
	var AC: Dictionary = s["AC"]; var A: Dictionary = s["A"]; var o: Dictionary = s["opts"]
	var sens: Dictionary = SENS().get(o.get("sens", "low"), SENS()["low"])
	var airborne: bool = not s["onGround"] and float(s["airTime"]) > 0.6 and V > 12.0
	var leveling: bool = float(o.get("levelT", 0.0)) > 0.0
	s["assistOn"] = (bool(o.get("assist", false)) or leveling) and airborne and not s["crashed"]
	var holdP: bool = bool(s["keyHold"]) and not leveling and not s["crashed"] and V > 12.0 and s.get("ovr", null) == null and not s["onGround"]
	if not holdP:
		s["pHI"] = 0.0
	var holdB: bool = bool(s.get("rollHold", false)) and not leveling and not s["crashed"] and V > 12.0 and s.get("ovr", null) == null and not s["onGround"] and float(s["airTime"]) > 0.6 and absf(float(s["rIn"])) < 0.02
	s["bankHoldOn"] = false
	if not holdB:
		s["bTgt"] = null
	if not s["assistOn"]:
		s["gI"] = 0.0; s["bI"] = 0.0
		var vr: float = float(A["v"]["cruise"]) / KT
		var spd = maxf(V, 12.0)
		var pMax = minf(1.0, float(sens["pMax"]) * clampf_(vr / spd, 1.0, float(o.get("gainCap", 1.7))))
		var rMax = minf(1.0, float(sens["rMax"]) * clampf_(vr / spd, 1.0, 2.0))
		var kg: float = 1.0 if s["onGround"] else (1.0 - float(s["airTime"]) / 3.0 if float(s["airTime"]) < 3.0 else 0.0)
		var lin = maxf(clampf_(0.45 + (vr / spd - 1.0) * 0.35, 0.45, 0.8), 0.45 + 0.35 * kg)
		var shape = func(x: float, a: float) -> float: return a * x + (1.0 - a) * x * x * x
		var kp = maxf(pMax, kg)
		var el = kp * shape.call(clampf_(float(s["pIn"]), -1.0, 1.0), lin)
		if float(s.get("trimHold", 0.0)) != 0.0:
			if absf(float(s["pIn"])) < 0.04 or signf_(el) != signf_(float(s["trimHold"])):
				s["trimHold"] = 0.0
			else:
				el -= signf_(el) * minf(absf(el), absf(float(s["trimHold"])))
		s["elev"] = clampf_(el, -1.0, 1.0)
		s["ail"] = clampf_(rMax * shape.call(clampf_(float(s["rIn"]), -1.0, 1.0), 0.45), -1.0, 1.0)
		if holdB:
			bankHold(s, V, rMax)
		if holdP:
			pitchHold(s, alpha, qd, qdc, aS)
		return
	# assist (fly-by-wire)
	var r = qrot(s["q"], [1.0, 0.0, 0.0]); var up = qrot(s["q"], [0.0, 1.0, 0.0])
	var bank = atan2(-r[1], up[1])
	var spd = vlen(s["vel"])
	if spd == 0.0:
		spd = 1.0
	var gamma = asin(clampf_(float(s["vel"][1]) / spd, -1.0, 1.0))
	var p = -float(s["w"][2])
	var bankMax = minf(float(sens["bank"]), 80.0) * DEG
	var rIn = 0.0 if leveling else float(s["rIn"])
	var pIn = 0.0 if leveling else float(s["pIn"])
	var bankCmd = rIn * bankMax
	var pMaxR: float = float(AC["rollRate"]) * DEG * (1.0 if o.get("sens", "low") == "high" else (0.75 if o.get("sens", "low") == "mid" else 0.55))
	var bErr = bankCmd - bank
	var hold: bool = absf(bankCmd) < 2.0 * DEG and absf(bErr) < 3.0 * DEG
	s["bI"] = clampf_(float(s.get("bI", 0.0)) + bErr * (1.0 / 120.0) * 1.5 * minf(1.0, float(AC["rollRate"]) / 50.0), -0.08, 0.08) if hold else float(s.get("bI", 0.0)) * 0.98
	var pCmd = clampf_(bErr * 1.6 + float(s["bI"]), -pMaxR, pMaxR)
	var kAil = absf(float(AC["Clp"])) * float(AC["b"]) / (2.0 * maxf(V, 10.0) * float(AC["Clda"]))
	s["ail"] = clampf_((pCmd + 0.9 * (pCmd - p)) * kAil, -1.0, 1.0)
	var gMax: float = float(sens["gamma"]) * DEG
	var gammaCmd = pIn * gMax
	s["gI"] = clampf_(float(s.get("gI", 0.0)) * (1.0 - 0.1 / 120.0) + clampf_(gammaCmd - gamma, -1.5 * DEG, 1.5 * DEG) * (1.0 / 120.0) * 0.35, -0.08, 0.08)
	var gdot = clampf_((gammaCmd - gamma) * 0.7 + float(s["gI"]), -float(AC["pitchRate"]) * DEG, float(AC["pitchRate"]) * DEG)
	var nCmd = clampf_(cos(gamma) / maxf(cos(bank), 0.35) + spd * gdot / G, -1.0, float(AC["maxG"]))
	var aFree = (nCmd * float(AC["mass"]) * G / maxf(qd * float(AC["S"]), 1.0) - cl0) / float(AC["CLa"])
	var aReq = clampf_(aFree, -aS * 0.7, aS - 0.04)
	if aReq != aFree:
		s["gI"] = float(s["gI"]) * 0.97
	var ratio = qd / maxf(qdc, 1.0)
	var e = (-float(AC["Cma"]) * sin(aReq) - float(AC["Cm0"])) / float(AC["Cmde"]) * ratio
	var Mde = maxf(qdc * float(AC["S"]) * float(AC["c"]) * float(AC["Cmde"]) / float(AC["I"][0]), 0.02)
	var qCmd = G / spd * (nCmd - cos(gamma) * cos(bank)) + 2.0 * (aReq - alpha)
	e += 1.2 * (aReq - alpha) + clampf_(2.5 / Mde, 0.1, 30.0) * (qCmd - float(s["w"][0]))
	s["elev"] = clampf_(e - float(s["trim"]), -1.0, 1.0)
	if holdP:
		pitchHold(s, alpha, qd, qdc, aS)

static func signf_(x: float) -> float:
	return 1.0 if x > 0.0 else (-1.0 if x < 0.0 else 0.0)

const MAG_POS: Array = ["OFF", "R", "L", "BOTH", "START"]
const MIX_OFF = MIX_CUT
const MIX_RICH = 0.7
const CATCH_S = 1.2

# ---------------------------------------------------------------- the state
static func newState(o: Dictionary = {}) -> Dictionary:
	var s = {
		"t": 0.0, "pos": [0.0, GROUND_M + 1.4, 0.0], "vel": [0.0, 0.0, 0.0], "q": [0.0, 0.0, 0.0, 1.0], "w": [0.0, 0.0, 0.0],
		"thr": 0.0, "prop": 1.0, "elev": 0.0, "ail": 0.0, "rud": 0.0, "trim": 0.0, "trimTgt": null, "brake": false, "pIn": 0.0, "rIn": 0.0, "flapIdx": 0, "flapDeg": 0.0, "gearDown": true, "gearPos": 1.0,
		"rpm": 0.0, "propAng": 0.0, "onGround": false, "mainContact": false, "airTime": 0.0, "crashed": false, "crashReason": "",
		"alpha": 0.0, "beta": 0.0, "ias": 0.0, "tas": 0.0, "gLoad": 1.0, "stallW": 0.0, "stallWarn": false, "agl": 0.0, "vs": 0.0, "contacts": [],
		"keyHold": true, "pTgt": null, "pRate": 0.0, "dead": false,
		"opts": {"sens": "low", "assist": false, "autoRud": false, "levelT": 0.0},
		"wind": {"fromDeg": 0.0, "kt": 0.0, "gust": 0.4}, "qnh": 29.92, "oatDev": 0.0, "surfaceWet": 0.0,
		"mix": 1.0, "fuelSel": "L", "carbHeat": false, "carbRisk": 0.0,
		"pitotHeat": false, "pitotRisk": 0.0, "pitotIce": 0.0, "staticBlocked": false, "altStatic": false, "boostPump": false, "xfeed": false, "gearFault": false, "gearEmerg": false, "gearEmergT": 0.0, "fuelUsed": 0.0, "_iasFrz": null, "_altFrz": null,
		"_mixCmd": 1.0, "_selCmd": "L",
		"fuel": [0.0, 0.0], "fuelFlow": 0.0,
		"eng": [], "events": [], "td": null, "out": {}, "wasOnRunway": false, "lastRwyT": -99.0, "seed": int(o.get("seed", 1)),
		"elec": {"batt": 1.0, "volts": 12.6, "amps": 0.0, "altFail": false}, "hobbs": 471.2,
		"rollHold": false, "brakeL": null, "brakeR": null, "ovr": null, "trimHold": 0.0, "pHI": 0.0, "gI": 0.0, "bI": 0.0, "bTgt": null, "bHI": 0.0,
		"assistOn": false, "bankHoldOn": false, "engStopNoted": false, "tailTouch": false, "firstWheel": -1, "gndAir": 0.0, "gndVel": null, "_stH": null, "_excursion": false,
		"shaftP": 0.0, "thrust": 0.0, "rho": null, "oat": 0.0, "nProp": 0.0, "densAlt": 0.0, "liftN": 0.0, "dragN": 0.0, "CL": 0.0, "CD": 0.0, "ge": 0.0, "rudEff": 0.0, "rudNeed": 0.0, "rudAuto": 0.0, "wheelLock": false,
		"loading": null, "wb": null,
	}
	setAircraft(s, str(o.get("aircraft", "pa28")), o.get("mass", null))
	return s

static func setAircraft(s: Dictionary, id: String, mass: Variant = null) -> Dictionary:
	var A = aircraftById(id)
	var d = deriveAircraft(A, mass)
	s["A"] = A; s["AC"] = d["AC"]; s["WHEELS"] = d["WHEELS"]; s["WHEEL_BOTTOM"] = d["WHEEL_BOTTOM"]; s["HARDPTS"] = d["HARDPTS"]; s["TAILSKID"] = d["TAILSKID"]
	var cs: Array = []
	for i in range((d["WHEELS"] as Array).size()):
		cs.append(false)
	s["contacts"] = cs
	s["fuel"] = [float(A["fuelCap"]) * 0.8, float(A["fuelCap"]) * 0.8]
	var engs: Array = []
	for i in range(int(A.get("engines1", 1))):
		engs.append({"run": true, "failed": false, "feather": false, "cut": false, "thr": null, "rpm": 0.0, "mag": "BOTH", "mix": 1.0, "sel": ("R" if i else "L"), "on": true, "crankT": 0.0, "lineT": LINE_FUEL_S, "egt": 70.0, "carbIce": 0.0, "feed": (1 if i else 0), "feedOk": true, "mixK": 1.0, "powK": 1.0, "rough": 0.0, "manIn": 0.0, "ff": 0.0, "ffK": 1.0, "shaftW": 0.0, "lev": 1.0, "iceNoted": false, "oilP": 0.0, "oilT": null, "magBad": null, "pumpFail": false, "fuelPress": 0.0, "pressT": 0.0, "oilQ": (8.0 if float(A["fuelCap"]) > 30.0 else 7.0), "cyl": null, "T": 0.0, "ang": 0.0, "propK": 1.0})
	s["eng"] = engs
	s["gearDown"] = true; s["gearPos"] = 1.0
	return s

static func engineRunning(s: Dictionary) -> bool:
	for e in s["eng"]:
		if e["run"]:
			return true
	return false

static func resetState(s: Dictionary) -> void:
	s["vel"] = [0.0, 0.0, 0.0]; s["w"] = [0.0, 0.0, 0.0]; s["onGround"] = false; s["mainContact"] = false; s["crashed"] = false; s["crashReason"] = ""
	s["events"] = []; s["td"] = null; s["tailTouch"] = false; s["firstWheel"] = -1; s["gLoad"] = 1.0; s["pTgt"] = null; s["pHI"] = 0.0; s["gI"] = 0.0; s["bI"] = 0.0
	s["trimHold"] = 0.0; s["trimTgt"] = null; s["engStopNoted"] = false; s["wasOnRunway"] = false; s["_excursion"] = false; s["pIn"] = 0.0; s["rIn"] = 0.0; s["rud"] = 0.0; s["ovr"] = null; s["_stH"] = null; s["prop"] = 1.0
	var i = 0
	for e in s["eng"]:
		e["failed"] = false; e["feather"] = false; e["cut"] = false; e["thr"] = null; e["mag"] = "BOTH"; e["mix"] = 1.0; e["sel"] = ("R" if i else "L"); e["on"] = true; e["crankT"] = 0.0; e["lineT"] = LINE_FUEL_S; e["carbIce"] = 0.0; e["iceNoted"] = false; e["magBad"] = null; e["pumpFail"] = false; e["pressT"] = 0.0
		i += 1
	s["pitotIce"] = 0.0; s["staticBlocked"] = false; s["_iasFrz"] = null; s["_altFrz"] = null; s["gearFault"] = false; s["gearEmerg"] = false; s["gearEmergT"] = 0.0
	s["_mixCmd"] = s["mix"]; s["_selCmd"] = s["fuelSel"]

static func placeOnRunway(s: Dictionary, rwy: Dictionary = {}, along: float = 30.0) -> Dictionary:
	if rwy.is_empty():
		rwy = lab_rwy()
	resetState(s)
	var ne2 = rwyToNE(rwy, along, 0.0)
	s["q"] = qFromHPB(float(rwy["trueHdg"]), 0.0, 0.0)
	s["pos"] = [ne2[1], GROUND_M - float(s["WHEEL_BOTTOM"]) + 0.02, -ne2[0]]
	s["flapIdx"] = 0; s["flapDeg"] = 0.0; s["thr"] = 0.0; s["trim"] = 0.0; s["brake"] = false; s["gearDown"] = true; s["gearPos"] = 1.0
	s["onGround"] = true; s["airTime"] = 0.0; s["wasOnRunway"] = true; s["lastRwyT"] = s["t"]
	var cs: Array = []
	for i in range((s["WHEELS"] as Array).size()):
		cs.append(true)
	s["contacts"] = cs
	s["rpm"] = rpmFor(s["A"], 0.0, 0.0)
	for en in s["eng"]:
		en["rpm"] = s["rpm"]
	derive(s)
	return s

static func placeInAir(s: Dictionary, n: float, e: float, altFt: float, hdgTrue: float, kias: float, gammaDeg: float = 0.0, flapIdx: int = 0, thr: Variant = null) -> Dictionary:
	resetState(s)
	var A: Dictionary = s["A"]
	var atm = atmos(altFt / FT, float(s["oatDev"]))
	var kt = kias / sqrt(float(atm["sigma"]))
	s["flapIdx"] = flapIdx if (A["wing"] as Dictionary).has("flap") else 0
	s["flapDeg"] = FLAP_DEG[int(s["flapIdx"])]
	var v = kt / KT
	var ff: float = float(s["flapDeg"]) / 30.0 if (A["wing"] as Dictionary).has("flap") else 0.0
	var tr = trimFor(s, v, ff, cos(gammaDeg * DEG), float(atm["rho"]))
	s["trim"] = clampf_(float(tr["elev"]), -TRIM_MAX, TRIM_MAX); s["trimHold"] = 0.0
	s["pos"] = [e, altFt / FT, -n]
	s["q"] = qFromHPB(hdgTrue, float(tr["alpha"]) / DEG + gammaDeg, 0.0)
	var dir = [sin(hdgTrue * DEG), 0.0, -cos(hdgTrue * DEG)]
	var wnd = windAt(s, float(s["t"]), altFt / FT - GROUND_M)
	s["vel"] = vadd(vadd(vscale(dir, v * cos(gammaDeg * DEG)), [0.0, v * sin(gammaDeg * DEG), 0.0]), [wnd[0], 0.0, wnd[2]])
	s["gearDown"] = true if A["gear"]["fixed"] else (gammaDeg < -1.0 or flapIdx > 0)
	s["gearPos"] = 1.0 if s["gearDown"] else 0.0
	var thrF: float
	if thr == null:
		var ss = steadyState(s, kias, sin(gammaDeg * DEG) * v * 196.85, {"altFt": altFt, "flaps": int(s["flapIdx"]), "gear": bool(s["gearDown"])})
		thrF = clampf_(float(ss["thr"]), 0.0, 1.0)
	else:
		thrF = float(thr)
	s["thr"] = thrF
	s["airTime"] = 10.0; s["onGround"] = false; s["mainContact"] = false
	var cs: Array = []
	for i in range((s["WHEELS"] as Array).size()):
		cs.append(false)
	s["contacts"] = cs
	s["rpm"] = rpmFor(A, thrF, v)
	for en in s["eng"]:
		en["rpm"] = s["rpm"]
	s["pTgt"] = float(attitude(s)["pitch"])
	derive(s)
	return s

static func attitude(s: Dictionary) -> Dictionary:
	var f = qrot(s["q"], [0.0, 0.0, -1.0]); var r = qrot(s["q"], [1.0, 0.0, 0.0]); var up = qrot(s["q"], [0.0, 1.0, 0.0])
	return {"pitch": asin(clampf_(f[1], -1.0, 1.0)) / DEG, "bank": atan2(-r[1], up[1]) / DEG, "hdg": wrap360(atan2(f[0], -f[2]) / DEG)}

static func windNow(s: Dictionary) -> Array:
	return windAt(s, float(s["t"]), maxf(float(s.get("agl", 0.0)), 0.0) + 2.0)

static func neOf(s: Dictionary) -> Dictionary:
	return {"n": -float(s["pos"][2]), "e": float(s["pos"][0])}

# ---------------------------------------------------------------- crash / touchdown / derive
static func crash(s: Dictionary, why: String) -> void:
	if s["crashed"]:
		return
	s["crashed"] = true; s["crashReason"] = why; s["vel"] = [0.0, 0.0, 0.0]; s["w"] = [0.0, 0.0, 0.0]
	(s["events"] as Array).append({"t": s["t"], "type": "crash", "why": why})

static func onTouchdown(s: Dictionary, v0: Array) -> void:
	var a = attitude(s)
	var n = -float(s["pos"][2]); var e = float(s["pos"][0])
	var rc = rwyCoords(lab_rwy(), n, e)
	var h: float = float(lab_rwy()["trueHdg"]) * DEG
	var perp = [cos(h), 0.0, sin(h)]
	var latV: float = v0[0] * perp[0] + v0[2] * perp[2]
	var fpm = int(round(-v0[1] * 196.85))
	var onR = onRunway(lab_rwy(), n, e)
	s["td"] = {"t": s["t"], "fpm": fpm, "kias": int(round(float(s["ias"]) * KT)), "gsKt": int(round(sqrt(v0[0] * v0[0] + v0[2] * v0[2]) * KT)), "pitch": snappedf(float(a["pitch"]), 0.1), "bank": snappedf(float(a["bank"]), 0.1), "crab": snappedf(absf(wrap180(float(a["hdg"]) - float(lab_rwy()["trueHdg"]))), 0.1), "latV": snappedf(latV, 0.01), "along": int(round(float(rc["along"]))), "cross": snappedf(float(rc["cross"]), 0.1), "onRunway": onR, "noseFirst": int(s["firstWheel"]) == 0, "bounces": 0}
	var ev: Dictionary = {"t": s["t"], "type": "touchdown"}
	for kkey in s["td"].keys():
		if kkey != "t":
			ev[kkey] = s["td"][kkey]
	(s["events"] as Array).append(ev)
	if fpm > 600:
		(s["events"] as Array).append({"t": s["t"], "type": "hard_landing", "fpm": fpm})
	if not onR:
		(s["events"] as Array).append({"t": s["t"], "type": "off_runway_touchdown"})
	if absf(float(a["bank"])) > 15.0 and not s["crashed"]:
		crash(s, "大きく傾いたまま接地（翼端接触）")

static func runwayChecks(s: Dictionary) -> void:
	var n = -float(s["pos"][2]); var e = float(s["pos"][0])
	var onR = onRunway(lab_rwy(), n, e)
	var gsMs = sqrt(float(s["vel"][0]) * float(s["vel"][0]) + float(s["vel"][2]) * float(s["vel"][2]))
	if s["onGround"] and onR:
		s["wasOnRunway"] = true; s["lastRwyT"] = s["t"]
	if s["onGround"] and not onR and s["wasOnRunway"] and gsMs > 1.5 and float(s["t"]) - float(s["lastRwyT"]) < 30.0 and not s["_excursion"] and pavedAt(n, e) == null:
		s["_excursion"] = true
		(s["events"] as Array).append({"t": s["t"], "type": "runway_excursion"})
	if not s["onGround"] and float(s["airTime"]) > 5.0:
		s["wasOnRunway"] = false; s["_excursion"] = false

static func derive(s: Dictionary) -> Dictionary:
	var o: Dictionary = {}
	s["out"] = o
	var A: Dictionary = s["A"]
	var a = attitude(s)
	var atm = atmos(float(s["pos"][1]), float(s["oatDev"]))
	var wnd = windNow(s)
	var va = vsub(s["vel"], wnd)
	var V = vlen(va)
	var vb = qrot(qconj(s["q"]), va)
	o["tas"] = V * KT; o["ias"] = V * sqrt(float(atm["sigma"])) * KT * (1.0 if float(vb[2]) < 0.0 else 0.0)
	o["pitotIce"] = float(s.get("pitotIce", 0.0)); o["pitotBlocked"] = float(s.get("pitotIce", 0.0)) >= 0.999
	if o["pitotBlocked"]:
		if s["_iasFrz"] == null:
			s["_iasFrz"] = o["ias"]
		o["ias"] = s["_iasFrz"]
	else:
		s["_iasFrz"] = null
		if float(o["pitotIce"]) > 0.0:
			o["ias"] = float(o["ias"]) * (1.0 - 0.8 * float(o["pitotIce"]))
	o["staticBlocked"] = bool(s["staticBlocked"]) and not bool(s["altStatic"]); o["altStatic"] = bool(s["altStatic"])
	o["gs"] = sqrt(float(s["vel"][0]) * float(s["vel"][0]) + float(s["vel"][2]) * float(s["vel"][2])) * KT
	o["trk"] = wrap360(atan2(float(s["vel"][0]), -float(s["vel"][2])) / DEG) if float(o["gs"]) > 1.0 else a["hdg"]
	o["hdgTrue"] = a["hdg"]; o["pitch"] = a["pitch"]; o["bank"] = a["bank"]
	o["vsi"] = float(s["vel"][1]) * 196.85
	o["altTrue"] = float(s["pos"][1]) * FT
	o["agl"] = (float(s["pos"][1]) + float(s["WHEEL_BOTTOM"]) - GROUND_M) * FT
	if o["staticBlocked"]:
		if s["_altFrz"] == null:
			s["_altFrz"] = o["altTrue"]
		o["altTrue"] = s["_altFrz"]; o["vsi"] = 0.0
	else:
		s["_altFrz"] = null
	if bool(s["altStatic"]) and bool(s["staticBlocked"]):
		o["altTrue"] = float(o["altTrue"]) + 80.0
	o["alpha"] = atan2(-float(vb[1]), -float(vb[2])) / DEG if V > 2.0 else 0.0
	o["beta"] = asin(clampf_(float(vb[0]) / V, -1.0, 1.0)) / DEG if V > 2.0 else 0.0
	var flapF: float = float(s["flapDeg"]) / 30.0 if (A["wing"] as Dictionary).has("flap") else 0.0
	o["aStall"] = (float(s["AC"]["aStall"]) - float(s["AC"]["flapStall"]) * flapF) / DEG
	o["aoaFrac"] = clampf_((float(o["alpha"]) + 4.0) / (float(o["aStall"]) + 4.0), 0.0, 1.2)
	o["stallWarn"] = s["stallWarn"]
	o["slip"] = clampf_(float(o["beta"]) * 0.35, -1.5, 1.5)
	var windD: Dictionary = s["wind"]
	o["windFrom"] = windD.get("fromDeg", 0.0)
	o["windKt"] = sqrt(wnd[0] * wnd[0] + wnd[2] * wnd[2]) * KT
	o["rpm"] = s["rpm"]
	var rpms: Array = []; var mags: Array = []; var mixs: Array = []; var sels: Array = []; var egts: Array = []; var manIns: Array = []; var oilPs: Array = []; var oilTs: Array = []; var oilQs: Array = []; var fuelPresses: Array = []; var cylsAll: Array = []
	for e in s["eng"]:
		rpms.append(float(e.get("rpm", 0.0)))
		mags.append(e.get("mag", "BOTH"))
		mixs.append(float(e.get("lev", e.get("mix", 1.0))))
		sels.append(e.get("sel", "L"))
		egts.append(int(round(float(e.get("egt", 0.0)))))
		manIns.append(snappedf(float(e.get("manIn", 0.0)), 0.1))
		oilPs.append(int(round(float(e.get("oilP", 0.0)))))
		oilTs.append(int(round(float(e["oilT"]) if e.get("oilT", null) != null else (float(atm["T"]) - 273.15) * 9.0 / 5.0 + 32.0)))
		oilQs.append(snappedf(float(e.get("oilQ", 7.0)), 0.1))
		fuelPresses.append(snappedf(float(e.get("fuelPress", 0.0)), 0.01))
		var cylArr: Array = []
		if e.get("cyl", null) != null:
			for c in e["cyl"]:
				cylArr.append({"egt": int(round(float(c["egt"]))), "cht": int(round(float(c["cht"])))})
		cylsAll.append(cylArr)
	o["rpms"] = rpms; o["mags"] = mags; o["mixs"] = mixs; o["fuelSels"] = sels
	o["fuelFlow"] = float(s.get("fuelFlow", 0.0)); o["fuel"] = (s["fuel"] as Array).duplicate()
	o["mag"] = mags[0] if mags.size() else "BOTH"; o["mix"] = mixs[0] if mixs.size() else 1.0; o["fuelSel"] = sels[0] if sels.size() else "L"
	o["cranking"] = false
	for e in s["eng"]:
		if e.get("on", true) == false and e.get("mag", "BOTH") == "START":
			o["cranking"] = true
	var pwD = maxf(0.0, 1.132 * float(atm["sigma"]) - 0.132)
	if engineRunning(s):
		var acc = 0.0
		for e in s["eng"]:
			if e["run"]:
				acc += (0.04 + 0.96 * (float(e["thr"]) if e.get("thr", null) != null else float(s["thr"]))) * pwD * (1.0 if e.get("mixK", null) == null else float(e["mixK"]))
		o["powerPct"] = int(round(acc / float((s["eng"] as Array).size()) * 100.0))
	else:
		o["powerPct"] = 0
	o["egts"] = egts; o["egt"] = egts[0] if egts.size() else 0
	o["manIns"] = manIns; o["manIn"] = manIns[0] if manIns.size() else 0.0
	var rough = 0.0; var carbIce = 0.0
	for e in s["eng"]:
		rough = maxf(rough, float(e.get("rough", 0.0))); carbIce = maxf(carbIce, float(e.get("carbIce", 0.0)))
	o["rough"] = rough; o["carbIce"] = carbIce
	o["oilP"] = oilPs; o["oilT"] = oilTs; o["oilQ"] = oilQs
	o["lowOilPress"] = false
	for e in s["eng"]:
		if e["run"] and float(e.get("oilP", 0.0)) < 30.0:
			o["lowOilPress"] = true
	o["fuelPress"] = fuelPresses[0] if fuelPresses.size() else 0.0; o["fuelPresses"] = fuelPresses
	o["fuelUsed"] = snappedf(float(s.get("fuelUsed", 0.0)), 0.1)
	o["fuelRemain"] = snappedf(float(s["fuel"][0]) + float(s["fuel"][1]), 0.1)
	o["enduranceH"] = snappedf(float(o["fuelRemain"]) / float(s["fuelFlow"]), 0.1) if float(s.get("fuelFlow", 0.0)) > 0.2 else null
	o["cyl"] = cylsAll[0] if cylsAll.size() else []
	o["cyls"] = cylsAll
	o["cht"] = 0
	if (o["cyl"] as Array).size():
		var acc2 = 0.0
		for c in o["cyl"]:
			acc2 += float(c["cht"])
		o["cht"] = int(round(acc2 / float((o["cyl"] as Array).size())))
	var chts: Array = []
	for cs in cylsAll:
		if (cs as Array).size():
			var acc3 = 0.0
			for c in cs:
				acc3 += float(c["cht"])
			chts.append(int(round(acc3 / float((cs as Array).size()))))
		else:
			chts.append(0)
	o["chts"] = chts
	o["gearFault"] = bool(s["gearFault"]); o["gearEmerg"] = bool(s["gearEmerg"]); o["xfeed"] = bool(s["xfeed"])
	o["prop"] = float(s["prop"]) if s.get("prop", null) != null else 1.0
	o["propK"] = 1.0 if (s["eng"] as Array).is_empty() else (1.0 if (s["eng"][0] as Dictionary).get("propK", null) == null else snappedf(float(s["eng"][0]["propK"]), 0.01))
	o["govRpm"] = int(round(float(A["propGov"][0]) + (float(A["propGov"][1]) - float(A["propGov"][0])) * clampf_(float(o["prop"]), 0.0, 1.0))) if A.get("propCtrl", false) else null
	o["volts"] = snappedf(float(s["elec"]["volts"]), 0.1); o["amps"] = s["elec"]["amps"]; o["hobbs"] = snappedf(float(s["hobbs"]), 0.1)
	o["oat"] = float(atm["T"]) - 273.15; o["g"] = s["gLoad"]; o["densAlt"] = float(s.get("densAlt", 0.0)) * FT
	var n = -float(s["pos"][2]); var e = float(s["pos"][0])
	o["onRunway"] = onRunway(lab_rwy(), n, e)
	var rc = rwyCoords(lab_rwy(), n, e)
	o["rwyAlong"] = rc["along"]; o["rwyCross"] = rc["cross"]
	var wSqrt = sqrt(float(s["AC"]["mass"]) / float(A["phys"]["mass"]))
	o["vs0"] = snappedf(float(A["v"]["s0"]) * wSqrt, 0.1); o["vs1"] = snappedf(float(A["v"]["s1"]) * wSqrt, 0.1)
	o["flapLabel"] = A["flapLabels"][int(s["flapIdx"])]; o["gearDown"] = s["gearDown"]; o["gearPos"] = s["gearPos"]
	return o

# ---------------------------------------------------------------- one step
static func _contact(ctx: Dictionary, off: Array, k: float, c: float, kind: String, name: String, isNose: bool) -> bool:
	var s: Dictionary = ctx["s"]
	var AC: Dictionary = s["AC"]
	var q: Array = s["q"]; var qi: Array = ctx["qi"]
	var rw = qrot(q, off)
	var cp = vadd(s["pos"], rw)
	var g = groundAt(float(cp[0]), float(cp[2]))
	var pen: float = float(g["h"]) - float(cp[1])
	if pen <= 0.0:
		return false
	if g["water"]:
		crash(s, "湖に墜落しました" if kind == "hard" else "湖に着水してしまいました")
		return true
	var wW: Array = ctx["wW"]
	var vc = vadd(s["vel"], vcross(wW, rw))
	var gn: Array = g["n"]
	var vn = vdot(vc, gn)
	var crashPen: float = ctx["crashPen"]
	if kind == "hard":
		crash(s, name + "が地面に接触しました")
		return true
	if kind == "wheel" and (pen > crashPen or vn < -5.08):
		crash(s, "接地の衝撃で脚が壊れました（降下率 %d fpm、教材基準 1,000 fpm 超）" % int(round(-vn * 196.85)))
		return true
	if kind == "skid" and vn < -4.0:
		crash(s, "尾部を強く打ちつけました")
		return true
	if kind == "skid" and not s["tailTouch"]:
		s["tailTouch"] = true
		(s["events"] as Array).append({"t": s["t"], "type": "tail_strike"})
	var Fn = maxf(0.0, k * pen - c * vn)
	var fb = [0.0, 0.0, -1.0]
	if isNose:
		fb = [sin(float(ctx["steer"])), 0.0, -cos(float(ctx["steer"]))]
	var fwd = qrot(q, fb)
	fwd = vnorm(vsub(fwd, vscale(gn, vdot(fwd, gn))))
	var lat = vnorm(vcross(gn, fwd))
	var vl = vdot(vc, fwd); var vt = vdot(vc, lat)
	var mu = (0.5 if kind == "skid" else (0.85 if g["paved"] else 0.6)) * (float(ctx["wetF"]) if kind == "wheel" else 1.0)
	var bCoef = 0.0; var locked = false
	if kind == "wheel" and not isNose:
		var bw: float = float(ctx["bL"]) if float(off[0]) < 0.0 else float(ctx["bR"])
		bCoef = bw * (0.42 if g["paved"] else 0.3)
		if bw > 0.85 and mu < 0.6:
			locked = true; bCoef *= 0.65; s["wheelLock"] = true
	var rr = 0.5 if kind == "skid" else (0.02 if g["paved"] else 0.05) + bCoef
	var lim = (mu * 0.6 if locked else mu) * Fn
	var Ft = clampf_(-vt * 9.0 * float(AC["mass"]), -lim, lim)
	var Fl = clampf_(-vl * 6.0 * float(AC["mass"]), -rr * Fn, rr * Fn)
	var Fc = vadd(vadd(vscale(gn, Fn), vscale(fwd, Fl)), vscale(lat, Ft))
	var Fw: Array = ctx["Fw"]; var Tw: Array = ctx["Tw"]
	Fw[0] += Fc[0]; Fw[1] += Fc[1]; Fw[2] += Fc[2]
	var tq = vcross(rw, Fc)
	Tw[0] += tq[0]; Tw[1] += tq[1]; Tw[2] += tq[2]
	ctx["yLoad"] = float(ctx["yLoad"]) + vdot(qrot(qi, Fc), [0.0, 1.0, 0.0])
	return true

static func step(s: Dictionary, dt: float) -> Dictionary:
	if s["crashed"]:
		derive(s); return s
	var A: Dictionary = s["A"]; var AC: Dictionary = s["AC"]
	s["t"] = float(s["t"]) + dt
	if s.get("trimTgt", null) != null:
		var dd: float = float(s["trimTgt"]) - float(s["trim"]); var mm = 0.6 * dt
		if absf(dd) <= mm:
			s["trim"] = s["trimTgt"]; s["trimTgt"] = null
		else:
			s["trim"] = float(s["trim"]) + signf_(dd) * mm
	if float(s["opts"].get("levelT", 0.0)) > 0.0:
		s["opts"]["levelT"] = float(s["opts"]["levelT"]) - dt
	s["flapDeg"] = float(s["flapDeg"]) + clampf_(FLAP_DEG[int(s["flapIdx"])] - float(s["flapDeg"]), -8.0 * dt, 8.0 * dt)
	if A["gear"]["fixed"]:
		s["gearDown"] = true; s["gearPos"] = 1.0
	elif s["gearEmerg"]:
		s["gearDown"] = true; s["gearEmergT"] = float(s["gearEmergT"]) + dt
		if float(s["gearEmergT"]) > 1.2:
			s["gearPos"] = clampf_(float(s["gearPos"]) + dt / 3.0, 0.0, 1.0)
	elif not (bool(s["onGround"]) and not bool(s["gearDown"])):
		var tgt: float = (0.55 if s["gearFault"] else 1.0) if s["gearDown"] else 0.0
		s["gearPos"] = clampf_(float(s["gearPos"]) + clampf_(tgt - float(s["gearPos"]), -dt / 6.0, dt / 6.0), 0.0, 1.0)
	var flapF: float = float(s["flapDeg"]) / 30.0 if (A["wing"] as Dictionary).has("flap") else 0.0
	var atm = atmos(float(s["pos"][1]), float(s["oatDev"]))
	var rho = float(atm["rho"])
	var ground = groundAt(float(s["pos"][0]), float(s["pos"][2]))
	var agl: float = float(s["pos"][1]) + float(s["WHEEL_BOTTOM"]) - float(ground["h"])
	var qi = qconj(s["q"])
	var vb = qrot(qi, vsub(s["vel"], windAt(s, float(s["t"]), agl + 2.0)))
	var V = vlen(vb); var u = -float(vb[2])
	var alpha = atan2(-float(vb[1]), u)
	var beta = asin(clampf_(float(vb[0]) / V, -1.0, 1.0)) if V > 0.5 else 0.0
	var qd = 0.5 * rho * V * V
	if float(s["mix"]) != float(s["_mixCmd"]):
		s["_mixCmd"] = s["mix"]
		for e in s["eng"]:
			e["mix"] = s["mix"]
	if str(s["fuelSel"]) != str(s["_selCmd"]):
		s["_selCmd"] = s["fuelSel"]
		for e in s["eng"]:
			e["sel"] = s["fuelSel"]
	var engArr: Array = s["eng"]
	for ei in range(engArr.size()):
		var e: Dictionary = engArr[ei]
		e["lev"] = float(e.get("mix", 1.0))
		var mag = str(e.get("mag", "BOTH")); var sel = str(e.get("sel", "L"))
		if engArr.size() > 1:
			var onArr: Array = []
			for x in engArr:
				onArr.append(str(x.get("sel", "ON")) != "OFF")
			e["feed"] = ei if onArr[ei] else ((1 - ei) if (bool(s["xfeed"]) and onArr[1 - ei]) else -1)
		else:
			e["feed"] = -1 if sel == "OFF" else (1 if sel == "R" else 0)
		if int(e["feed"]) >= 0 and float(s["fuel"][int(e["feed"])]) > 0.0:
			e["lineT"] = LINE_FUEL_S
		else:
			e["lineT"] = maxf(0.0, float(e.get("lineT", LINE_FUEL_S)) - dt)
		e["feedOk"] = (int(e["feed"]) >= 0 and float(s["fuel"][int(e["feed"])]) > 0.0) or float(e["lineT"]) > 0.0
		var pTgtP: float
		if not e["run"]:
			pTgtP = 0.35 if s["boostPump"] else 0.0
		elif e.get("pumpFail", false):
			pTgtP = 0.85 if s["boostPump"] else (0.3 if float(e.get("rpm", 0.0)) > 1200.0 else 0.0)
		else:
			pTgtP = 1.0
		e["fuelPress"] = float(e.get("fuelPress", 0.0)) + (pTgtP - float(e.get("fuelPress", 0.0))) * minf(1.0, dt * 2.0)
		var stop = 0
		if e.get("failed", false) or e.get("cut", false):
			stop = 1
		elif mag == "OFF":
			stop = 2
		elif float(e["lev"]) <= MIX_CUT:
			stop = 3
		elif not e["feedOk"]:
			stop = 4
		if stop != 0:
			e["on"] = false; e["crankT"] = 0.0
		elif e.get("on", true) == false and mag == "START" and float(e["lev"]) >= MIX_RICH:
			e["crankT"] = float(e.get("crankT", 0.0)) + dt
			if float(e["crankT"]) >= CATCH_S:
				e["on"] = true; e["crankT"] = 0.0
		else:
			e["crankT"] = 0.0
		e["run"] = e.get("on", true) != false and stop == 0
	if not engArr[0]["run"] and not s["engStopNoted"] and int(A.get("engines1", 1)) == 1:
		var e0: Dictionary = engArr[0]
		s["engStopNoted"] = true
		var why = "故障（教材の想定）" if e0.get("failed", false) else ("ミクスチャー カットオフ" if (e0.get("cut", false) or float(e0["lev"]) <= MIX_CUT) else ("マグネトー OFF" if str(e0.get("mag", "BOTH")) == "OFF" else ("燃料セレクター OFF" if str(e0.get("sel", "L")) == "OFF" else "燃料切れ")))
		(s["events"] as Array).append({"t": s["t"], "type": "engine_stop", "why": why})
	s["dead"] = not engineRunning(s)
	var thrOf = func(e: Dictionary) -> float: return float(e["thr"]) if e.get("thr", null) != null else float(s["thr"])
	var nE = engArr.size()
	var runShare = 0.0
	for e in engArr:
		runShare += (thrOf.call(e) if e["run"] else 0.0)
	runShare /= float(nE)
	var qdc = qd + 240.0 * runShare * sqrt(float(AC["mass"]) / 1000.0)
	var aS: float = float(AC["aStall"]) - float(AC["flapStall"]) * flapF
	var cl0: float = float(AC["CL0"]) + float(AC["flapCL"]) * flapF
	applyControls(s, V, alpha, qd, qdc, flapF, aS, cl0)
	if s.get("ovr", null) != null:
		s["elev"] = clampf_(float(s["ovr"]["elev"]), -1.0, 1.0); s["ail"] = clampf_(float(s["ovr"]["ail"]), -1.0, 1.0); s["rud"] = clampf_(float(s["ovr"]["rud"]), -1.0, 1.0)
	var F = [0.0, 0.0, 0.0]
	var EL: Dictionary = AC["el"]
	var Eng: Dictionary = AC["engine"]
	var pw = maxf(0.0, 1.132 * float(atm["sigma"]) - 0.132)
	var ua = maxf(u, 0.0)
	var T = 0.0; var Tasym = 0.0; var shaft = 0.0
	var xe: float = float(A["engines"][0].get("x", 0.0))
	var pAmbIn = float(atm["p"]) / 3386.39
	for ei in range(engArr.size()):
		var e: Dictionary = engArr[ei]
		var th = thrOf.call(e)
		var P1: float = float(Eng["P"]) / float(nE)
		var Ti = 0.0
		if not e["run"]:
			Ti = -(0.003 if e.get("feather", false) else 0.026 / float(nE)) * qd * float(AC["S"]) * pow(float(AC["mass"]) / 1050.0 / float(nE), 0.3)
			e["mixK"] = 0.0; e["powK"] = 0.0; e["rough"] = 0.0; e["ff"] = 0.0; e["shaftW"] = 0.0; e["manIn"] = pAmbIn
			var egtCur: float = float(e["egt"]) if e.get("egt", null) != null else 70.0
			e["egt"] = egtCur + ((float(atm["T"]) * 9.0 / 5.0 - 459.67) - egtCur) * minf(1.0, dt / 6.0)
		else:
			var mStr: float = float(e["lev"]) / sqrt(maxf(float(atm["sigma"]), 0.35))
			var mixK = 1.0 - 2.2 * pow(maxf(0.0, mStr - 1.06), 2.0) - 1.6 * pow(maxf(0.0, 0.93 - mStr), 2.0)
			if mStr < 0.62:
				mixK *= smoothstep_(0.45, 0.62, mStr)
			e["mixK"] = clampf_(mixK, 0.0, 1.0)
			e["rough"] = clampf_((0.74 - mStr) / 0.12, 0.0, 1.0)
			var carbK = 1.0
			if A.get("carb", false):
				var oatC = float(atm["T"]) - 273.15
				var band = clampf_((oatC + 7.0) / 19.0, 0.0, 1.0) * clampf_((26.0 - oatC) / 14.0, 0.0, 1.0)
				if s["carbHeat"]:
					e["carbIce"] = maxf(0.0, float(e.get("carbIce", 0.0)) - dt / 14.0)
				elif float(s["carbRisk"]) > 0.0 and band > 0.0:
					e["carbIce"] = minf(1.0, float(e.get("carbIce", 0.0)) + dt * float(s["carbRisk"]) * band * (1.3 - 0.8 * th) / 200.0)
				if float(e.get("carbIce", 0.0)) > 0.45 and not e.get("iceNoted", false):
					e["iceNoted"] = true
					(s["events"] as Array).append({"t": s["t"], "type": "carb_ice"})
				carbK = (1.0 - 0.5 * float(e.get("carbIce", 0.0))) * ((0.94 - 0.08 * float(e.get("carbIce", 0.0))) if s["carbHeat"] else 1.0)
				if float(e.get("carbIce", 0.0)) > 0.45:
					e["rough"] = maxf(float(e["rough"]), 0.7)
			e["powK"] = float(e["mixK"]) * carbK
			if A.get("propCtrl", false):
				var govA: Array = A["propGov"]
				var gov: float = float(govA[0]) + (float(govA[1]) - float(govA[0])) * clampf_(1.0 if s.get("prop", null) == null else float(s["prop"]), 0.0, 1.0)
				e["propK"] = pow(gov / float(govA[1]), 0.55); e["powK"] = float(e["powK"]) * float(e["propK"])
			else:
				e["propK"] = 1.0
			var mag2 = str(e.get("mag", "BOTH"))
			var magEgt = 0.0
			if mag2 == "L" or mag2 == "R":
				e["powK"] = float(e["powK"]) * 0.97; e["rough"] = clampf_(float(e["rough"]) + 0.3, 0.0, 1.0); magEgt = 18.0
			if e.get("magBad", null) != null and (mag2 == "BOTH" or mag2 == str(e["magBad"])):
				e["powK"] = float(e["powK"]) * 0.96
				if float(e.get("rpm", 0.0)) > 1700.0:
					e["rough"] = maxf(float(e["rough"]), 0.55)
			if e.get("pumpFail", false) and float(e.get("fuelPress", 0.0)) < 0.08:
				e["pressT"] = float(e.get("pressT", 0.0)) + dt
				if float(e["pressT"]) > 2.5:
					e["on"] = false; e["powK"] = 0.0
			else:
				e["pressT"] = 0.0
			if e.get("pumpFail", false):
				e["powK"] = float(e["powK"]) * clampf_(float(e.get("fuelPress", 0.0)) * 1.3, 0.05, 1.0)
				if float(e.get("fuelPress", 0.0)) < 0.3:
					e["rough"] = maxf(float(e["rough"]), 0.6)
			Ti = propThrust(AC, th, ua, pw, float(nE)) * float(e["powK"]) - (1.0 - th) * 2.5 * ua * float(AC["mass"]) / 1000.0 / float(nE)
			if float(e["rough"]) > 0.0:
				Ti *= 1.0 + float(e["rough"]) * 0.05 * sin(float(s["t"]) * 39.0 + float(ei) * 2.4)
			e["shaftW"] = (0.04 + 0.96 * th) * pw * P1 / 0.85 * float(e["powK"])
			shaft += float(e["shaftW"])
			var pf = (0.04 + 0.96 * th) * pw * float(e["mixK"])
			var egtT = 980.0 + 300.0 * pf + 330.0 * pow(maxf(pf, 0.0), 0.7) * exp(-pow((mStr - 0.86) / 0.15, 2.0)) + magEgt
			var egtNow: float = float(e["egt"]) if e.get("egt", null) != null else egtT
			e["egt"] = egtNow + (egtT - egtNow) * minf(1.0, dt / 2.5)
			e["manIn"] = minf(pAmbIn * (0.30 + 0.68 * th), pAmbIn - 0.3)
			if A.get("propCtrl", false) and th > 0.05:
				e["manIn"] = minf(float(e["manIn"]) + (1.0 - clampf_(1.0 if s.get("prop", null) == null else float(s["prop"]), 0.0, 1.0)) * 1.5, pAmbIn - 0.3)
			e["ffK"] = clampf_(0.15 + 0.85 * pow(float(e["lev"]), 1.2), 0.0, 1.0)
		e["T"] = Ti; T += Ti
		if nE == 2:
			Tasym += (1.0 if ei == 1 else -1.0) * Ti * xe
	s["shaftP"] = shaft; s["thrust"] = T; s["rho"] = rho; s["oat"] = float(atm["T"]) - 273.15; s["nProp"] = 0.0
	s["densAlt"] = (1.0 - pow(minf(float(atm["sigma"]), 1.2), 0.234969)) * 44330.8
	F[2] -= T
	var p = -float(s["w"][2]); var qq = float(s["w"][0]); var r = -float(s["w"][1])
	var hv = 0.25 * rho * V
	var elevEff = clampf_(float(s["elev"]) + float(s["trim"]), -1.0, 1.0)
	var Nx: float = qd * float(AC["S"]) * float(AC["b"]) * float(EL["dCnda"]) * float(s["ail"]) + hv * float(AC["S"]) * float(AC["b"]) * float(AC["b"]) * float(EL["dCnp"]) * p - Tasym
	var Rl = 0.0; var Ng = 0.0; var Gp = 0.0
	if nE == 2:
		Rl += -Tasym * 0.08
		Rl += -(float(s["fuel"][0]) - float(s["fuel"][1])) * 2.72 * G * 1.05
	var Pr: Dictionary = AC["prop"]
	var Tp = maxf(T, 0.0)
	s["nProp"] = -(Tp * (float(Pr["a0"]) + float(Pr["a1"]) * clampf_(alpha, -0.1, 0.35) + float(Pr["a1"]) * 0.35 * clampf_(beta, -0.25, 0.25))) + float(Pr["fin"]) * qd
	Nx += float(s["nProp"])
	Rl += -float(EL["finYZ"]) * (-Tp * float(Pr["a0"]) + float(Pr["fin"]) * qd)
	var om = maxf(float(s["rpm"]), 300.0) * PI / 30.0
	Rl += -(float(s["shaftP"])) / om * float(Pr["tq"]) + float(Pr["rig"]) * qd
	Ng = float(Pr["Ip"]) * om * qq * (0.0 if A.get("counterRotating", false) else 1.0)
	Gp = 0.18 * float(Pr["Ip"]) * om * r * (0.0 if A.get("counterRotating", false) else 1.0)
	var autoR: bool = bool(s["assistOn"]) or bool(s["opts"].get("autoRud", false))
	var rAuth = maxf(qdc * float(AC["S"]) * float(AC["b"]) * float(AC["Cndr"]), 1.0)
	s["rudNeed"] = clampf_(-(Nx + Ng) / rAuth, -1.0, 1.0)
	var yd = 0.0
	if autoR and not s["onGround"] and V > 10.0:
		var rgt = qrot(s["q"], [1.0, 0.0, 0.0]); var upv = qrot(s["q"], [0.0, 1.0, 0.0])
		var sbv = -float(rgt[1]) / sqrt(float(rgt[1]) * float(rgt[1]) + float(upv[1]) * float(upv[1]))
		yd = -clampf_(1.5 * float(AC["I"][2]) / rAuth, 0.8, 20.0) * (r - G * sbv / V)
	s["rudAuto"] = clampf_(-(Nx + Ng) / rAuth + 1.5 * beta + yd, -1.0, 1.0) * ((V / 8.0 if V < 8.0 else 1.0) if s["onGround"] else 1.0) if autoR else 0.0
	var rudEff = clampf_(float(s["rud"]) + float(s["rudAuto"]), -1.0, 1.0)
	var upB = qrot(qi, [0.0, 1.0, 0.0])
	var hCG: float = float(s["pos"][1]) - float(ground["h"])
	var gA: float = float(s["wind"].get("gust", 1.0)) * minf(1.0, maxf(agl, 0.0) / 300.0 + 0.4) * 0.9 * (0.12 + 0.88 * smoothstep_(3.0, 40.0, agl)) + float(s["wind"].get("gust", 1.0)) * (float(s["wind"].get("kt", 0.0)) / KT) * 0.0005 * exp(-maxf(agl, 0.0) / 20.0)
	var gW = perlin(float(s["t"]) * 0.9, 23.1) * gA / (float(AC["b"]) / 2.0)
	var gT = perlin(float(s["t"]) * 0.7, 41.9) * gA * 0.2
	var stH: Array = s["_stH"] if (s.get("_stH", null) != null and (s["_stH"] as Array).size() == (EL["pcs"] as Array).size()) else _new_sth((EL["pcs"] as Array).size())
	s["_stH"] = stH
	var hgtFn = func(pc: Dictionary) -> float: return hCG + float(pc["r"][0]) * upB[0] + float(pc["r"][1]) * upB[1] + float(pc["r"][2]) * upB[2]
	var gustFn = func(pc: Dictionary) -> Array:
		var gg: float = gW * float(pc["r"][0]) if pc["kind"] == 0 else (gT if pc["kind"] == 1 else 0.0)
		return [upB[0] * gg, upB[1] * gg, upB[2] * gg]
	var ae = aeroElements(EL, AC, vb, s["w"], rho, {
		"flapF": flapF, "elev": elevEff, "ail": float(s["ail"]), "rud": rudEff, "dq": 240.0 * runShare * sqrt(float(AC["mass"]) / 1000.0),
		"stH": stH, "dt": dt, "hgt": hgtFn, "gust": gustFn,
	})
	var stallW = float(ae["stallW"])
	var hx = maxf(agl + 1.3, 0.3) / float(AC["b"])
	var ge = (16.0 * hx * hx) / (1.0 + 16.0 * hx * hx)
	var CDp: float = float(AC["CD0"]) + (0.02 * flapF + 0.05 * flapF * flapF) * float(AC.get("flapCD", 1.0)) + float(AC["CDgear"]) * float(s["gearPos"]) + 0.6 * beta * beta
	F[0] += float(ae["F"][0]) + qd * float(AC["S"]) * float(EL["dCY"]) * beta
	F[1] += float(ae["F"][1]); F[2] += float(ae["F"][2])
	if V > 0.3:
		var kk = qd * float(AC["S"]) * CDp / V
		F[0] -= float(vb[0]) * kk; F[1] -= float(vb[1]) * kk; F[2] -= float(vb[2]) * kk
	var ln = sqrt(float(vb[1]) * float(vb[1]) + float(vb[2]) * float(vb[2]))
	if ln == 0.0:
		ln = 1.0
	var qs = maxf(qd * float(AC["S"]), 1e-6)
	s["liftN"] = (float(ae["F"][1]) * -float(vb[2]) + float(ae["F"][2]) * float(vb[1])) / ln
	s["dragN"] = -(F[0] * float(vb[0]) + F[1] * float(vb[1]) + (F[2] + T) * float(vb[2])) / maxf(V, 1e-3)
	s["CL"] = ae["CLw"]; s["CD"] = float(s["dragN"]) / qs; s["ge"] = ge
	var Mp: float = float(ae["M"][0]) + qd * float(AC["S"]) * float(AC["c"]) * (float(AC["Cm0"]) + float(EL["dCma"]) * sin(alpha) + float(EL["dCmF"]) * flapF) + hv * float(AC["S"]) * float(AC["c"]) * float(AC["c"]) * float(EL["dCmq"]) * qq - Gp
	var Lr: float = -float(ae["M"][2]) + hv * float(AC["S"]) * float(AC["b"]) * float(AC["b"]) * (float(EL["dClp"]) * p + float(EL["dClr"]) * r) + Rl
	if stallW > 0.15:
		Lr += qd * float(AC["S"]) * float(AC["b"]) * 0.012 * stallW * perlin(float(s["t"]) * 1.3, 12.5)
	var Nr: float = -float(ae["M"][1]) + hv * float(AC["S"]) * float(AC["b"]) * float(AC["b"]) * float(EL["dCnr"]) * r + Nx + Ng
	var Tb = [Mp, -Nr, -Lr]
	var Fw = qrot(s["q"], F)
	var Tw = [0.0, 0.0, 0.0]
	var wW = qrot(s["q"], s["w"])
	var gsp = sqrt(float(s["vel"][0]) * float(s["vel"][0]) + float(s["vel"][2]) * float(s["vel"][2]))
	var steer = clampf_(float(s["rud"]) + float(s["rIn"]) * 0.5, -1.0, 1.0) * lerpf_(32.0, 4.0, clampf_(gsp / 25.0, 0.0, 1.0)) * DEG
	var crashPen = maxf(0.5, float(A["gear"]["wheelR"]) * 1.4)
	var wetF = lerpf_(1.0, 0.55, clampf_(float(s.get("surfaceWet", 0.0)), 0.0, 1.0))
	var bAmt = 0.0
	if s["brake"] is bool:
		bAmt = 1.0 if s["brake"] else 0.0
	elif s["brake"] is float or s["brake"] is int:
		bAmt = clampf_(float(s["brake"]), 0.0, 1.0)
	var bL = clampf_(float(s["brakeL"]), 0.0, 1.0) if s.get("brakeL", null) != null else bAmt
	var bR = clampf_(float(s["brakeR"]), 0.0, 1.0) if s.get("brakeR", null) != null else bAmt
	if s.get("brakeL", null) == null and s.get("brakeR", null) == null and bool(s["opts"].get("diffBrake", true)) and bAmt > 0.0:
		var sp2 = clampf_(float(s["rud"]), -1.0, 1.0) * 0.6 * clampf_(1.0 - gsp / 15.0, 0.0, 1.0)
		if sp2 > 0.0:
			bR = clampf_(bAmt * (1.0 + sp2), 0.0, 1.0); bL = clampf_(bAmt * (1.0 - sp2), 0.0, 1.0)
		elif sp2 < 0.0:
			bL = clampf_(bAmt * (1.0 - sp2), 0.0, 1.0); bR = clampf_(bAmt * (1.0 + sp2), 0.0, 1.0)
	s["wheelLock"] = false
	var ctx = {"s": s, "Fw": Fw, "Tw": Tw, "yLoad": F[1], "qi": qi, "wW": wW, "steer": steer, "crashPen": crashPen, "wetF": wetF, "bL": bL, "bR": bR}
	var reach = maxf(8.0, float(AC["b"]) * 0.6)
	if agl < reach:
		var wheels: Array = s["WHEELS"]
		for i in range(wheels.size()):
			s["contacts"][i] = _contact(ctx, wheels[i]["off"], float(wheels[i]["k"]), float(wheels[i]["c"]), "wheel", "", i == 0) if float(s["gearPos"]) > 0.98 else false
		_contact(ctx, s["TAILSKID"]["off"], float(s["TAILSKID"]["k"]), float(s["TAILSKID"]["c"]), "skid", "", false)
		for hpt in s["HARDPTS"]:
			if s["crashed"]:
				break
			_contact(ctx, hpt["off"], 0.0, 0.0, "hard", str(hpt["name"]), false)
	else:
		var cs: Array = s["contacts"]
		for i in range(cs.size()):
			cs[i] = false
	if s["crashed"]:
		derive(s); return s
	Fw[1] -= float(AC["mass"]) * G
	var savedPos: Array = s["pos"]; var savedVel: Array = s["vel"]; var savedQ: Array = s["q"]; var savedW: Array = (s["w"] as Array).duplicate()
	s["vel"] = vmadd(s["vel"], Fw, dt / float(AC["mass"]))
	s["pos"] = vmadd(s["pos"], s["vel"], dt)
	var Tt = vadd(Tb, qrot(qi, Tw))
	var Iw = [float(AC["I"][0]) * float(s["w"][0]), float(AC["I"][1]) * float(s["w"][1]), float(AC["I"][2]) * float(s["w"][2])]
	var gyro = vcross(s["w"], Iw)
	var wArr: Array = s["w"]
	for k in range(3):
		wArr[k] = float(wArr[k]) + (Tt[k] - gyro[k] - float(AC["I"][k]) * float(wArr[k]) * 0.05) / float(AC["I"][k]) * dt
	var dq = qmul(s["q"], [float(wArr[0]), float(wArr[1]), float(wArr[2]), 0.0])
	var qArr: Array = s["q"]
	s["q"] = qnorm([float(qArr[0]) + 0.5 * dt * dq[0], float(qArr[1]) + 0.5 * dt * dq[1], float(qArr[2]) + 0.5 * dt * dq[2], float(qArr[3]) + 0.5 * dt * dq[3]])
	var finite = true
	for v in (s["pos"] as Array) + (s["vel"] as Array) + (s["q"] as Array) + wArr:
		if not is_finite(float(v)):
			finite = false
	if not finite:
		s["pos"] = savedPos; s["vel"] = savedVel; s["q"] = savedQ; s["w"] = savedW
		crash(s, "機体が制御不能になりました")
		derive(s); return s
	var wasMain: bool = s["mainContact"]; var wasGround: bool = s["onGround"]
	s["mainContact"] = false
	for i in range((s["contacts"] as Array).size()):
		if s["contacts"][i] and i > 0:
			s["mainContact"] = true
	s["onGround"] = (s["contacts"] as Array).any(func(c: Variant) -> bool: return bool(c))
	if s["onGround"] and not wasGround:
		s["gndAir"] = s["airTime"]; s["gndVel"] = savedVel
		if float(s["airTime"]) > 1.5:
			s["firstWheel"] = (s["contacts"] as Array).find(true)
			s["tailTouch"] = false
	var air: float = (float(s["gndAir"]) if s.get("gndAir", null) != null else 0.0) if wasGround else float(s["airTime"])
	if bool(s["mainContact"]) and not wasMain and air > 1.5 and not (wasGround and s.get("td", null) != null and float(s["t"]) - float(s["td"]["t"]) < 5.0):
		onTouchdown(s, s["gndVel"] if wasGround else savedVel)
	elif bool(s["mainContact"]) and not wasMain and air > 0.25 and s.get("td", null) != null:
		s["td"]["bounces"] = int(s["td"]["bounces"]) + 1
	s["airTime"] = 0.0 if s["onGround"] else float(s["airTime"]) + dt
	s["alpha"] = alpha; s["beta"] = beta; s["tas"] = V; s["ias"] = V * sqrt(float(atm["sigma"])); s["rudEff"] = rudEff
	s["stallW"] = stallW; s["stallWarn"] = not s["onGround"] and V > 8.0 and alpha > aS - 0.045
	s["gLoad"] = lerpf_(float(s["gLoad"]), float(ctx["yLoad"]) / (float(AC["mass"]) * G), 0.1)
	s["agl"] = agl; s["vs"] = float(s["vel"][1])
	var rpmSum = 0.0
	for e in engArr:
		var rt: float = rpmFor(A, thrOf.call(e), u, pw * (0.3 + 0.7 * (1.0 if e.get("powK", null) == null else float(e["powK"]))), false, s.get("prop", null)) if e["run"] else (0.0 if e.get("feather", false) else rpmFor(A, 0.0, u, 1.0, true))
		e["rpm"] = float(e.get("rpm", 0.0)) + (rt - float(e.get("rpm", 0.0))) * minf(1.0, dt * 1.8)
		e["ang"] = fmod(float(e.get("ang", 0.0)) + float(e["rpm"]) / 60.0 * PI * 2.0 * dt, PI * 2.0)
		rpmSum += float(e["rpm"])
	s["rpm"] = rpmSum / float(nE)
	s["propAng"] = fmod(float(s["propAng"]) + float(s["rpm"]) / 60.0 * PI * 2.0 * dt, PI * 2.0)
	var ffT = 0.0
	for e in engArr:
		e["ff"] = (float(e.get("shaftW", 0.0)) / 745.7 * 0.078 * (1.0 if e.get("ffK", null) == null else float(e["ffK"]))) if e["run"] else 0.0
		ffT += float(e["ff"])
		if float(e["ff"]) > 0.0 and int(e["feed"]) >= 0 and float(s["fuel"][int(e["feed"])]) > 0.0:
			s["fuel"][int(e["feed"])] = maxf(0.0, float(s["fuel"][int(e["feed"])]) - float(e["ff"]) * dt / 3600.0)
	s["fuelFlow"] = ffT
	s["fuelUsed"] = float(s.get("fuelUsed", 0.0)) + ffT * dt / 3600.0
	var oatF = (float(atm["T"]) - 273.15) * 9.0 / 5.0 + 32.0
	var maxRpm = 0.0; var anyRun = false
	for e in engArr:
		if e.get("oilT", null) == null:
			e["oilT"] = oatF
		if e["run"]:
			e["oilQ"] = maxf(0.0, float(e.get("oilQ", 7.0)) - 0.08 * dt / 3600.0 * (0.5 + thrOf.call(e)))
		var pTgt = clampf_(55.0 + float(e.get("rpm", 0.0)) * 0.012, 0.0, 85.0) if e["run"] else 0.0
		if e["run"] and float(e.get("oilQ", 7.0)) < 2.5:
			pTgt *= clampf_(0.3 + 0.7 * (float(e.get("oilQ", 7.0)) / 2.5), 0.3, 1.0) * (0.8 if float(e.get("rpm", 0.0)) > 2000.0 else 1.0)
		if e.get("cyl", null) == null:
			var cyls: Array = []
			for ci in range(4):
				cyls.append({"egt": float(e.get("egt", 70.0)), "cht": oatF})
			e["cyl"] = cyls
		var egtSp = [0.96, 1.0, 1.07, 1.03]; var chtSp = [0.97, 1.0, 1.06, 1.02]
		var ci = 0
		for c in e["cyl"]:
			c["egt"] = float(c["egt"]) + ((float(e.get("egt", 70.0)) * egtSp[ci]) - float(c["egt"])) * minf(1.0, dt / 2.5)
			var chtT = oatF + ((215.0 + 195.0 * clampf_(thrOf.call(e), 0.0, 1.0)) * chtSp[ci] if e["run"] else 0.0)
			var tau: float = 150.0 if chtT > float(c["cht"]) else (45.0 if (thrOf.call(e) < 0.35 and u > 30.0) else 240.0)
			c["cht"] = float(c["cht"]) + (chtT - float(c["cht"])) * dt / tau
			ci += 1
		e["oilP"] = float(e.get("oilP", 0.0)) + (pTgt - float(e.get("oilP", 0.0))) * minf(1.0, dt * 1.5)
		var tTgt: float = (130.0 + 70.0 * clampf_(thrOf.call(e), 0.0, 1.0)) if e["run"] else oatF
		e["oilT"] = float(e["oilT"]) + (tTgt - float(e["oilT"])) * dt / (240.0 if e["run"] else 600.0)
		if e["run"]:
			anyRun = true
			if float(e["rpm"]) > maxRpm:
				maxRpm = float(e["rpm"])
	var el: Dictionary = s["elec"]
	var gen = 0.0 if el["altFail"] else clampf_((maxRpm - 500.0) / 500.0, 0.0, 1.0) * 55.0
	var net = gen - 11.0
	if net > 0.0 and float(el["batt"]) >= 1.0:
		net *= 0.06
	el["batt"] = clampf_(float(el["batt"]) + net * dt / (20.0 * 3600.0), 0.0, 1.0)
	var deadBus: bool = float(el["batt"]) <= 0.001 and gen <= 1.0
	el["volts"] = 0.0 if deadBus else (13.9 + 0.3 * (gen / 55.0) if gen > 1.0 else 11.3 + 1.5 * float(el["batt"]))
	el["amps"] = 0 if deadBus else int(round(net))
	if anyRun:
		s["hobbs"] = float(s["hobbs"]) + dt / 3600.0
	var oatC = float(atm["T"]) - 273.15
	if s["pitotHeat"]:
		s["pitotIce"] = maxf(0.0, float(s.get("pitotIce", 0.0)) - dt / 20.0)
	elif float(s.get("pitotRisk", 0.0)) > 0.0 and oatC > -12.0 and oatC < 6.0:
		s["pitotIce"] = minf(1.0, float(s.get("pitotIce", 0.0)) + dt * float(s["pitotRisk"]) / 90.0)
	runwayChecks(s)
	derive(s)
	return s

static func _new_sth(n: int) -> Array:
	var a: Array = []
	a.resize(n)
	for i in range(n):
		a[i] = 0.0
	return a
