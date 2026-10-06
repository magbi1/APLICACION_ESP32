// OLED SSD1306 por I2C — ESP32 Studio
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("No se encontró la OLED");
    for (;;) delay(1000);
  }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
}

void loop() {
  static int n = 0;
  display.clearDisplay();
  display.setTextSize(2);
  display.setCursor(0, 0);
  display.println("ESP32");
  display.setTextSize(1);
  display.printf("Contador: %d\n", n);
  display.printf("Heap: %u B\n", ESP.getFreeHeap());
  display.drawRect(0, 48, 128, 14, SSD1306_WHITE);
  display.fillRect(2, 50, (n % 63) * 2, 10, SSD1306_WHITE);
  display.display();
  n++;
  delay(100);
}
