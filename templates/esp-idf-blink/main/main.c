// ESP-IDF Blink — ESP32 Studio
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "esp_log.h"

#define LED_GPIO GPIO_NUM_2
static const char *TAG = "blink";

void app_main(void)
{
    gpio_reset_pin(LED_GPIO);
    gpio_set_direction(LED_GPIO, GPIO_MODE_OUTPUT);
    int level = 0;
    while (1) {
        level = !level;
        gpio_set_level(LED_GPIO, level);
        ESP_LOGI(TAG, "LED %s", level ? "ON" : "OFF");
        vTaskDelay(pdMS_TO_TICKS(500));
    }
}
