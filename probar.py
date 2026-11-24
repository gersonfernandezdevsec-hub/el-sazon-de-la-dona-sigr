#!/usr/bin/env python3
import base64, json, os, socket, struct, subprocess, sys, tempfile, time, urllib.request

CHROME = os.environ.get("CHROME_BIN", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
BANDERAS_CI = ["--no-sandbox"] if os.environ.get("CI") else []
AQUI = os.path.dirname(os.path.abspath(__file__))
PUERTO = 9333


class Canal:

    def __init__(self, url):
        resto = url.split("://", 1)[1]
        anfitrion, ruta = resto.split("/", 1)
        host, puerto = anfitrion.split(":")
        self.s = socket.create_connection((host, int(puerto)), timeout=30)
        clave = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall((f"GET /{ruta} HTTP/1.1\r\nHost: {anfitrion}\r\nUpgrade: websocket\r\n"
                        f"Connection: Upgrade\r\nSec-WebSocket-Key: {clave}\r\nSec-WebSocket-Version: 13\r\n\r\n").encode())
        while b"\r\n\r\n" not in self.s.recv(4096):
            pass
        self.n = 0

    def _leer(self, cuantos):
        datos = b""
        while len(datos) < cuantos:
            datos += self.s.recv(cuantos - len(datos))
        return datos

    def evaluar(self, expresion):
        self.n += 1
        carga = json.dumps({"id": self.n, "method": "Runtime.evaluate",
                            "params": {"expression": expresion, "returnByValue": True}}).encode()
        mascara = os.urandom(4)
        cabecera = b"\x81" + (bytes([0x80 | len(carga)]) if len(carga) < 126 else b"\xfe" + struct.pack(">H", len(carga)))
        self.s.sendall(cabecera + mascara + bytes(b ^ mascara[i % 4] for i, b in enumerate(carga)))
        while True:
            _, largo = self._leer(2)
            largo &= 0x7F
            if largo == 126:
                largo = struct.unpack(">H", self._leer(2))[0]
            elif largo == 127:
                largo = struct.unpack(">Q", self._leer(8))[0]
            mensaje = json.loads(self._leer(largo))
            if mensaje.get("id") == self.n:
                return mensaje["result"]["result"].get("value")


def main():
    perfil = tempfile.mkdtemp(prefix="sazon-pruebas-")
    pagina = "file://" + os.path.join(AQUI, "pruebas", "pruebas.html")
    chrome = subprocess.Popen([CHROME, "--headless=new", "--disable-gpu", *BANDERAS_CI, f"--remote-debugging-port={PUERTO}",
                               "--remote-allow-origins=*", f"--user-data-dir={perfil}", pagina],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        url = None
        for _ in range(50):
            time.sleep(0.2)
            try:
                paginas = json.load(urllib.request.urlopen(f"http://127.0.0.1:{PUERTO}/json"))
                url = next(p["webSocketDebuggerUrl"] for p in paginas if p["type"] == "page")
                break
            except Exception:
                continue
        if not url:
            print("No se pudo conectar con Chrome.")
            return 2
        canal = Canal(url)
        titulo = ""
        for _ in range(300):
            titulo = canal.evaluar("document.title") or ""
            if titulo.startswith("PRUEBAS:"):
                break
            time.sleep(0.2)
        filas = json.loads(canal.evaluar(
            "JSON.stringify([...document.querySelectorAll('#resultados tr')].map(f=>[...f.children].map(c=>c.textContent)))") or "[]")
        for modulo, nombre, resultado in filas:
            if resultado != "OK":
                print(f"  {modulo} | {nombre} | {resultado}")
        print(titulo or "Las pruebas no terminaron.")
        return 0 if titulo.startswith("PRUEBAS:") and "falla" not in titulo else 1
    finally:
        chrome.terminate()


if __name__ == "__main__":
    sys.exit(main())
