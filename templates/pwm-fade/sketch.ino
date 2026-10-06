// PWM con LEDC — ESP32 Studio (núcleo arduino-esp32 3.x)
const int LED_PIN = 2;
const int FREQ = 5000;
const int RESOLUTION = 8;  // 0-255

void setup() {
  Serial.begin(115200);
  ledcAttach(LED_PIN, FREQ, RESOLUTION);
}

void loop() {
  for (int duty = 0; duty <= 255; duty += 5) {
    ledcWrite(LED_PIN, duty);
    Serial.printf("duty:%d\n", duty);
    delay(20);
  }
  for (int duty = 255; duty >= 0; duty -= 5) {
    ledcWrite(LED_PIN, duty);
    Serial.printf("duty:%d\n", duty);
    delay(20);
  }
}
