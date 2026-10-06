// =====================================================================
//  Proyecto de prueba — ESP32 Studio
//  Verifica: compilación, carga, monitor serie, plotter y simulación.
//
//  Circuito (incluido en diagram.json para el simulador Wokwi):
//    GPIO2  -> LED rojo (parpadeo de "latido")
//    GPIO18 -> LED azul (brillo PWM controlado por el potenciómetro)
//    GPIO4  -> Pulsador a GND (cambia de modo)
//    GPIO34 -> Potenciómetro (ADC1, funciona aunque haya Wi-Fi)
//
//  Comandos por el monitor serie (115200 baudios, fin de línea LF o CR+LF):
//    ayuda | info | led on | led off | modo | plot on | plot off
// =====================================================================

const int PIN_LED_LATIDO = 2;
const int PIN_LED_PWM = 18;
const int PIN_BOTON = 4;
const int PIN_POT = 34;

const int PWM_FREQ = 5000;
const int PWM_BITS = 8;

enum Modo { MODO_POT, MODO_RESPIRAR, MODO_APAGADO, NUM_MODOS };
const char *NOMBRES_MODO[] = {"potenciometro", "respirar", "apagado"};

volatile bool botonPulsado = false;
volatile unsigned long ultimoIsr = 0;

Modo modo = MODO_POT;
bool latidoActivo = true;
bool plotActivo = true;
String comando;

void IRAM_ATTR alPulsar() {
  unsigned long ahora = millis();
  if (ahora - ultimoIsr > 200) {  // antirrebote
    botonPulsado = true;
    ultimoIsr = ahora;
  }
}

void imprimirInfo() {
  Serial.println(F("\n========== ESP32 Studio: proyecto de prueba =========="));
  Serial.printf("Chip:        %s rev %d, %d nucleo(s) @ %lu MHz\n", ESP.getChipModel(), ESP.getChipRevision(),
                ESP.getChipCores(), (unsigned long)ESP.getCpuFreqMHz());
  Serial.printf("Flash:       %lu KB\n", (unsigned long)(ESP.getFlashChipSize() / 1024));
  Serial.printf("Heap libre:  %lu bytes\n", (unsigned long)ESP.getFreeHeap());
  Serial.printf("SDK:         %s\n", ESP.getSdkVersion());
  uint64_t mac = ESP.getEfuseMac();
  Serial.printf("MAC:         %02X:%02X:%02X:%02X:%02X:%02X\n", (uint8_t)(mac), (uint8_t)(mac >> 8),
                (uint8_t)(mac >> 16), (uint8_t)(mac >> 24), (uint8_t)(mac >> 32), (uint8_t)(mac >> 40));
  Serial.printf("Modo actual: %s\n", NOMBRES_MODO[modo]);
  Serial.println(F("Escribe 'ayuda' para ver los comandos."));
  Serial.println(F("======================================================\n"));
}

void imprimirAyuda() {
  Serial.println(F("Comandos: ayuda | info | led on | led off | modo | plot on | plot off"));
}

void procesarComando(String c) {
  c.trim();
  c.toLowerCase();
  if (c.isEmpty()) return;
  if (c == "ayuda" || c == "help") imprimirAyuda();
  else if (c == "info") imprimirInfo();
  else if (c == "led on") { latidoActivo = true; Serial.println(F("> Latido activado")); }
  else if (c == "led off") { latidoActivo = false; digitalWrite(PIN_LED_LATIDO, LOW); Serial.println(F("> Latido desactivado")); }
  else if (c == "modo") { botonPulsado = true; }
  else if (c == "plot on") { plotActivo = true; Serial.println(F("> Plotter activado")); }
  else if (c == "plot off") { plotActivo = false; Serial.println(F("> Plotter desactivado")); }
  else Serial.printf("> Comando desconocido: '%s'. Escribe 'ayuda'.\n", c.c_str());
}

void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(PIN_LED_LATIDO, OUTPUT);
  pinMode(PIN_BOTON, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_BOTON), alPulsar, FALLING);
  ledcAttach(PIN_LED_PWM, PWM_FREQ, PWM_BITS);
  analogReadResolution(12);

  imprimirInfo();
}

void loop() {
  unsigned long ahora = millis();

  // 1) Latido: LED en GPIO2 parpadea sin bloquear (500 ms)
  static unsigned long ultimoLatido = 0;
  if (latidoActivo && ahora - ultimoLatido >= 500) {
    ultimoLatido = ahora;
    digitalWrite(PIN_LED_LATIDO, !digitalRead(PIN_LED_LATIDO));
  }

  // 2) Botón: cambia de modo
  if (botonPulsado) {
    botonPulsado = false;
    modo = (Modo)((modo + 1) % NUM_MODOS);
    Serial.printf("> Modo: %s\n", NOMBRES_MODO[modo]);
  }

  // 3) Potenciómetro + PWM cada 50 ms
  static unsigned long ultimaLectura = 0;
  if (ahora - ultimaLectura >= 50) {
    ultimaLectura = ahora;
    int crudo = analogRead(PIN_POT);
    int mv = analogReadMilliVolts(PIN_POT);
    int brillo = 0;
    switch (modo) {
      case MODO_POT: brillo = map(crudo, 0, 4095, 0, 255); break;
      case MODO_RESPIRAR: brillo = (int)((sin(ahora / 600.0) + 1.0) * 127.5); break;
      default: brillo = 0; break;
    }
    ledcWrite(PIN_LED_PWM, brillo);
    // Formato "etiqueta:valor" -> una serie por etiqueta en el plotter
    if (plotActivo) Serial.printf("pot:%d,mV:%d,brillo:%d\n", crudo, mv, brillo);
  }

  // 4) Comandos por el monitor serie
  while (Serial.available()) {
    char ch = (char)Serial.read();
    if (ch == '\n' || ch == '\r') {
      procesarComando(comando);
      comando = "";
    } else if (comando.length() < 64) {
      comando += ch;
    }
  }
}
