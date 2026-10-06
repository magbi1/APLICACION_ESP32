// Escáner Wi-Fi — ESP32 Studio
#include <WiFi.h>

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);
}

void loop() {
  Serial.println("Escaneando...");
  int n = WiFi.scanNetworks();
  for (int i = 0; i < n; i++) {
    Serial.printf("%2d | %-32s | %4d dBm | canal %2d | %s\n", i + 1, WiFi.SSID(i).c_str(), WiFi.RSSI(i),
                  WiFi.channel(i), WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? "abierta" : "segura");
  }
  WiFi.scanDelete();
  delay(5000);
}
