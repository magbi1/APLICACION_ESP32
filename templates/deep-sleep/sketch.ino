// Deep sleep — ESP32 Studio
#define SLEEP_SECONDS 5

RTC_DATA_ATTR int bootCount = 0;

void printWakeReason() {
  switch (esp_sleep_get_wakeup_cause()) {
    case ESP_SLEEP_WAKEUP_TIMER: Serial.println("Despertó por temporizador"); break;
    case ESP_SLEEP_WAKEUP_EXT0: Serial.println("Despertó por pin externo"); break;
    default: Serial.println("Arranque normal"); break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);
  bootCount++;
  Serial.printf("Arranque #%d\n", bootCount);
  printWakeReason();
  esp_sleep_enable_timer_wakeup(SLEEP_SECONDS * 1000000ULL);
  Serial.printf("Durmiendo %d s...\n", SLEEP_SECONDS);
  Serial.flush();
  esp_deep_sleep_start();
}

void loop() {}
