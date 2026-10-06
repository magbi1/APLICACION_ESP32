// FreeRTOS en ESP32 — ESP32 Studio
QueueHandle_t queue;

void producer(void *pv) {
  int value = 0;
  for (;;) {
    value++;
    xQueueSend(queue, &value, portMAX_DELAY);
    vTaskDelay(pdMS_TO_TICKS(500));
  }
}

void consumer(void *pv) {
  int value;
  for (;;) {
    if (xQueueReceive(queue, &value, portMAX_DELAY)) {
      Serial.printf("[núcleo %d] recibido %d\n", xPortGetCoreID(), value);
    }
  }
}

void setup() {
  Serial.begin(115200);
  queue = xQueueCreate(10, sizeof(int));
  xTaskCreatePinnedToCore(producer, "productor", 2048, NULL, 1, NULL, 0);
  xTaskCreatePinnedToCore(consumer, "consumidor", 4096, NULL, 1, NULL, 1);
}

void loop() {
  vTaskDelay(pdMS_TO_TICKS(1000));
}
