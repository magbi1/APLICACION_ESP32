// Blink — ESP32 Studio
// Hace parpadear un LED conectado a GPIO2 (LED integrado en la mayoría de DevKits).

const int LED_PIN = 2;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("ESP32 listo: Blink en GPIO2");
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  Serial.println("LED encendido");
  delay(500);
  digitalWrite(LED_PIN, LOW);
  Serial.println("LED apagado");
  delay(500);
}
