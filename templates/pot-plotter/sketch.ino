// Lectura analógica para el plotter — ESP32 Studio
// Usa un pin ADC1 (GPIO34) para que funcione también con Wi-Fi activo.
const int POT_PIN = 34;

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
}

void loop() {
  int raw = analogRead(POT_PIN);
  int mv = analogReadMilliVolts(POT_PIN);
  // Formato "etiqueta:valor" -> el plotter crea una serie por etiqueta
  Serial.printf("raw:%d,mV:%d\n", raw, mv);
  delay(50);
}
