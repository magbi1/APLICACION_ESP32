// Servidor web — ESP32 Studio
#include <WiFi.h>
#include <WebServer.h>

// En el simulador Wokwi usa "Wokwi-GUEST" sin contraseña
const char *SSID = "Wokwi-GUEST";
const char *PASS = "";
const int LED_PIN = 2;

WebServer server(80);
bool ledOn = false;

String page() {
  return String("<!doctype html><html><head><meta name=viewport content='width=device-width'>"
                "<style>body{font-family:sans-serif;background:#0b1220;color:#fff;text-align:center;padding:40px}"
                "a{display:inline-block;padding:14px 28px;margin:8px;border-radius:10px;background:#00b4d8;color:#fff;text-decoration:none}</style>"
                "</head><body><h1>ESP32</h1><p>LED: <b>") + (ledOn ? "ON" : "OFF") +
         "</b></p><a href='/on'>Encender</a><a href='/off'>Apagar</a></body></html>";
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  WiFi.begin(SSID, PASS);
  Serial.print("Conectando");
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
  }
  Serial.printf("\nIP: %s\n", WiFi.localIP().toString().c_str());

  server.on("/", []() { server.send(200, "text/html", page()); });
  server.on("/on", []() { ledOn = true; digitalWrite(LED_PIN, HIGH); server.sendHeader("Location", "/"); server.send(303); });
  server.on("/off", []() { ledOn = false; digitalWrite(LED_PIN, LOW); server.sendHeader("Location", "/"); server.send(303); });
  server.begin();
}

void loop() {
  server.handleClient();
  delay(2);
}
