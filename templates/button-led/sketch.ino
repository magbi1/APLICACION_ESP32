// Pulsador con interrupción — ESP32 Studio
const int BUTTON_PIN = 4;
const int LED_PIN = 2;

volatile bool pressed = false;
volatile unsigned long lastIsr = 0;

void IRAM_ATTR onButton() {
  unsigned long now = millis();
  if (now - lastIsr > 200) {  // antirrebote
    pressed = true;
    lastIsr = now;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(BUTTON_PIN), onButton, FALLING);
  Serial.println("Pulsa el botón en GPIO4");
}

void loop() {
  if (pressed) {
    pressed = false;
    bool state = !digitalRead(LED_PIN);
    digitalWrite(LED_PIN, state);
    Serial.printf("Botón -> LED %s\n", state ? "ON" : "OFF");
  }
}
