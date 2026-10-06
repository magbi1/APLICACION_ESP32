// PlatformIO Blink — ESP32 Studio
#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  pinMode(2, OUTPUT);
}

void loop() {
  digitalWrite(2, !digitalRead(2));
  Serial.println("tick");
  delay(500);
}
