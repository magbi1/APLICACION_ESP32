// DHT22 — ESP32 Studio
// Librería: "DHT sensor library for ESPx" (se instala al crear el proyecto)
#include "DHTesp.h"

const int DHT_PIN = 15;
DHTesp dht;

void setup() {
  Serial.begin(115200);
  dht.setup(DHT_PIN, DHTesp::DHT22);
}

void loop() {
  TempAndHumidity data = dht.getTempAndHumidity();
  if (dht.getStatus() == 0) {
    Serial.printf("temp:%.1f,hum:%.1f\n", data.temperature, data.humidity);
  } else {
    Serial.printf("Error DHT: %s\n", dht.getStatusString());
  }
  delay(2000);
}
